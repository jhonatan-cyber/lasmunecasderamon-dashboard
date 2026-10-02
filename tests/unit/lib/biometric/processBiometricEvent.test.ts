// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';

const db = vi.hoisted(() => ({ queryMock: vi.fn() }));
const sse = vi.hoisted(() => ({ enviar: vi.fn() }));
const avisos = vi.hoisted(() => ({
  resultado: vi.fn(() => Promise.resolve()),
  enrolamiento: vi.fn(() => Promise.resolve())
}));
const horas = vi.hoisted(() => ({ fn: vi.fn() }));

vi.mock('@/lib/database/db', () => ({
  query: db.queryMock,
  generateUUID: () => 'uuid-test',
  withTransaction: vi.fn()
}));

vi.mock('@/lib/repositories/attendance/AttendanceQueries', () => ({
  getAttendanceConfigHours: horas.fn
}));

// El audio real (Talk/FFmpeg) se prueba aparte; acá solo importa QUÉ resultado
// dispara QUÉ aviso, sin abrir sesión contra ningún equipo.
vi.mock('@/lib/biometric/avisosAudio', () => ({
  avisarResultadoEnEquipo: avisos.resultado,
  avisarEnrolamientoEnEquipo: avisos.enrolamiento
}));

vi.mock('@/lib/business/timezoneService', () => ({
  getNowInBusinessTimezone: () => '2026-09-29 22:15:00'
}));

vi.mock('@/lib/api/sseService', () => ({ sendNotificationToAll: sse.enviar }));

vi.mock('@/lib/utils/logger', () => {
  const mocks = { warn: vi.fn(), error: vi.fn(), info: vi.fn(), debug: vi.fn() };
  return { logger: mocks, default: mocks };
});

import {
  atribuirAsistenciaIdentificada,
  procesarEventoBiometrico
} from '@/lib/biometric/processBiometricEvent';
import type { BiometricEvent } from '@/lib/biometric/types';

const device = { id: 'dev-1', serial: 'SERIE1' };

const evento = (overrides: Partial<BiometricEvent> = {}): BiometricEvent => ({
  codigo: '1001',
  fechaDispositivo: '2026-09-29 21:30:00',
  metodo: 'huella',
  raw: '1001\t2026-09-29 21:30:00\t1\t0',
  ...overrides
});

let usuarios: any[];
let existentes: any[];

function instalarBase() {
  db.queryMock.mockImplementation(async (sql: string) => {
    if (sql.includes('FROM usuarios')) return usuarios;
    if (sql.includes('FROM asistencias')) return existentes;
    return [];
  });
}

function sqls(): string[] {
  return db.queryMock.mock.calls.map(call => String(call[0]));
}

function resultadosAuditados(): string[] {
  return db.queryMock.mock.calls
    .filter(call => String(call[0]).includes('biometric_events'))
    .map(call => String(call[1]?.[7]));
}

beforeEach(() => {
  db.queryMock.mockReset();
  sse.enviar.mockReset();
  avisos.resultado.mockClear();
  avisos.enrolamiento.mockClear();
  horas.fn.mockReset().mockResolvedValue({ startHour: 21, endHour: 23 });
  usuarios = [{ id_usuario: 'u-1', nombre: 'Ana', apellido: 'Perez', estado: 1 }];
  existentes = [];
  instalarBase();
});

