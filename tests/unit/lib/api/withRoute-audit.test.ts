import { describe, expect, it, vi, beforeEach } from 'vitest';

vi.hoisted(() => {
  process.env.JWT_SECRET = 'test-secret-that-is-long-enough-for-validation';
});

vi.mock('@/modules/auditoria/registro/servicio', () => ({
  AuditService: { log: vi.fn().mockResolvedValue(undefined) }
}));

vi.mock('@/lib/api/api-response', () => ({
  ApiResponse: {
    unauthorized: vi.fn(() => new Response(null, { status: 401 })),
    forbidden: vi.fn(() => new Response(null, { status: 403 })),
    validationError: vi.fn(),
    error: vi.fn()
  }
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

import { withRoute } from '@/lib/api/withRoute';
import { AuditService } from '@/modules/auditoria/registro/servicio';

const okHandler = (_req: Request, _ctx: { params: any }) =>
  Promise.resolve(Response.json({ success: true }));

describe('withRoute - audit logging', () => {
  beforeEach(() => {
    mockAuthUser = { id: 'user-1', role: 'cajero', permissions: {} };
  });

  it('logs audit for POST mutations', async () => {
    const wrapped = withRoute({ auth: true, access: 'authenticated', audit: true }, okHandler);
    await wrapped(new Request('http://localhost/test', { method: 'POST' }), { params: {} });
    expect(AuditService.log).toHaveBeenCalledWith(
      expect.objectContaining({ user_id: 'user-1', action: 'POST /test' })
    );
  });

  it('skips audit for GET requests', async () => {
    const wrapped = withRoute({ auth: true, access: 'authenticated', audit: true }, okHandler);
    await wrapped(new Request('http://localhost/test'), { params: {} });
    expect(AuditService.log).not.toHaveBeenCalled();
  });

  it('uses module name as resource_type when provided', async () => {
    mockAuthUser = {
      id: 'user-1',
      role: 'cajero',
      permissions: { users: { read: true, write: true, delete: false } }
    };
    const wrapped = withRoute(
      { auth: true, audit: true, module: 'users', action: 'write' },
      okHandler
    );
    await wrapped(new Request('http://localhost/test', { method: 'PUT' }), { params: {} });
    expect(AuditService.log).toHaveBeenCalledWith(
      expect.objectContaining({ resource_type: 'users' })
    );
  });
});
