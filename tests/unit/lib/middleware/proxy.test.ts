import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { NextRequest } from 'next/server';

const mockJwtVerify = vi.hoisted(() => vi.fn());
const mockSignJWT = vi.hoisted(() => vi.fn());
const mockCheckRateLimit = vi.hoisted(() => vi.fn());

vi.mock('jose', () => ({
  jwtVerify: mockJwtVerify,
  SignJWT: class {
    setProtectedHeader() {
      return this;
    }
    setExpirationTime() {
      return this;
    }
    async sign() {
      return mockSignJWT();
    }
  }
}));

vi.mock('@/lib/middleware/redisRateLimit', () => ({
  checkRateLimit: mockCheckRateLimit,
  RATE_LIMIT_CONFIGS: {
    LOGIN: { windowMs: 60000, max: 5, prefix: 'login' },
    SSE: { windowMs: 60000, max: 30, prefix: 'sse' },
    API_GENERAL: { windowMs: 60000, max: 100, prefix: 'general' },
    API_SENSITIVE: { windowMs: 60000, max: 30, prefix: 'sensitive' }
  }
}));

vi.mock('@/lib/database/db', () => ({
  query: vi.fn()
}));

function createRequest(opts: {
  pathname: string;
  method?: string;
  headers?: Record<string, string>;
  cookies?: Record<string, string>;
  url?: string;
}): NextRequest {
  const url = opts.url ?? `http://localhost:3000${opts.pathname}`;
  const headers = new Headers(opts.headers ?? {});
  if (opts.cookies) {
    const cookieStr = Object.entries(opts.cookies)
      .map(([k, v]) => `${k}=${v}`)
      .join('; ');
    headers.set('cookie', cookieStr);
  }

  const cookieStore = new Map(Object.entries(opts.cookies ?? {}));
  const request = {
    nextUrl: new URL(url),
    url,
    method: opts.method ?? 'GET',
    headers,
    cookies: {
      get: (name: string) => {
        const value = cookieStore.get(name);
        return value !== undefined ? { name, value } : undefined;
      }
    }
  } as unknown as NextRequest;

  return request;
}

async function loadProxy() {
  vi.resetModules();
  const mod = await import('@/proxy');
  return mod.default;
}

const ADMIN_PAYLOAD = {
  id: 1,
  role: 'administrador',
  username: 'admin',
  nick: 'admin'
};

const CAJERO_PAYLOAD = {
  id: 2,
  role: 'cajero',
  username: 'cajero',
  nick: 'cajero'
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv('JWT_SECRET', 'test-secret');
  vi.stubEnv('JWT_REFRESH_SECRET', 'test-refresh');
  vi.stubEnv('NODE_ENV', 'test');
  vi.stubEnv('SKIP_RATE_LIMIT', 'true');
  mockCheckRateLimit.mockResolvedValue({ allowed: true, limit: 100, remaining: 99, reset: 0 });
});

describe('proxy — CORS de Expo Web', () => {
  it.each([
    ['/api/orders', 'content-type,authorization,x-idempotency-key'],
    ['/api/auth/refresh', 'content-type,x-refresh-token']
  ])('autoriza las cabeceras del preflight %s sin exigir sesión', async (pathname, requested) => {
    const proxy = await loadProxy();
    const res = await proxy(
      createRequest({
        pathname,
        method: 'OPTIONS',
        headers: {
          origin: 'http://localhost:8081',
          'access-control-request-method': 'POST',
          'access-control-request-headers': requested
        }
      })
    );
    expect(res.status).toBe(200);
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('http://localhost:8081');
    const allowed = res.headers
      .get('Access-Control-Allow-Headers')!
      .toLowerCase()
      .split(',')
      .map(s => s.trim());
    for (const header of requested.split(',')) expect(allowed).toContain(header);
    expect(res.headers.get('Access-Control-Allow-Methods')).toContain('POST');
  });
});

describe('proxy — rutas públicas', () => {
  it('deja pasar /login sin token', async () => {
    const proxy = await loadProxy();
    const res = await proxy(createRequest({ pathname: '/login' }));
    expect(res.status).toBe(200);
    expect(res.headers.get('location')).toBeNull();
  });

  it('deja pasar /api/auth/login sin token', async () => {
    const proxy = await loadProxy();
    const res = await proxy(createRequest({ pathname: '/api/auth/login', method: 'POST' }));
    expect(res.status).toBe(200);
    expect(res.headers.get('location')).toBeNull();
  });

  it('deja pasar / con match exacto de raíz', async () => {
    const proxy = await loadProxy();
    const res = await proxy(createRequest({ pathname: '/' }));
    expect(res.status).toBe(200);
    expect(res.headers.get('location')).toBeNull();
  });

  it('no trata /otra como pública aunque empiece con /', async () => {
    const proxy = await loadProxy();
    const res = await proxy(createRequest({ pathname: '/otra' }));
    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toContain('/login');
  });
});