describe('resolucion del codigo del equipo', () => {
  it('registra la asistencia y difunde el evento al kiosko', async () => {
    const resultado = await procesarEventoBiometrico(evento(), device);

    expect(resultado).toEqual({
      resultado: 'registrado',
      usuario: { id: 'u-1', nombre: 'Ana', apellido: 'Perez' }
    });
    expect(sqls().some(sql => sql.includes('INSERT INTO asistencias'))).toBe(true);
    expect(sse.enviar).toHaveBeenCalledWith('attendance_registered', {
      user: { id: 'u-1', nombre: 'Ana', apellido: 'Perez' },
      origen: 'biometrico'
    });
    expect(resultadosAuditados()).toEqual(['registrado']);
    // El aviso sonoro sale del sistema con el audio del resultado.
    expect(avisos.resultado).toHaveBeenCalledWith('dev-1', 'registrado');
  });

  it('prueba el codigo sin ceros a la izquierda antes de rendirse', async () => {
    db.queryMock.mockImplementation(async (sql: string) => {
      if (sql.includes('FROM usuarios')) {
        // Primera consulta ('00012') no coincide; la segunda ('12') sí.
        return String(db.queryMock.mock.calls.at(-1)?.[1]?.[0]) === '12' ? usuarios : [];
      }
      if (sql.includes('FROM asistencias')) return [];
      return [];
    });

    const resultado = await procesarEventoBiometrico(evento({ codigo: '00012' }), device);
    expect(resultado.resultado).toBe('registrado');
  });

  it('marca a un codigo sin usuario y no escribe asistencia', async () => {
    usuarios = [];
    const resultado = await procesarEventoBiometrico(evento({ codigo: '9999' }), device);

    expect(resultado).toEqual({ resultado: 'sin_usuario' });
    expect(sqls().some(sql => sql.includes('INSERT INTO asistencias'))).toBe(false);
    expect(resultadosAuditados()).toEqual(['sin_usuario']);
    expect(avisos.resultado).toHaveBeenCalledWith('dev-1', 'sin_usuario');
  });

  it('no acredita a un usuario inactivo ni le manda audio', async () => {
    usuarios = [{ id_usuario: 'u-1', nombre: 'Ana', apellido: 'Perez', estado: 0 }];
    const resultado = await procesarEventoBiometrico(evento(), device);

    expect(resultado.resultado).toBe('usuario_inactivo');
    expect(sqls().some(sql => sql.includes('INSERT INTO asistencias'))).toBe(false);
    expect(avisos.resultado).not.toHaveBeenCalled();
  });
});

describe('mismas reglas que el resto de las vias', () => {
  it('un reenvio del equipo no duplica la asistencia del dia', async () => {
    existentes = [{ id_asistencia: 'asis-1' }];
    const resultado = await procesarEventoBiometrico(evento(), device);

    expect(resultado.resultado).toBe('duplicado');
    expect(sqls().some(sql => sql.includes('INSERT INTO asistencias'))).toBe(false);
    expect(resultadosAuditados()).toEqual(['duplicado']);
    // Avisa igual a las pantallas: el toast "ya tiene asistencia registrada".
    expect(sse.enviar).toHaveBeenCalledWith('attendance_duplicate', {
      user: { id: 'u-1', nombre: 'Ana', apellido: 'Perez' },
      origen: 'biometrico'
    });
    expect(sse.enviar).not.toHaveBeenCalledWith('attendance_registered', expect.anything());
    expect(avisos.resultado).toHaveBeenCalledWith('dev-1', 'duplicado');
  });

  it('fuera de la ventana avisa con el audio de hora finalizada', async () => {
    // El reloj del sistema (mockeado a las 22:15) queda fuera de 8-9.
    horas.fn.mockResolvedValue({ startHour: 8, endHour: 9 });

    const resultado = await procesarEventoBiometrico(evento(), device);

    expect(resultado.resultado).toBe('fuera_ventana');
    expect(sqls().some(sql => sql.includes('INSERT INTO asistencias'))).toBe(false);
    expect(avisos.resultado).toHaveBeenCalledWith('dev-1', 'fuera_ventana');
  });

  it('fuera de la ventana solo registra ubicacion (con la hora del sistema)', async () => {
    // El timezone del negocio está mockeado a las 22:15; la ventana es 21-23.
    // La hora del lector (aquí 15:00, fuera de ventana) NO decide: es solo
    // auditoría. El sistema decide con su propio reloj.
    const resultado = await procesarEventoBiometrico(
      evento({ fechaDispositivo: '2026-09-29 15:00:00' }),
      device
    );

    expect(resultado.resultado).toBe('registrado');
    expect(sqls().some(sql => sql.includes('INSERT INTO asistencias'))).toBe(true);
    expect(resultadosAuditados()).toEqual(['registrado']);
  });

  it('la hora de la asistencia es la del SISTEMA, no la del lector', async () => {
    // El lector reporta 18:00 de AYER (desfazado u otra zona): no pisa ni el
    // día ni la hora. El reloj del sistema (22:15 del mock) manda.
    await procesarEventoBiometrico(evento({ fechaDispositivo: '2026-09-28 18:00:00' }), device);

    const insert = db.queryMock.mock.calls.find(call =>
      String(call[0]).includes('INSERT INTO asistencias')
    );
    expect(insert?.[1]).toEqual([
      'uuid-test',
      'u-1',
      '2026-09-29',
      '22:15:00',
      1,
      'biometrico',
      null
    ]);
  });

  it('sin fecha del equipo también usa el reloj del sistema', async () => {
    await procesarEventoBiometrico(evento({ fechaDispositivo: null }), device);

    const insert = db.queryMock.mock.calls.find(call =>
      String(call[0]).includes('INSERT INTO asistencias')
    );
    expect(insert?.[1]).toEqual([
      'uuid-test',
      'u-1',
      '2026-09-29',
      '22:15:00',
      1,
      'biometrico',
      null
    ]);
  });

  it('enlaza la asistencia con el record del lector (la foto de la marcación)', async () => {
    await procesarEventoBiometrico(evento({ recordId: 'record-9' }), device);

    const insert = db.queryMock.mock.calls.find(call =>
      String(call[0]).includes('INSERT INTO asistencias')
    );
    // Último valor: biometric_record_id. Las vías manuales/QR quedan en null.
    expect(insert?.[1]).toEqual([
      'uuid-test',
      'u-1',
      '2026-09-29',
      '22:15:00',
      1,
      'biometrico',
      'record-9'
    ]);
  });
});

