// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Tests del poller de registros: dedupe por RecNo y por contenido, reuso de
 * `procesarEventoBiometrico` (las reglas de asistencia son las mismas que el
 * push) y tolerancia de fallas del ciclo.
 */

const db = vi.hoisted(() => ({ queryMock: vi.fn() }));
const cliente = vi.hoisted(() => ({
  credencialesDeFila: vi.fn(),
  leerRegistrosAcceso: vi.fn()
}));
const procesar = vi.hoisted(() => ({ fn: vi.fn() }));

vi.mock('@/lib/database/db', () => ({
  query: db.queryMock,
  generateUUID: () => 'uuid-test',
  withTransaction: vi.fn()
}));

vi.mock('@/lib/business/timezoneService', () => ({
  getNowInBusinessTimezone: (input?: Date | string | number) =>
    input instanceof Date ? '2026-09-29 21:30:00' : '2026-09-29 22:00:00'
}));

vi.mock('@/lib/repositories/attendance/AttendanceQueries', () => ({
  getAttendanceConfigHours: async () => ({ startHour: 21, endHour: 23 })
}));

vi.mock('@/lib/api/sseService', () => ({ sendNotificationToAll: vi.fn() }));

vi.mock('@/lib/biometric/processBiometricEvent', () => ({
  procesarEventoBiometrico: procesar.fn
}));

// El mantenimiento de reloj no debe tocar el SDK real en los tests.
vi.mock('@/lib/biometric/clockSync', () => ({
  quizasSincronizarReloj: vi.fn().mockResolvedValue(false)
}));

// La cola de fotos descarga por NetSDK: jamás en los tests (DLL + red reales).
const fotos = vi.hoisted(() => ({
  descargarFoto: vi.fn(),
  encolarFotoDeRecord: vi.fn(),
  recuperarFotosPendientes: vi.fn()
}));
vi.mock('@/lib/biometric/recordPhotos', () => fotos);

// Ídem para el 1:N del servidor (extrae vectores con el motor del equipo).
const ident = vi.hoisted(() => ({
  encolarIdentificacionDeRecord: vi.fn(),
  recuperarIdentificacionesPendientes: vi.fn()
}));
vi.mock('@/lib/biometric/identificacionFacial', () => ident);

vi.mock('@/lib/biometric/deviceClient', async importOriginal => {
  const actual = await importOriginal<typeof import('@/lib/biometric/deviceClient')>();
  return { ...actual, ...cliente };
});

import {
  arrancarPoller,
  detenerPoller,
  estaCorriendo,
  pollEquipo,
  pollTodos
} from '@/lib/biometric/recordPoller';

const equipo = {
  id: 'dev-1',
  serial: 'SERIAL1',
  ip: '192.168.1.50',
  usuario_equipo: 'admin',
  clave_cifrada: 'a.b.c',
  recoger_registros: 1,
  nombre: 'Puerta',
  marca: 'dahua'
};

const cred = { ip: '192.168.1.50', usuario: 'admin', clave: 'secreta' };

const record = (
  overrides: Partial<{
    recNo: number;
    createTime: number;
    userId: string;
    tipo: string | null;
    metodo: number;
    status: number;
    url: string | null;
  }> = {}
) => ({
  recNo: 101,
  createTime: 1790715000, // ~2026-09-29 en epoch
  userId: '1001',
  tipo: 'Entry',
  status: 1,
  metodo: 15,
  url: null,
  ...overrides
});

function instalarBasico() {
  db.queryMock.mockImplementation(async (sql: string) => {
    if (sql.includes('FROM biometric_devices') && sql.includes('recoger_registros = 1'))
      return [equipo];
    if (sql.includes('FROM biometric_devices')) return [equipo];
    if (sql.includes('FROM biometric_device_records')) return []; // nada procesado aún
    return [];
  });
  cliente.credencialesDeFila.mockReturnValue(cred);
}

beforeEach(() => {
  db.queryMock.mockReset();
  cliente.leerRegistrosAcceso.mockReset();
  cliente.credencialesDeFila.mockReset();
  procesar.fn.mockReset();
  procesar.fn.mockResolvedValue({ resultado: 'registrado', usuario: { id: 'u-1' } });
  fotos.encolarFotoDeRecord.mockClear();
  fotos.recuperarFotosPendientes.mockReset().mockResolvedValue(0);
  ident.encolarIdentificacionDeRecord.mockClear();
  ident.recuperarIdentificacionesPendientes.mockReset().mockResolvedValue(0);
});

