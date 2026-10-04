// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';

// El borrado local no requiere acceso al lector.
const db = vi.hoisted(() => ({ queryMock: vi.fn() }));
const enrollment = vi.hoisted(() => ({ quitarDelEquipo: vi.fn() }));

vi.mock('@/lib/database/db', () => ({
  query: db.queryMock,
  generateUUID: () => 'uuid-test',
  withTransaction: vi.fn()
}));

vi.mock('@/lib/utils/logger', () => {
  const mocks = { warn: vi.fn(), error: vi.fn(), info: vi.fn(), debug: vi.fn() };
  return { logger: mocks, default: mocks };
});

vi.mock('@/lib/business/timezoneService', () => ({
  getNowInBusinessTimezone: () => '2026-09-30 12:00:00'
}));

vi.mock('@/modules/asistencia/biometrico/enrollmentService', () => enrollment);

import { UserService } from '@/lib/services/UserService';

const personaEnrolada = {
  id_usuario: 'u-1',
  run: '11111111-1',
  nombre: 'Ana',
  apellido: 'Perez',
  rol_id: 'r-1',
  estado: 1,
  biometrico_codigo: '1001',
  biometrico_huella: 1,
  biometrico_facial: 1
};

/** Usuario sin nada biométrico: el borrado no debe hacer llamadas al lector. */
const personaSinBiometrico = {
  ...personaEnrolada,
  id_usuario: 'u-2',
  biometrico_codigo: null,
  biometrico_huella: 0,
  biometrico_facial: 0
};

function sqls(): string[] {
  return db.queryMock.mock.calls.map(call => String(call[0]));
}

/** Llamadas a quitarDelEquipo: (dispositivoId, {usuarioId, nombre, codigo}). */
function llamadasAlLector(): Array<
  [string, { usuarioId: string; nombre: string; codigo: string }]
> {
  return enrollment.quitarDelEquipo.mock.calls as Array<
    [string, { usuarioId: string; nombre: string; codigo: string }]
  >;
}

beforeEach(() => {
  db.queryMock.mockReset();
  db.queryMock.mockImplementation(async (sql: string) => {
    if (sql.includes('FROM usuarios')) return [];
    if (sql.includes('FROM biometric_plantillas')) return [];
    return [];
  });
  enrollment.quitarDelEquipo.mockReset();
  enrollment.quitarDelEquipo.mockResolvedValue(undefined);
});

describe('UserService.delete con enrolamiento biométrico', () => {
  it('borra las plantillas locales sin modificar lectores', async () => {
    db.queryMock.mockImplementation(async (sql: string) => {
      if (sql.includes('FROM usuarios')) return [personaEnrolada];
      if (sql.includes('biometric_plantillas bp'))
        return [
          { dispositivo_id: 'dev-1', nombre: 'Puerta' },
          { dispositivo_id: 'dev-2', nombre: 'Comedor' },
          { dispositivo_id: 'dev-1', nombre: 'Puerta' } // duplicado: no repite llamada
        ];
      return [];
    });

    await UserService.delete('u-1');

    expect(llamadasAlLector()).toHaveLength(0);

    // Las plantillas maestras se borran una sola vez, antes de borrar la fila
    // (el borrado de la fila no borra plantillas: la tabla no tiene FK ON DELETE).
    const orden = sqls();
    expect(orden.filter(sql => sql.startsWith('DELETE FROM biometric_plantillas'))).toHaveLength(1);
    expect(orden.indexOf('DELETE FROM biometric_plantillas WHERE usuario_id = ?')).toBeLessThan(
      orden.findIndex(sql => sql.includes('DELETE FROM usuarios'))
    );
  });

  it('sin código biométrico no toca lectores, pero sí borra plantillas huérfanas', async () => {
    db.queryMock.mockImplementation(async (sql: string) => {
      if (sql.includes('FROM usuarios')) return [personaSinBiometrico];
      return [];
    });

    await UserService.delete('u-2');

    expect(llamadasAlLector()).toHaveLength(0);
    expect(sqls().filter(sql => sql.startsWith('DELETE FROM biometric_plantillas'))).toHaveLength(
      1
    );
    expect(sqls().some(sql => sql.includes('DELETE FROM usuarios'))).toBe(true);
  });

  it('un lector que no responde no bloquea el borrado del usuario', async () => {
    db.queryMock.mockImplementation(async (sql: string) => {
      if (sql.includes('FROM usuarios')) return [personaEnrolada];
      if (sql.includes('biometric_plantillas bp'))
        return [{ dispositivo_id: 'dev-1', nombre: 'Puerta' }];
      return [];
    });
    enrollment.quitarDelEquipo.mockRejectedValue(new Error('fetch failed'));

    await UserService.delete('u-1');

    // El borrado es local y no depende del lector.
    expect(llamadasAlLector()).toHaveLength(0);
    expect(sqls().filter(sql => sql.startsWith('DELETE FROM biometric_plantillas'))).toHaveLength(
      1
    );
    expect(sqls().some(sql => sql.includes('DELETE FROM usuarios'))).toBe(true);
  });

  it('un usuario que ya no existe se elimina igual (borrado idempotente)', async () => {
    await UserService.delete('nadie');

    expect(llamadasAlLector()).toHaveLength(0);
    expect(sqls().some(sql => sql.includes('DELETE FROM usuarios'))).toBe(true);
  });
});