describe('proxy — autenticación', () => {
  it('API sin token devuelve 401 NO_TOKEN', async () => {
    const proxy = await loadProxy();
    const res = await proxy(createRequest({ pathname: '/api/users' }));
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body).toMatchObject({ success: false, code: 'NO_TOKEN' });
  });

  it('página protegida sin token redirige a /login con redirect', async () => {
    const proxy = await loadProxy();
    const res = await proxy(createRequest({ pathname: '/dashboard' }));
    expect(res.status).toBe(307);
    const location = res.headers.get('location') ?? '';
    expect(location).toContain('/login');
    expect(location).toContain('redirect=%2Fdashboard');
  });

  it('token inválido sin refresh redirige a login (página)', async () => {
    mockJwtVerify.mockRejectedValue(new Error('invalid'));
    const proxy = await loadProxy();
    const res = await proxy(
      createRequest({ pathname: '/dashboard', cookies: { token: 'bad-token' } })
    );
    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toContain('/login');
  });

  it('token inválido en API devuelve 401', async () => {
    mockJwtVerify.mockRejectedValue(new Error('invalid'));
    const proxy = await loadProxy();
    const res = await proxy(
      createRequest({ pathname: '/api/products', cookies: { token: 'bad' } })
    );
    expect(res.status).toBe(401);
  });
});

describe('proxy — token admin', () => {
  it('administrador con token válido accede a página protegida', async () => {
    mockJwtVerify.mockResolvedValue({ payload: ADMIN_PAYLOAD });
    const proxy = await loadProxy();
    const res = await proxy(createRequest({ pathname: '/settings', cookies: { token: 'good' } }));
    expect(res.status).toBe(200);
    expect(res.headers.get('location')).toBeNull();
  });

  it('administrador con token válido accede a API protegida', async () => {
    mockJwtVerify.mockResolvedValue({ payload: ADMIN_PAYLOAD });
    const proxy = await loadProxy();
    const res = await proxy(createRequest({ pathname: '/api/roles', cookies: { token: 'good' } }));
    expect(res.status).toBe(200);
    expect(res.headers.get('location')).toBeNull();
  });

  it('acepta token vía Authorization header Bearer', async () => {
    mockJwtVerify.mockResolvedValue({ payload: ADMIN_PAYLOAD });
    const proxy = await loadProxy();
    const res = await proxy(
      createRequest({
        pathname: '/api/users',
        headers: { authorization: 'Bearer header-token' }
      })
    );
    expect(res.status).toBe(200);
    // Se sincroniza el token de header como cookie para fetch() del cliente
    const setCookie = res.headers.get('set-cookie') ?? '';
    expect(setCookie).toContain('token=header-token');
  });
});

describe('proxy — refresh token rotation', () => {
  it('renueva access token cuando el access token expiró pero hay refresh válido', async () => {
    mockJwtVerify
      .mockRejectedValueOnce(new Error('expired'))
      .mockResolvedValueOnce({ payload: { ...ADMIN_PAYLOAD, id: 1 } });
    mockSignJWT.mockResolvedValue('renewed-access-token');

    const proxy = await loadProxy();
    const res = await proxy(
      createRequest({
        pathname: '/dashboard',
        cookies: { token: 'expired', refresh_token: 'valid-refresh' }
      })
    );

    expect(res.status).toBe(200);
    expect(res.headers.get('location')).toBeNull();
    const setCookie = res.headers.get('set-cookie') ?? '';
    expect(setCookie).toContain('token=renewed-access-token');
  });

  it('no renueva si el refresh token también es inválido', async () => {
    mockJwtVerify.mockRejectedValue(new Error('invalid'));
    const proxy = await loadProxy();
    const res = await proxy(
      createRequest({
        pathname: '/dashboard',
        cookies: { token: 'expired', refresh_token: 'bad-refresh' }
      })
    );
    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toContain('/login');
  });
});

describe('proxy — CORS y OPTIONS', () => {
  it('OPTIONS a API responde con CORS preflight', async () => {
    const proxy = await loadProxy();
    const res = await proxy(
      createRequest({
        pathname: '/api/users',
        method: 'OPTIONS',
        headers: { origin: 'http://localhost:3000' }
      })
    );
    expect(res.status).toBe(200);
    expect(res.headers.get('access-control-allow-origin')).toBe('http://localhost:3000');
    expect(res.headers.get('access-control-allow-methods')).toContain('POST');
    expect(res.headers.get('access-control-allow-credentials')).toBe('true');
  });

  it('origen no permitido en CORS cae al default del site', async () => {
    const proxy = await loadProxy();
    const res = await proxy(
      createRequest({
        pathname: '/api/users',
        method: 'OPTIONS',
        headers: { origin: 'https://evil.example.com' }
      })
    );
    expect(res.headers.get('access-control-allow-origin')).not.toBe('https://evil.example.com');
  });
});