describe('pollEquipo', () => {
  it('una SALIDA (Type=Exit) no acredita asistencia ni dispara ningún sonido', async () => {
    instalarBasico();
    cliente.leerRegistrosAcceso.mockResolvedValue([record({ tipo: 'Exit' })]);

    const r = await pollEquipo('dev-1');

    expect(r.salidas).toBe(1);
    expect(r.nuevos).toBe(1); // se bajó y marcó como visto, pero…
    expect(r.registrados).toBe(0);
    expect(procesar.fn).not.toHaveBeenCalled(); // …no procesa asistencia
    expect(
      db.queryMock.mock.calls.some(call => String(call[0]).includes('INSERT INTO asistencias'))
    ).toBe(false);
  });

  it('un record sin tipo se procesa como entrada (el ASI a veces no manda Type)', async () => {
    instalarBasico();
    cliente.leerRegistrosAcceso.mockResolvedValue([record({ tipo: null })]);

    const r = await pollEquipo('dev-1');

    expect(r.registrados).toBe(1);
    expect(r.salidas).toBe(0);
    expect(procesar.fn).toHaveBeenCalledTimes(1);
  });

  it('entrada y salida juntas: solo la entrada procesa, la salida cuenta aparte', async () => {
    instalarBasico();
    cliente.leerRegistrosAcceso.mockResolvedValue([record(), record({ recNo: 102, tipo: 'Exit' })]);

    const r = await pollEquipo('dev-1');

    expect(r.nuevos).toBe(2);
    expect(r.registrados).toBe(1);
    expect(r.salidas).toBe(1);
    expect(procesar.fn).toHaveBeenCalledTimes(1);
  });

  it('convierte records nuevos en asistencia vía procesarEventoBiometrico', async () => {
    instalarBasico();
    cliente.leerRegistrosAcceso.mockResolvedValue([record()]);

    const r = await pollEquipo('dev-1');

    expect(r.leidos).toBe(1);
    expect(r.nuevos).toBe(1);
    expect(r.registrados).toBe(1);
    expect(procesar.fn).toHaveBeenCalledTimes(1);
    const [evento, device] = procesar.fn.mock.calls[0];
    expect(evento.codigo).toBe('1001');
    expect(evento.metodo).toBe('cara'); // Method 15 = cara
    expect(device).toEqual({ id: 'dev-1', serial: 'SERIAL1' });

    // El record quedó marcado como procesado.
    const inserts = db.queryMock.mock.calls.filter(call =>
      String(call[0]).includes('INSERT INTO biometric_device_records')
    );
    expect(inserts.length).toBe(1);
  });

  it('ignora los registros anteriores a historico_limpiado_en (no resucita el histórico)', async () => {
    instalarBasico();
    db.queryMock.mockImplementation(async (sql: string) => {
      if (sql.includes('FROM biometric_devices'))
        return [{ ...equipo, historico_limpiado_en: new Date('2026-09-30T00:00:00Z') }];
      if (sql.includes('FROM biometric_device_records')) return [];
      return [];
    });
    cliente.leerRegistrosAcceso.mockResolvedValue([
      record({ recNo: 90, userId: '1001', createTime: 1790715000 }), // anterior al corte
      record({ recNo: 101, userId: '1002', createTime: 1791000000 }) // posterior al corte
    ]);

    const r = await pollEquipo('dev-1');

    expect(r.leidos).toBe(2);
    expect(r.ignorados).toBe(1);
    expect(r.nuevos).toBe(1);
    expect(procesar.fn).toHaveBeenCalledTimes(1);
    expect(procesar.fn.mock.calls[0][0].codigo).toBe('1002');
    const inserts = db.queryMock.mock.calls.filter(call =>
      String(call[0]).includes('INSERT INTO biometric_device_records')
    );
    expect(inserts.length).toBe(1);
  });

  it('guarda la URL de la foto, la manda a la cola y la pasa al procesador', async () => {
    instalarBasico();
    cliente.leerRegistrosAcceso.mockResolvedValue([
      record({ url: '/SnapShotFilePath/2026-10-02/09/00/1001_99_100.jpg' })
    ]);

    const r = await pollEquipo('dev-1');

    expect(r.nuevos).toBe(1);
    const insert = db.queryMock.mock.calls.find(call =>
      String(call[0]).includes('INSERT INTO biometric_device_records')
    );
    expect(insert?.[1]).toEqual([
      'uuid-test',
      'dev-1',
      'SERIAL1',
      101,
      '1001',
      '2026-09-29 21:30:00',
      'cara',
      1,
      '/SnapShotFilePath/2026-10-02/09/00/1001_99_100.jpg'
    ]);
    // La descarga va en segundo plano, nunca dentro del ciclo.
    expect(fotos.encolarFotoDeRecord).toHaveBeenCalledTimes(1);
    expect(fotos.encolarFotoDeRecord).toHaveBeenCalledWith({
      recordId: 'uuid-test',
      dispositivoId: 'dev-1',
      ruta: '/SnapShotFilePath/2026-10-02/09/00/1001_99_100.jpg'
    });
    // Y con ese mismo id queda enlazada la asistencia (la foto de la marcación).
    expect(procesar.fn.mock.calls[0][0].recordId).toBe('uuid-test');
    // Cada ciclo reanuda las fotos que quedaron a medias.
    expect(fotos.recuperarFotosPendientes).toHaveBeenCalledTimes(1);
    // Y también las identificaciones 1:N pendientes.
    expect(ident.recuperarIdentificacionesPendientes).toHaveBeenCalledTimes(1);
  });

  it('un record sin foto no encola descarga (foto_url queda null)', async () => {
    instalarBasico();
    cliente.leerRegistrosAcceso.mockResolvedValue([record()]);

    await pollEquipo('dev-1');

    const insert = db.queryMock.mock.calls.find(call =>
      String(call[0]).includes('INSERT INTO biometric_device_records')
    );
    expect(insert?.[1]).toEqual([
      'uuid-test',
      'dev-1',
      'SERIAL1',
      101,
      '1001',
      '2026-09-29 21:30:00',
      'cara',
      1,
      null
    ]);
    expect(fotos.encolarFotoDeRecord).not.toHaveBeenCalled();
  });

  it('baja desde el RecNo máximo ya guardado (si no, solo llegan los más viejos)', async () => {
    db.queryMock.mockImplementation(async (sql: string) => {
      if (sql.includes('MAX(rec_no)')) return [{ max: 125 }];
      if (sql.includes('FROM biometric_devices') && sql.includes('recoger_registros = 1'))
        return [equipo];
      if (sql.includes('FROM biometric_devices')) return [equipo];
      return [];
    });
    cliente.credencialesDeFila.mockReturnValue(cred);
    cliente.leerRegistrosAcceso.mockResolvedValue([]);

    await pollEquipo('dev-1');

    expect(cliente.leerRegistrosAcceso).toHaveBeenCalledWith(cred, { count: 200, desde: 125 });
  });

  it('con la tabla vacía empieza desde el principio', async () => {
    instalarBasico();
    cliente.leerRegistrosAcceso.mockResolvedValue([]);

    await pollEquipo('dev-1');

    expect(cliente.leerRegistrosAcceso).toHaveBeenCalledWith(cred, { count: 200, desde: 0 });
  });

  it('salta records ya procesados (mismo RecNo)', async () => {
    instalarBasico();
    cliente.leerRegistrosAcceso.mockResolvedValue([record({ recNo: 7 })]);
    db.queryMock.mockImplementation(async (sql: string) => {
      if (sql.includes('FROM biometric_devices') && sql.includes('recoger_registros = 1'))
        return [equipo];
      if (sql.includes('FROM biometric_devices')) return [equipo];
      if (sql.includes('FROM biometric_device_records')) return [{ id: 'p-1' }]; // ya está
      return [];
    });

    const r = await pollEquipo('dev-1');

    expect(r.nuevos).toBe(0);
    expect(procesar.fn).not.toHaveBeenCalled();
  });

  it('deduplica por contenido si el equipo re-enumeró los RecNo', async () => {
    instalarBasico();
    cliente.leerRegistrosAcceso.mockResolvedValue([record({ recNo: 999 })]);
    db.queryMock.mockImplementation(async (sql: string) => {
      if (sql.includes('FROM biometric_devices') && sql.includes('recoger_registros = 1'))
        return [equipo];
      if (sql.includes('FROM biometric_devices')) return [equipo];
      if (sql.includes('rec_no = ?')) return []; // RecNo nuevo…
      if (sql.includes('codigo_persona = ?')) return [{ id: 'p-2' }]; // …pero contenido ya visto
      return [];
    });

    const r = await pollEquipo('dev-1');

    expect(r.nuevos).toBe(0);
    expect(procesar.fn).not.toHaveBeenCalled();
  });

  it('la carrera de dos ticks no duplica (unique violation al marcar)', async () => {
    instalarBasico();
    cliente.leerRegistrosAcceso.mockResolvedValue([record()]);
    // El primer INSERT (marca de agua) explota con 23505.
    let inserts = 0;
    db.queryMock.mockImplementation(async (sql: string) => {
      if (sql.includes('FROM biometric_devices') && sql.includes('recoger_registros = 1'))
        return [equipo];
      if (sql.includes('FROM biometric_devices')) return [equipo];
      if (sql.includes('FROM biometric_device_records')) return [];
      if (sql.includes('INSERT INTO biometric_device_records')) {
        inserts += 1;
        if (inserts === 1) {
          const e = new Error('duplicate key') as any;
          e.code = '23505';
          throw e;
        }
        return [];
      }
      return [];
    });

    const r = await pollEquipo('dev-1');

    expect(r.nuevos).toBe(0);
    expect(procesar.fn).not.toHaveBeenCalled();
  });

  it('Status=0 con persona identificada sí genera asistencia (ASI3213A-W)', async () => {
    instalarBasico();
    // El equipo real manda Status=0 incluso cuando reconoció a la persona.
    cliente.leerRegistrosAcceso.mockResolvedValue([record({ status: 0 })]);

    const r = await pollEquipo('dev-1');

    expect(r.nuevos).toBe(1);
    expect(r.registrados).toBe(1);
    expect(procesar.fn).toHaveBeenCalledTimes(1);
  });

  it('sin UserID no inventa asistencia: va a la auditoría como sin_usuario', async () => {
    instalarBasico();
    cliente.leerRegistrosAcceso.mockResolvedValue([record({ userId: '' })]);
    procesar.fn.mockResolvedValue({ resultado: 'sin_usuario' });

    const r = await pollEquipo('dev-1');

    expect(r.nuevos).toBe(1);
    expect(r.registrados).toBe(0);
    expect(r.sinUsuario).toBe(1);
    // El código llega vacío: es el propio procesador el que lo deja sin usuario.
    expect(procesar.fn.mock.calls[0][0].codigo).toBe('');
  });

  it('mapea Method del CGI al método del dominio', async () => {
    instalarBasico();
    cliente.leerRegistrosAcceso.mockResolvedValue([record({ metodo: 6 })]);

    await pollEquipo('dev-1');

    expect(procesar.fn.mock.calls[0][0].metodo).toBe('huella');
  });

  it('sin credenciales el equipo falla con mensaje claro', async () => {
    instalarBasico();
    cliente.credencialesDeFila.mockReturnValue(null);

    await expect(pollEquipo('dev-1')).rejects.toThrow('IP/credenciales');
  });
});

