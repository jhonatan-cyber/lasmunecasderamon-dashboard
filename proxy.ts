import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify, SignJWT } from 'jose';
import {
  AUTHENTICATED_ONLY_APIS,
  API_ROUTE_PERMISSIONS,
  KIOSK_DEVICE_APIS,
  accessDeniedPath,
  findRoutePermission,
  httpActionForMethod,
  isAnySessionRoute,
  isPublicPath
} from '@/lib/constants/route-permissions';
import { siteConfig } from '@/lib/api/site';
import {
  checkRateLimit,
  RATE_LIMIT_CONFIGS,
  type RateLimitConfig
} from '@/lib/middleware/redisRateLimit';

// Orígenes permitidos para CORS
const ALLOWED_ORIGINS = [
  siteConfig.url,
  // Dashboard en ejecución: en local se accede por IP y el navegador envía esa
  // dirección como Origin para las peticiones mutables (por ejemplo, cerrar caja).
  ...(process.env.NEXT_PUBLIC_BASE_URL ? [new URL(process.env.NEXT_PUBLIC_BASE_URL).origin] : []),
  'http://localhost:3000',
  'http://localhost:8081',
  'https://dashboard.xn--lasmuecasderamon-bub.com',

  ...[process.env.DEV_ALLOWED_ORIGINS, process.env.CORS_ORIGINS]
    .filter((origins): origins is string => Boolean(origins))
    .flatMap(origins =>
      origins
        .split(',')
        .map(origin => origin.trim())
        .filter(Boolean)
    )
];

if (process.env.NODE_ENV === 'development' && !process.env.DEV_ALLOWED_ORIGINS) {
  console.warn(
    '[CORS] ⚠️  DEV_ALLOWED_ORIGINS no definida. Las IPs de red local no podrán conectar al dashboard.\n' +
      '         Configúrala en .env.local: DEV_ALLOWED_ORIGINS=http://192.168.1.42:3000,http://192.168.1.42:8081'
  );
}

function isOriginAllowed(origin: string | null): boolean {
  if (!origin) return false;
  return ALLOWED_ORIGINS.some(allowed => origin === allowed || origin.startsWith(allowed + '/'));
}

function getCorsOrigin(origin: string | null): string {
  if (origin && isOriginAllowed(origin)) return origin;
  return siteConfig.url;
}

const CREDENTIAL_RATE_LIMIT_PATHS = [
  '/api/auth/login',
  '/api/auth/refresh',
  '/api/auth/reset-password',
  '/api/auth/register-first-user'
];

function addCspHeaders(request: NextRequest): {
  nonce: string;
  cspHeader: string;
  headers: Headers;
} {
  const nonce = Buffer.from(crypto.randomUUID()).toString('base64');
  const isDev = process.env.NODE_ENV === 'development';
  if (isDev) {
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-nonce', nonce);
    return { nonce, cspHeader: '', headers: requestHeaders };
  }
  const scriptSrc = `'self' 'nonce-${nonce}' 'strict-dynamic'`;

  const cspHeader = `
    default-src 'self';
    script-src ${scriptSrc};
    style-src 'self' 'unsafe-inline';
    img-src 'self' blob: data: https:;
    font-src 'self' data: https:;
    connect-src 'self' https: ws: wss:;
    media-src 'self' blob: https:;
    frame-src 'self' https://www.google.com https://maps.google.com;
    base-uri 'self';
    form-action 'self';
    frame-ancestors 'none';
    object-src 'none';
    report-uri /api/csp-violation;
  `
    .replace(/\s{2,}/g, ' ')
    .trim();

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-nonce', nonce);

  return { nonce, cspHeader, headers: requestHeaders };
}

async function verifyToken(token: string) {
  try {
    const secret = new TextEncoder().encode(process.env.JWT_SECRET);
    const { payload } = await jwtVerify(token, secret);
    return payload;
  } catch (error) {
    return null;
  }
}

async function verifyRefreshToken(token: string) {
  try {
    const secret = new TextEncoder().encode(
      process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET
    );
    const { payload } = await jwtVerify(token, secret);
    return payload;
  } catch {
    return null;
  }
}