describe('proxy — CSRF', () => {
  it('rechaza POST a API con Origin no permitido (403 CSRF_REJECTED)', async () => {
    const proxy = await loadProxy();
    const res = await proxy(
      createRequest({
        pathname: '/api/sales',
        method: 'POST',
        headers: {
          origin: 'https://evil.example.com',
          cookie: 'token=admin-token'
        },
        cookies: { token: 'admin-token' }
      })
    );
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body).toMatchObject({ success: false, code: 'CSRF_REJECTED' });
  });

  it('permite POST con Origin permitido (localhost)', async () => {
    mockJwtVerify.mockResolvedValue({ payload: ADMIN_PAYLOAD });
    const proxy = await loadProxy();
    const res = await proxy(
      createRequest({
        pathname: '/api/sales',
        method: 'POST',
        headers: { origin: 'http://localhost:3000' },
        cookies: { token: 'good' }
      })
    );
    expect(res.status).toBe(200);
  });

  it('POST sin Origin (curl/Postman) pasa el CSRF', async () => {
    mockJwtVerify.mockResolvedValue({ payload: ADMIN_PAYLOAD });
    const proxy = await loadProxy();
    const res = await proxy(
      createRequest({ pathname: '/api/sales', method: 'POST', cookies: { token: 'good' } })
    );
    expect(res.status).toBe(200);
  });
});

describe('proxy — rutas de kiosko', () => {
  it('deja pasar /api/kiosk sin sesión de persona', async () => {
    const proxy = await loadProxy();
    const res = await proxy(createRequest({ pathname: '/api/kiosk/status' }));
    expect(res.status).toBe(200);
    expect(res.headers.get('location')).toBeNull();
  });

  it('deja pasar /api/notifications/kiosk sin sesión', async () => {
    const proxy = await loadProxy();
    const res = await proxy(createRequest({ pathname: '/api/notifications/kiosk' }));
    expect(res.status).toBe(200);
  });
});

describe('proxy — rate limit (producción)', () => {
  it.each([
    '/api/auth/login',
    '/api/auth/refresh',
    '/api/auth/reset-password',
    '/api/auth/register-first-user'
  ])('aplica el límite estricto de credenciales a %s', async pathname => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('SKIP_RATE_LIMIT', 'false');
    mockCheckRateLimit.mockResolvedValue({ allowed: true, limit: 5, remaining: 4, reset: 0 });

    const proxy = await loadProxy();
    await proxy(createRequest({ pathname, method: 'POST' }));

    expect(mockCheckRateLimit).toHaveBeenCalledTimes(1);
    expect(mockCheckRateLimit.mock.calls[0][1]).toMatchObject({ prefix: 'login' });
  });

  it('un POST de API que no es de credenciales usa el límite sensible', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('SKIP_RATE_LIMIT', 'false');
    mockCheckRateLimit.mockResolvedValue({ allowed: true, limit: 30, remaining: 29, reset: 0 });

    const proxy = await loadProxy();
    await proxy(createRequest({ pathname: '/api/sales', method: 'POST' }));

    expect(mockCheckRateLimit).toHaveBeenCalledTimes(1);
    expect(mockCheckRateLimit.mock.calls[0][1]).toMatchObject({ prefix: 'sensitive' });
  });

  it('devuelve 429 cuando checkRateLimit no permite', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('SKIP_RATE_LIMIT', 'false');
    mockCheckRateLimit.mockResolvedValue({
      allowed: false,
      limit: 5,
      remaining: 0,
      reset: 1700000000,
      retryAfter: 30
    });

    const proxy = await loadProxy();
    const res = await proxy(createRequest({ pathname: '/login' }));

    expect(res.status).toBe(429);
    expect(res.headers.get('retry-after')).toBe('30');
    const body = await res.json();
    expect(body.code).toBe('RATE_LIMIT_EXCEEDED');
  });

  it('SKIP_RATE_LIMIT=true salta el rate limit incluso en producción', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('SKIP_RATE_LIMIT', 'true');
    mockCheckRateLimit.mockResolvedValue({
      allowed: false,
      limit: 5,
      remaining: 0,
      reset: 0
    });

    const proxy = await loadProxy();
    const res = await proxy(createRequest({ pathname: '/login' }));

    expect(res.status).toBe(200);
    expect(mockCheckRateLimit).not.toHaveBeenCalled();
  });
});

describe('proxy — headers de seguridad en API', () => {
  it('api response incluye headers de seguridad', async () => {
    mockJwtVerify.mockResolvedValue({ payload: ADMIN_PAYLOAD });
    const proxy = await loadProxy();
    const res = await proxy(createRequest({ pathname: '/api/users', cookies: { token: 'good' } }));

    expect(res.headers.get('x-content-type-options')).toBe('nosniff');
    expect(res.headers.get('x-frame-options')).toBe('DENY');
    expect(res.headers.get('strict-transport-security')).toContain('max-age=');
    expect(res.headers.get('referrer-policy')).toBe('strict-origin-when-cross-origin');
  });
});

describe('proxy — dashboard siempre accesible con sesión', () => {
  it('usuario no-admin con token llega a /dashboard (module dashboard no exige permiso)', async () => {
    mockJwtVerify.mockResolvedValue({ payload: CAJERO_PAYLOAD });
    const proxy = await loadProxy();
    const res = await proxy(createRequest({ pathname: '/dashboard', cookies: { token: 'good' } }));
    expect(res.status).toBe(200);
  });
});