describe('auditoria', () => {
  it('la auditoria jamas tira el registro aunque falle', async () => {
    db.queryMock.mockImplementation(async (sql: string) => {
      if (sql.includes('biometric_events')) throw new Error('db caida');
      if (sql.includes('FROM usuarios')) return usuarios;
      if (sql.includes('FROM asistencias')) return [];
      return [];
    });

    const resultado = await procesarEventoBiometrico(evento(), device);
    expect(resultado.resultado).toBe('registrado');
  });
});

describe('atribución por identificación facial', () => {
  it('crea la asistencia del día con el record cuando todavía no marcó', async () => {
    const resultado = await atribuirAsistenciaIdentificada('u-1', 'record-7', 'dev-1', new Date());

    expect(resultado).toBe('registrado');
    const insert = db.queryMock.mock.calls.find(call =>
      String(call[0]).includes('INSERT INTO asistencias')
    );
    expect(insert?.[1]).toEqual([
      'uuid-test',
      'u-1',
      '2026-09-29',
      '22:15:00',
      1,
      'biometrico',
      'record-7'
    ]);
    expect(sse.enviar).toHaveBeenCalledWith('attendance_registered', {
      user: { id: 'u-1', nombre: 'Ana', apellido: 'Perez' },
      origen: 'biometrico'
    });
    expect(avisos.resultado).toHaveBeenCalledWith('dev-1', 'registrado');
  });

  it('si ya marcó hoy no duplica ni vuelve a avisar', async () => {
    existentes = [{ id_asistencia: 'asis-1' }];

    const resultado = await atribuirAsistenciaIdentificada('u-1', 'record-7', 'dev-1', new Date());

    expect(resultado).toBe('duplicado');
    expect(sqls().some(sql => sql.includes('INSERT INTO asistencias'))).toBe(false);
    expect(sse.enviar).not.toHaveBeenCalled();
    expect(avisos.resultado).not.toHaveBeenCalled();
  });

  it('fuera de la ventana no acredita (el evento por código ya avisó)', async () => {
    horas.fn.mockResolvedValue({ startHour: 8, endHour: 9 });

    const resultado = await atribuirAsistenciaIdentificada('u-1', 'record-7', 'dev-1', new Date());

    expect(resultado).toBe('fuera_ventana');
    expect(sqls().some(sql => sql.includes('INSERT INTO asistencias'))).toBe(false);
    expect(avisos.resultado).not.toHaveBeenCalled();
  });

  it('un usuario inactivo no se acredita por la cara', async () => {
    usuarios = [{ id_usuario: 'u-1', nombre: 'Ana', apellido: 'Perez', estado: 0 }];

    const resultado = await atribuirAsistenciaIdentificada('u-1', 'record-7', 'dev-1', new Date());

    expect(resultado).toBe('ignorado');
    expect(sqls().some(sql => sql.includes('INSERT INTO asistencias'))).toBe(false);
  });

  it('un record histórico del barrido solo audita: no acredita', async () => {
    const viejo = new Date(Date.now() - 6 * 3_600_000);

    const resultado = await atribuirAsistenciaIdentificada('u-1', 'record-7', 'dev-1', viejo);

    expect(resultado).toBe('fuera_de_alcance');
    expect(db.queryMock).not.toHaveBeenCalled();
  });
});
