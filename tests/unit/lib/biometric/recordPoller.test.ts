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
    metodo: number;
    status: number;
  }> = {}
) => ({
  recNo: 101,
  createTime: 1790715000, // ~2026-09-29 en epoch
  userId: '1001',
  tipo: 'Entry',
  status: 1,
  metodo: 15,
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
});

describe('pollEquipo', () => {
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

  it('verificación fallida (status≠1) no genera asistencia', async () => {
    instalarBasico();
    cliente.leerRegistrosAcceso.mockResolvedValue([record({ status: 0 })]);

    const r = await pollEquipo('dev-1');

    expect(r.nuevos).toBe(1);
    expect(r.errores).toBe(1);
    expect(procesar.fn).not.toHaveBeenCalled();
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
