// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';

const db = vi.hoisted(() => ({ queryMock: vi.fn() }));
const sse = vi.hoisted(() => ({ enviar: vi.fn() }));

vi.mock('@/lib/database/db', () => ({
  query: db.queryMock,
  generateUUID: () => 'uuid-test',
  withTransaction: vi.fn()
}));

vi.mock('@/lib/repositories/attendance/AttendanceQueries', () => ({
  getAttendanceConfigHours: async () => ({ startHour: 21, endHour: 23 })
}));

vi.mock('@/lib/business/timezoneService', () => ({
  getNowInBusinessTimezone: () => '2026-09-29 22:15:00'
}));

vi.mock('@/lib/api/sseService', () => ({ sendNotificationToAll: sse.enviar }));

vi.mock('@/lib/utils/logger', () => {
  const mocks = { warn: vi.fn(), error: vi.fn(), info: vi.fn(), debug: vi.fn() };
  return { logger: mocks, default: mocks };
});

import { procesarEventoBiometrico } from '@/lib/biometric/processBiometricEvent';
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
      user: { id: 'u-1', nombre: 'Ana', apellido: 'Perez' }
    });
    expect(resultadosAuditados()).toEqual(['registrado']);
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
  });

  it('no acredita a un usuario inactivo', async () => {
    usuarios = [{ id_usuario: 'u-1', nombre: 'Ana', apellido: 'Perez', estado: 0 }];
    const resultado = await procesarEventoBiometrico(evento(), device);

    expect(resultado.resultado).toBe('usuario_inactivo');
    expect(sqls().some(sql => sql.includes('INSERT INTO asistencias'))).toBe(false);
  });
});

describe('mismas reglas que el resto de las vias', () => {
  it('un reenvio del equipo no duplica la asistencia del dia', async () => {
    existentes = [{ id_asistencia: 'asis-1' }];
    const resultado = await procesarEventoBiometrico(evento(), device);

    expect(resultado.resultado).toBe('duplicado');
    expect(sqls().some(sql => sql.includes('INSERT INTO asistencias'))).toBe(false);
    expect(resultadosAuditados()).toEqual(['duplicado']);
    expect(sse.enviar).not.toHaveBeenCalled();
  });

  it('fuera de la ventana solo registra ubicacion', async () => {
    const resultado = await procesarEventoBiometrico(
      evento({ fechaDispositivo: '2026-09-29 15:00:00' }),
      device
    );

    expect(resultado.resultado).toBe('fuera_ventana');
    expect(sqls().some(sql => sql.includes('INSERT INTO asistencias'))).toBe(false);
    expect(resultadosAuditados()).toEqual(['fuera_ventana']);
    expect(sse.enviar).not.toHaveBeenCalled();
  });

  it('usa la hora del equipo cuando viene en el evento', async () => {
    await procesarEventoBiometrico(evento({ fechaDispositivo: '2026-09-29 21:45:12' }), device);

    const insert = db.queryMock.mock.calls.find(call =>
      String(call[0]).includes('INSERT INTO asistencias')
    );
    expect(insert?.[1]).toEqual(['uuid-test', 'u-1', '2026-09-29', '21:45:12', 1, 'biometrico']);
  });

  it('cae en la hora actual si el equipo no manda fecha', async () => {
    await procesarEventoBiometrico(evento({ fechaDispositivo: null }), device);

    const insert = db.queryMock.mock.calls.find(call =>
      String(call[0]).includes('INSERT INTO asistencias')
    );
    expect(insert?.[1]).toEqual(['uuid-test', 'u-1', '2026-09-29', '22:15:00', 1, 'biometrico']);
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