async function generateAccessTokenFromPayload(payload: any): Promise<string> {
  return await new SignJWT({
    id: payload.id,
    userId: payload.userId || payload.id,
    username: payload.username,
    name: payload.name,
    lastName: payload.lastName,
    nick: payload.nick,
    email: payload.email,
    role: payload.role
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('15m')
    .sign(new TextEncoder().encode(process.env.JWT_SECRET));
}

async function localCheckUserPermission(
  userId: number,
  module: string,
  action: string
): Promise<boolean> {
  try {
    const { query } = await import('@/lib/database/db');

    const userResult = await query<any[]>(
      'SELECT u.rol_id, r.nombre as rol_nombre FROM usuarios u LEFT JOIN roles r ON u.rol_id = r.id_rol WHERE u.id_usuario = ?',
      [String(userId)]
    );

    if (!userResult || userResult.length === 0) {
      return false;
    }

    const roleName = userResult[0].rol_nombre?.toLowerCase() || '';

    if (roleName === 'administrador') {
      return true;
    }

    const roleId = userResult[0].rol_id;
    if (!roleId) {
      return false;
    }

    const perms = await query<any[]>(
      `SELECT 1 FROM permissions p
       INNER JOIN role_permissions rp ON p.id = rp.permission_id
       WHERE rp.role_id = ?
         AND p.module = ?
         AND p.action = ?
         AND p.deleted_at IS NULL
       LIMIT 1`,
      [String(roleId), module, action]
    );

    return perms.length > 0;
  } catch {
    return false;
  }
}

export default async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isApi = pathname.startsWith('/api/');
  const forwarded = request.headers.get('x-forwarded-for');
  const ip = forwarded ? forwarded.split(',')[0] : 'unknown';

  const origin = request.headers.get('origin');

  let cspHeader = '';
  let cspRequestHeaders: Headers;
  if (!isApi) {
    const cspResult = addCspHeaders(request);
    cspHeader = cspResult.cspHeader;
    cspRequestHeaders = cspResult.headers;
  } else {
    cspRequestHeaders = request.headers;
  }

  const isProd = process.env.NODE_ENV === 'production' && process.env.SKIP_RATE_LIMIT !== 'true';
  if (isProd) {
    const isCredentialPath =
      pathname === '/login' ||
      pathname.startsWith('/login/') ||
      CREDENTIAL_RATE_LIMIT_PATHS.some(
        path => pathname === path || pathname.startsWith(path + '/')
      );
    const isSsePath = pathname.includes('/sse');

    let rateLimitConfig: RateLimitConfig | null = null;
    if (isCredentialPath) {
      rateLimitConfig = RATE_LIMIT_CONFIGS.LOGIN;
    } else if (isSsePath) {
      rateLimitConfig = RATE_LIMIT_CONFIGS.SSE;
    } else if (isApi) {
      if (request.method === 'GET' || request.method === 'OPTIONS') {
        rateLimitConfig = RATE_LIMIT_CONFIGS.API_GENERAL;
      } else {
        rateLimitConfig = RATE_LIMIT_CONFIGS.API_SENSITIVE;
      }
    }

    if (rateLimitConfig) {
      const result = await checkRateLimit(request, rateLimitConfig);
      if (result && !result.allowed) {
        const response = NextResponse.json(
          {
            success: false,
            message: 'Demasiadas solicitudes. Intenta de nuevo más tarde.',
            code: 'RATE_LIMIT_EXCEEDED'
          },
          {
            status: 429,
            headers: {
              'Retry-After': String(result.retryAfter ?? 60),
              'RateLimit-Limit': String(result.limit),
              'RateLimit-Remaining': '0',
              'RateLimit-Reset': String(result.reset ?? Math.ceil(Date.now() / 1000) + 60)
            }
          }
        );
        return response;
      }
    }
  }

  if (isApi && request.method === 'OPTIONS') {
    const response = new NextResponse(null, { status: 200 });
    response.headers.set('Access-Control-Allow-Origin', getCorsOrigin(origin));
    response.headers.set('Access-Control-Allow-Credentials', 'true');
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
    response.headers.set(
      'Access-Control-Allow-Headers',
      'Content-Type, Authorization, Cache-Control, Last-Event-ID, X-Requested-With, X-CSRF-TOKEN, X-Refresh-Token, X-Idempotency-Key'
    );
    response.headers.set('Access-Control-Max-Age', '86400');
    return response;
  }

  const tokenFromCookie = request.cookies.get('token')?.value;
  const tokenFromHeader = request.headers.get('authorization')?.replace('Bearer ', '');
  let newAccessToken: string | null = null;

  const addApiHeaders = (res: NextResponse, includeCsp = true) => {
    if (isApi) {
      res.headers.set('Access-Control-Allow-Origin', getCorsOrigin(origin));
      res.headers.set('Access-Control-Allow-Credentials', 'true');
      res.headers.set('Vary', 'Origin');
      res.headers.set('X-Content-Type-Options', 'nosniff');
      res.headers.set('X-Frame-Options', 'DENY');
      res.headers.set('X-XSS-Protection', '1; mode=block');
      res.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
      res.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
      res.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    }
    if (includeCsp && cspHeader) {
      res.headers.set('Content-Security-Policy', cspHeader);
    }
    if (tokenFromHeader && !tokenFromCookie) {
      res.cookies.set('token', tokenFromHeader, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        path: '/',
        maxAge: 15 * 60
      });
    }
    if (newAccessToken) {
      res.cookies.set('token', newAccessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        path: '/',
        maxAge: 15 * 60
      });
    }
    return res;
  };

  if (isPublicPath(pathname)) {
    const response = NextResponse.next({
      request: {
        headers: cspRequestHeaders
      }
    });
    if (cspHeader) {
      response.headers.set('Content-Security-Policy', cspHeader);
    }
    return addApiHeaders(response);
  }

  const isKioskDeviceApi = KIOSK_DEVICE_APIS.some((path: string) => {
    return pathname === path || pathname.startsWith(path + '/');
  });

  if (isKioskDeviceApi) {
    return addApiHeaders(
      NextResponse.next({
        request: {
          headers: cspRequestHeaders
        }
      })
    );
  }

  if (isApi && ['POST', 'PUT', 'DELETE', 'PATCH'].includes(request.method)) {
    const requestOrigin = request.headers.get('origin');
    if (requestOrigin && !isOriginAllowed(requestOrigin)) {
      const response = NextResponse.json(
        { success: false, message: 'Origen no permitido', code: 'CSRF_REJECTED' },
        { status: 403 }
      );
      addApiHeaders(response);
      return response;
    }
  }

  // Una app con Bearer puede compartir origen con otra sesión del dashboard.
  // Su credencial explícita debe prevalecer sobre las cookies del navegador.
  let token = tokenFromHeader || tokenFromCookie;
  let payload: any = null;

  if (token) {
    payload = await verifyToken(token);
  }

  if (!payload && !tokenFromHeader) {
    const refreshToken = request.cookies.get('refresh_token')?.value;
    if (refreshToken) {
      const refreshPayload = await verifyRefreshToken(refreshToken);
      if (refreshPayload) {
        const newToken = await generateAccessTokenFromPayload(refreshPayload);
        newAccessToken = newToken;
        token = newToken;
        payload = refreshPayload;
        const newCookieValue = `token=${newAccessToken}`;
        const cookieHeaders = new Headers(cspRequestHeaders);
        const existingCookieStr = cookieHeaders.get('cookie') || '';
        const cleanedCookieStr = existingCookieStr
          .split(';')
          .map(c => c.trim())
          .filter(c => !c.startsWith('token='))
          .join('; ');
        cookieHeaders.set(
          'cookie',
          cleanedCookieStr ? `${cleanedCookieStr}; ${newCookieValue}` : newCookieValue
        );
        cspRequestHeaders = cookieHeaders;
      }
    }
  }

  if (!token || !payload) {
    if (pathname.startsWith('/api/')) {
      return addApiHeaders(
        NextResponse.json(
          { success: false, message: 'No autenticado', code: 'NO_TOKEN' },
          { status: 401 }
        )
      );
    }
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  const userRole = (payload.role as string)?.toLowerCase();
  const userId = payload.id as number;

  if (userRole === 'administrador') {
    return addApiHeaders(
      NextResponse.next({
        request: {
          headers: cspRequestHeaders
        }
      })
    );
  }

  if (!pathname.startsWith('/api/')) {
    const requiredPermission = findRoutePermission(pathname);

    if (requiredPermission && !isAnySessionRoute(requiredPermission)) {
      const { module, action } = requiredPermission;
      const hasPermission = await localCheckUserPermission(userId, module, action);

      if (!hasPermission) {
        return NextResponse.redirect(new URL(accessDeniedPath(module, action), request.url));
      }
    }
  }

  if (pathname.startsWith('/api/')) {
    const isAuthenticatedOnlyApi = AUTHENTICATED_ONLY_APIS.some(apiPath => {
      return pathname === apiPath || pathname.startsWith(apiPath + '/');
    });

    const isUsersApi = pathname === '/api/users';
    const isOwnPermissionsApi = /^\/api\/users\/\d+\/permissions$/.test(pathname);

    if (isAuthenticatedOnlyApi || isUsersApi || isOwnPermissionsApi) {
      return addApiHeaders(
        NextResponse.next({
          request: {
            headers: cspRequestHeaders
          }
        })
      );
    }

    const requiredPermission = findRoutePermission(pathname, API_ROUTE_PERMISSIONS);

    if (requiredPermission) {
      const { module, action } = requiredPermission;
      const requiredAction = httpActionForMethod(request.method, action);

      const hasPermission = await localCheckUserPermission(userId, module, requiredAction);

      if (!hasPermission) {
        return addApiHeaders(
          NextResponse.json(
            {
              success: false,
              message: 'No tienes permisos para esta acción',
              code: 'INSUFFICIENT_PERMISSIONS'
            },
            { status: 403 }
          )
        );
      }
    }
  }

  return addApiHeaders(
    NextResponse.next({
      request: {
        headers: cspRequestHeaders
      }
    })
  );
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|_next/webpack-hmr|favicon.ico|public).*)']
};
