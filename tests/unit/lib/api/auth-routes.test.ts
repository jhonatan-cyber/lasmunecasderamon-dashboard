import { beforeEach, describe, expect, it, vi } from 'vitest';

const jsonResponse = (body: unknown, init?: ResponseInit) => Response.json(body, init);

describe('auth route contract', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it('login returns token payload and persists auth cookie', async () => {
    const setCookie = vi.fn();
    const loginMock = vi.fn().mockResolvedValue({
      success: true,
      token: 'jwt-token',
      user: { id: 'user-1', role: 'cajero' }
    });

    vi.doMock('next/server', () => ({
      NextResponse: { json: jsonResponse }
    }));
    vi.doMock('next/headers', () => ({
      cookies: vi.fn().mockResolvedValue({ set: setCookie })
    }));
    vi.doMock('@/lib/repositories/AuthRepository', () => ({
      AuthRepository: { login: loginMock }
    }));
    vi.doMock('@/lib/middleware/rateLimit', () => ({
      loginLimiterApp: (handler: any) => handler
    }));

    const route = await import('@/app/api/auth/login/route');
    const response = await route.POST(
      new Request('http://localhost/api/auth/login', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-forwarded-for': '10.0.0.1'
        },
        body: JSON.stringify({ email: 'user@test.com', password: 'secret123' })
      }) as any
    );

    expect(loginMock).toHaveBeenCalledWith(
      { email: 'user@test.com', password: 'secret123' },
      '10.0.0.1'
    );
    expect(setCookie).toHaveBeenCalledWith(
      'token',
      'jwt-token',
      expect.objectContaining({ httpOnly: true, sameSite: 'lax', path: '/' })
    );
    await expect(response.json()).resolves.toEqual({
      success: true,
      token: 'jwt-token',
      user: { id: 'user-1', role: 'cajero' }
    });
  });

  it('logout deletes auth cookie and closes session when user exists', async () => {
    const deleteCookie = vi.fn();
    const logoutMock = vi.fn().mockResolvedValue(undefined);

    vi.doMock('next/server', () => ({
      NextResponse: { json: jsonResponse }
    }));
    vi.doMock('next/headers', () => ({
      cookies: vi.fn().mockResolvedValue({ delete: deleteCookie })
    }));
    vi.doMock('@/lib/api/app-api-wrapper', () => ({
      withAppApiWrapper: (handler: any) => handler
    }));
    vi.doMock('@/lib/auth/auth-app', () => ({
      getAuth: vi.fn().mockResolvedValue({ id: 'user-1' })
    }));
    vi.doMock('@/lib/repositories/AuthRepository', () => ({
      AuthRepository: { logout: logoutMock }
    }));

    const route = await import('@/app/api/auth/logout/route');
    const response = await route.POST(
      new Request('http://localhost/api/auth/logout', { method: 'POST' }) as any,
      { params: {} } as any
    );

    expect(logoutMock).toHaveBeenCalledWith('user-1');
    expect(deleteCookie).toHaveBeenCalledWith('token');
    await expect(response.json()).resolves.toEqual({ success: true, message: 'Sesión cerrada' });
  });

  it('me returns normalized user profile', async () => {
    vi.doMock('next/server', () => ({
      NextResponse: { json: jsonResponse }
    }));
    vi.doMock('@/lib/api/app-api-wrapper', () => ({
      withAppAuth: (handler: any) => {
        return (request: Request, context: any = { params: {} }) =>
          handler(request, { ...context, user: { id: 'user-1' } });
      }
    }));
    vi.doMock('@/lib/repositories/UserRepository', () => ({
      UserRepository: {
        getById: vi.fn().mockResolvedValue({
          id: 'user-1',
          name: 'Ana',
          lastName: 'Ramon',
          email: 'ana@test.com',
          role: 'anfitriona',
          foto: 'ana.png',
          nick: 'ana',
          phone: '70000000',
          address: 'Centro',
          maritalStatus: 'soltera'
        })
      }
    }));

    const route = await import('@/app/api/auth/me/route');
    const response = await route.GET(
      new Request('http://localhost/api/auth/me') as any,
      { params: {} } as any
    );

    await expect(response.json()).resolves.toEqual({
      success: true,
      user: {
        id: 'user-1',
        username: 'ana',
        name: 'Ana',
        lastName: 'Ramon',
        email: 'ana@test.com',
        role: 'anfitriona',
        foto: 'ana.png',
        nick: 'ana',
        phone: '70000000',
        address: 'Centro',
        estado_civil: 'soltera'
      }
    });
  });

  it('check-session returns disconnection state from repository', async () => {
    const checkSessionMock = vi.fn().mockResolvedValue({
      success: true,
      debeDesconectar: false
    });

    vi.doMock('next/server', () => ({
      NextResponse: { json: jsonResponse }
    }));
    vi.doMock('@/lib/api/app-api-wrapper', () => ({
      withAppAuth: (handler: any) => {
        return (request: Request, context: any = { params: {} }) =>
          handler(request, { ...context, user: { id: 'user-1' } });
      }
    }));
    vi.doMock('@/lib/repositories/AuthRepository', () => ({
      AuthRepository: { checkSession: checkSessionMock }
    }));

    const route = await import('@/app/api/auth/check-session/route');
    const response = await route.GET(
      new Request('http://localhost/api/auth/check-session') as any,
      { params: {} } as any
    );

    expect(checkSessionMock).toHaveBeenCalledWith('user-1');
    await expect(response.json()).resolves.toEqual({
      success: true,
      debeDesconectar: false
    });
  });
});
