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
  logger: { error: vi.fn() }
}));

import { loginUser } from '@/modules/identidad/autenticacion/consultas';

beforeEach(() => {
  vi.clearAllMocks();
  mocks.verify.mockResolvedValue(true);
  mocks.query.mockImplementation(async (sql: string) =>
    sql.includes('SELECT u.*')
      ? [{ id_usuario: 'user', rol_id: 'role', rol_nombre: 'garzon', password: 'hash' }]
      : []
  );
});

it('avisa al dashboard después de un login sin marca de asistencia', async () => {
  const result = await loginUser({ email: 'garzon', password: 'password' });
  expect(result).toMatchObject({ success: true, asistenciaRegistrada: false });
  expect(mocks.login).toHaveBeenCalledWith('user', 'garzon');
  expect(mocks.emit).toHaveBeenCalledExactlyOnceWith('presence_updated', {
    userId: 'user',
    motivo: 'login'
  });
});

it('no emite presencia cuando las credenciales fallan', async () => {
  mocks.verify.mockResolvedValue(false);
  await expect(loginUser({ email: 'garzon', password: 'incorrecta' })).rejects.toThrow();
  expect(mocks.emit).not.toHaveBeenCalled();
});
