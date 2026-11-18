// @vitest-environment node
import { beforeEach, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  query: vi.fn(),
  emit: vi.fn(),
  verify: vi.fn(),
  login: vi.fn()
}));
vi.mock('@/lib/database/db', () => ({ query: mocks.query, generateUUID: () => 'uuid' }));
vi.mock('@/lib/api/sseService', () => ({ sendNotificationToAll: mocks.emit }));
vi.mock('@/modules/identidad/autenticacion/sesionesRepositorio', () => ({
  registrarLogin: mocks.login
}));
vi.mock('argon2', () => ({ verify: mocks.verify }));
vi.mock('@/lib/auth/auth', () => ({ generateToken: async () => 'token' }));
vi.mock('@/lib/business/timezoneService', () => ({
  getNowInBusinessTimezone: () => '2026-10-16 12:00:00',
  getSystemTimezone: () => 'America/Santiago'
}));
vi.mock('@/lib/utils/logger', () => ({
  default: { error: vi.fn(), info: vi.fn(), captureException: vi.fn() },
  logger: { error: vi.fn() },
  setRequestId: vi.fn(),
  getRequestId: vi.fn(() => 'test-request-id'),
  clearRequestId: vi.fn()
}));

import { logoutUser } from '@/modules/identidad/autenticacion/consultas';

let sesionesVivas = 0;

beforeEach(() => {
  vi.clearAllMocks();
  sesionesVivas = 0;
  mocks.query.mockImplementation(async (sql: string) => {
    if (sql.includes('COUNT(*)')) return [{ count: sesionesVivas }];
    return [];
  });
});

it('no borra la presencia si al usuario le quedan otras sesiones activas', async () => {
  sesionesVivas = 2;

  await logoutUser('user-1', 'sid-1');

  const borroLogins = mocks.query.mock.calls.some(([sql]) =>
    String(sql).includes('DELETE FROM logins')
  );
  expect(borroLogins).toBe(false);
  expect(mocks.emit).not.toHaveBeenCalled();
});

it('borra la presencia cuando era la última sesión activa', async () => {
  sesionesVivas = 0;

  await logoutUser('user-1', 'sid-1');

  expect(mocks.query).toHaveBeenCalledWith('DELETE FROM logins WHERE usuario_id = ?', ['user-1']);
  expect(mocks.emit).toHaveBeenCalledExactlyOnceWith('presence_updated', {
    userId: 'user-1',
    en_local: false
  });
});
