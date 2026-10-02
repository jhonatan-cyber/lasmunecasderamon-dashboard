// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';

// El estado y las plantillas se gestionan localmente.
const db = vi.hoisted(() => ({ queryMock: vi.fn() }));
const enrollment = vi.hoisted(() => ({
  quitarDelEquipo: vi.fn(),
  restaurarEnEquipo: vi.fn()
}));

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

vi.mock('@/lib/biometric/enrollmentService', () => enrollment);

vi.mock('@/lib/auth/permissions-cache', () => ({
  PermissionsCache: { invalidate: vi.fn(), set: vi.fn(), get: vi.fn(), clear: vi.fn() }
}));

import { UserService } from '@/lib/services/UserService';
import { NotFoundError } from '@/lib/errors/errors';

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

/** Persona sin código: el toggle no debe llamar al lector para nada. */
const personaSinBiometrico = {
  ...personaEnrolada,
  biometrico_codigo: null,
  biometrico_huella: 0,
  biometrico_facial: 0
};

/** Estado actual de la fila, mutado por el UPDATE del mock (como la DB real). */
let estadoActual = 1;

function sqls(): string[] {
  return db.queryMock.mock.calls.map(call => String(call[0]));
}

/** UPDATE de estado sobre usuarios (el toggle en la DB). */
function updatesDeEstado(): string[] {
  return sqls().filter(sql => sql.includes('UPDATE usuarios SET') && sql.includes('estado'));
}

beforeEach(() => {
  estadoActual = 1;
  db.queryMock.mockReset();
  db.queryMock.mockImplementation(async (sql: string, params?: any[]) => {
    if (sql.includes('FROM usuarios')) return [{ ...personaEnrolada, estado: estadoActual }];
    // BaseRepository.update manda los valores primero: estado va en params[0].
    if (sql.includes('UPDATE usuarios SET')) estadoActual = Number(params?.[0]);
    if (sql.includes('FROM biometric_plantillas')) return [];
    return [];
  });
  enrollment.quitarDelEquipo.mockReset();
  enrollment.quitarDelEquipo.mockResolvedValue(undefined);
  enrollment.restaurarEnEquipo.mockReset();
  enrollment.restaurarEnEquipo.mockResolvedValue({ ok: true, mensaje: 'Alta completada' });
});

describe('estado del usuario gestionado en el sistema', () => {
  it.each([
    ['activate', 1],
    ['deactivate', 0]
  ] as const)('%s guarda el estado sin registrar usuarios en el lector', async (action, status) => {
    const result = await UserService.toggleUserStatus('u-1', action);
    expect(result).toMatchObject({ status });
    expect(result.lector.intentado).toBe(false);
    expect(enrollment.quitarDelEquipo).not.toHaveBeenCalled();
    expect(enrollment.restaurarEnEquipo).not.toHaveBeenCalled();
    expect(updatesDeEstado()).toHaveLength(1);
  });
});

describe('casos borde del toggle', () => {
  it('un usuario que no existe sigue lanzando NotFoundError', async () => {
    db.queryMock.mockImplementation(async () => []);

    await expect(UserService.toggleUserStatus('nadie', 'deactivate')).rejects.toBeInstanceOf(
      NotFoundError
    );
    expect(enrollment.quitarDelEquipo).not.toHaveBeenCalled();
  });

  it('una acción inválida sigue rechazándose sin tocar nada', async () => {
    await expect(UserService.toggleUserStatus('u-1', 'suspend')).rejects.toThrow(
      'Acción de estado inválida'
    );
    expect(db.queryMock).not.toHaveBeenCalled();
  });
});