describe('pollTodos', () => {
  it('un equipo caído no tumba a los demás', async () => {
    const equipos = [equipo, { ...equipo, id: 'dev-2', serial: 'SERIAL2' }];
    db.queryMock.mockImplementation(async (sql: string, params: any[]) => {
      if (sql.includes('recoger_registros = 1')) return equipos;
      if (sql.includes('FROM biometric_devices')) {
        return [equipos.find(e => e.id === params?.[0]) ?? equipo];
      }
      if (sql.includes('FROM biometric_device_records')) return [];
      return [];
    });
    cliente.credencialesDeFila.mockReturnValue(cred);
    cliente.leerRegistrosAcceso
      .mockRejectedValueOnce(new Error('timeout')) // dev-1 caído
      .mockResolvedValueOnce([record()]); // dev-2 OK

    const resumenes = await pollTodos();

    expect(resumenes.length).toBe(1);
    expect(resumenes[0].equipoId).toBe('dev-2');
    expect(resumenes[0].registrados).toBe(1);
  });
});

describe('ciclo de fondo', () => {
  it('arrancar es idempotente y detener apaga', () => {
    arrancarPoller();
    expect(estaCorriendo()).toBe(true);
    arrancarPoller(); // segunda llamada no duplica
    detenerPoller();
    expect(estaCorriendo()).toBe(false);
  });
});
