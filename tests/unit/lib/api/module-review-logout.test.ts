import { beforeEach, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getAuth: vi.fn(),
  refresh: vi.fn(),
  logout: vi.fn(),
  deleteCookie: vi.fn(),
  getCookie: vi.fn()
}));
vi.mock('@/lib/api/withRoute', () => ({ withPublicRoute: (handler: unknown) => handler }));
vi.mock('@/lib/auth/auth-app', () => ({ getAuth: mocks.getAuth }));
vi.mock('@/lib/auth/auth', () => ({ verifyRefreshToken: mocks.refresh }));
vi.mock('@/modules/identidad', () => ({ AuthService: { logout: mocks.logout } }));
vi.mock('next/headers', () => ({
  cookies: async () => ({ get: mocks.getCookie, delete: mocks.deleteCookie })
}));
beforeEach(() => {
  vi.clearAllMocks();
  mocks.getAuth.mockResolvedValue(null);
  mocks.getCookie.mockReturnValue({ value: 'refresh-valido' });
});

it('revoca la sesión al cerrar con acceso vencido y refresh vigente', async () => {
  mocks.refresh.mockResolvedValue({ id: 'usuario' });
  const { POST } = await import('@/app/api/auth/logout/route');
  await POST(new Request('http://localhost/api/auth/logout', { method: 'POST' }) as any, {} as any);
  expect(mocks.refresh).toHaveBeenCalledWith('refresh-valido');
  expect(mocks.logout).toHaveBeenCalledWith('usuario');
  expect(mocks.deleteCookie).toHaveBeenCalledWith('token');
  expect(mocks.deleteCookie).toHaveBeenCalledWith('refresh_token');
});

it('no revoca sesiones de terceros si el refresh es inválido', async () => {
  mocks.refresh.mockResolvedValue(null);
  const { POST } = await import('@/app/api/auth/logout/route');
  await POST(new Request('http://localhost/api/auth/logout', { method: 'POST' }) as any, {} as any);
  expect(mocks.logout).not.toHaveBeenCalled();
});
