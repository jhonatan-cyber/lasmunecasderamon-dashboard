import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ZodError } from 'zod';

vi.hoisted(() => {
  process.env.JWT_SECRET = 'test-secret-that-is-long-enough-for-validation';
});

vi.mock('@/lib/api/api-response', () => ({
  ApiResponse: {
    unauthorized: vi.fn(),
    forbidden: vi.fn(),
    validationError: vi.fn(),
    error: vi.fn()
  }
}));

vi.mock('@/modules/auditoria/errores/servicio', () => ({
  ErrorLogService: { log: vi.fn().mockResolvedValue(undefined) }
}));

let mockAuthUser: any = null;
vi.mock('@/lib/auth/auth-app', () => ({
  getAuth: vi.fn().mockImplementation(() => mockAuthUser)
}));

vi.mock('@/lib/utils/logger', () => {
  const mocks = {
    error: vi.fn(),
    captureException: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn()
  };
  return {
    logger: mocks,
    auditLogger: {
      login: vi.fn(),
      logout: vi.fn(),
      dataAccess: vi.fn(),
      securityEvent: vi.fn(),
      error: vi.fn()
    },
    default: mocks
  };
});

vi.mock('@/lib/api/date-response', () => ({
  normalizeJsonResponseDates: (r: any) => r
}));

vi.mock('next/server', () => ({
  NextResponse: { json: (body: unknown, init?: ResponseInit) => Response.json(body, init) }
}));

import { withRoute, withPublicRoute } from '@/lib/api/withRoute';
import { ErrorLogService } from '@/modules/auditoria/errores/servicio';
import { ApiResponse } from '@/lib/api/api-response';

const okHandler = (_req: Request, _ctx: { params: any }) =>
  Promise.resolve(Response.json({ success: true }));

describe('withRoute middleware', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthUser = null;
  });

  describe('withPublicRoute', () => {
    it('calls handler without auth', async () => {
      const wrapped = withPublicRoute(okHandler);
      const res = await wrapped(new Request('http://localhost/test'), { params: {} });
      await expect(res.json()).resolves.toEqual({ success: true });
    });
  });

  describe('auth guard', () => {
    it('returns 401 when auth required but no user', async () => {
      const wrapped = withRoute({ auth: true, access: 'authenticated' }, okHandler);
      await wrapped(new Request('http://localhost/test'), { params: {} });
      expect(ApiResponse.unauthorized).toHaveBeenCalled();
    });

    it('passes user to handler when authenticated', async () => {
      mockAuthUser = { id: 'user-1', role: 'cajero', permissions: {} };
      const handler = vi.fn().mockResolvedValue(Response.json({ success: true }));
      const wrapped = withRoute({ auth: true, access: 'authenticated' }, handler as any);
      await wrapped(new Request('http://localhost/test'), { params: {} });
      expect(handler).toHaveBeenCalledWith(
        expect.any(Request),
        expect.objectContaining({ user: mockAuthUser })
      );
    });
  });

  describe('permission guard', () => {
    it('returns 403 when user lacks module permission', async () => {
      mockAuthUser = {
        id: 'user-1',
        role: 'cajero',
        permissions: { users: { read: true, write: false, delete: false } }
      };
      const wrapped = withRoute({ auth: true, module: 'users', action: 'write' }, okHandler);
      await wrapped(new Request('http://localhost/test'), { params: {} });
      expect(ApiResponse.forbidden).toHaveBeenCalledWith('Permisos insuficientes');
    });

    it('calls handler when user has permission', async () => {
      mockAuthUser = {
        id: 'user-1',
        role: 'cajero',
        permissions: { users: { read: true, write: true, delete: false } }
      };
      const handler = vi.fn().mockResolvedValue(Response.json({ success: true }));
      const wrapped = withRoute({ auth: true, module: 'users', action: 'write' }, handler as any);
      await wrapped(new Request('http://localhost/test'), { params: {} });
      expect(handler).toHaveBeenCalled();
    });

    it('allows administrador role for any permission', async () => {
      mockAuthUser = {
        id: 'admin-1',
        role: 'administrador',
        permissions: { users: { read: true, write: false, delete: false } }
      };
      const handler = vi.fn().mockResolvedValue(Response.json({ success: true }));
      const wrapped = withRoute({ auth: true, module: 'users', action: 'write' }, handler as any);
      await wrapped(new Request('http://localhost/test'), { params: {} });
      expect(handler).toHaveBeenCalled();
    });
  });

  describe('admin-only guard', () => {
    it('rechaza a un rol distinto de administrador', async () => {
      mockAuthUser = { id: 'user-1', role: 'cajero', permissions: {} };
      const handler = vi.fn().mockResolvedValue(Response.json({ success: true }));
      const wrapped = withRoute({ auth: true, access: 'administrator' }, handler as any);
      await wrapped(new Request('http://localhost/test'), { params: {} });
      expect(ApiResponse.forbidden).toHaveBeenCalled();
      expect(handler).not.toHaveBeenCalled();
    });

    it('permite al administrador', async () => {
      mockAuthUser = { id: 'admin-1', role: 'administrador', permissions: {} };
      const handler = vi.fn().mockResolvedValue(Response.json({ success: true }));
      const wrapped = withRoute({ auth: true, access: 'administrator' }, handler as any);
      await wrapped(new Request('http://localhost/test'), { params: {} });
      expect(handler).toHaveBeenCalled();
    });

    it('deja pasar a cualquier rol en una ruta de sesion', async () => {
      mockAuthUser = { id: 'user-1', role: 'anfitriona', permissions: {} };
      const handler = vi.fn().mockResolvedValue(Response.json({ success: true }));
      const wrapped = withRoute({ auth: true, access: 'authenticated' }, handler as any);
      await wrapped(new Request('http://localhost/test'), { params: {} });
      expect(handler).toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    it('returns ZodError as validation error', async () => {
      const wrapped = withRoute({}, () =>
        Promise.reject(
          new ZodError([
            { code: 'invalid_type', expected: 'string', path: ['name'], message: 'Expected string' }
          ])
        )
      );
      await wrapped(new Request('http://localhost/test'), { params: {} });
      expect(ApiResponse.validationError).toHaveBeenCalled();
    });

    it('returns generic error for unknown errors', async () => {
      const wrapped = withRoute({}, () => Promise.reject(new Error('something broke')));
      await wrapped(new Request('http://localhost/test'), { params: {} });
      expect(ApiResponse.error).toHaveBeenCalled();
    });

    it('logs DB connection errors without writing to ErrorLogService', async () => {
      const wrapped = withRoute({}, () => {
        const e = new Error('db down');
        (e as any).code = 'ECONNREFUSED';
        return Promise.reject(e);
      });
      await wrapped(new Request('http://localhost/test'), { params: {} });
      expect(ErrorLogService.log).not.toHaveBeenCalled();
    });
  });
});
