import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify, SignJWT } from 'jose';
import {
  PUBLIC_PATHS,
  KIOSK_DEVICE_APIS,
  AUTHENTICATED_ONLY_APIS,
  routePermissions,
  apiRoutePermissions
} from '@/lib/middleware/proxy-routes';
import { siteConfig } from '@/lib/api/site';
import {
  checkRateLimit,
  RATE_LIMIT_CONFIGS,
  type RateLimitConfig
} from '@/lib/middleware/redisRateLimit';

// Orígenes permitidos para CORS
const ALLOWED_ORIGINS = [
  siteConfig.url, // https://xn--lasmuecasderamon-bub.com
  'http://localhost:3000',
  'http://localhost:8081', // Expo dev
  'https://dashboard.xn--lasmuecasderamon-bub.com',
  // DEV_ALLOWED_ORIGINS: variables de entorno separadas por comas (ej: http://192.168.1.42:3000,http://192.168.1.42:8081)
  ...(process.env.DEV_ALLOWED_ORIGINS
    ? process.env.DEV_ALLOWED_ORIGINS.split(',')
        .map(s => s.trim())
        .filter(Boolean)
    : [])
];

// Warning en desarrollo si no se configuró DEV_ALLOWED_ORIGINS
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

const actionMap: Record<string, string[]> = {
  view: [
    'view',
    'listar_usuarios',
    'listar_clientes',
    'listar_categoria_productos',
    'listar_productos_categoria',
    'listar_categorias',
    'listar_pedidos',
    'listar_reportes',
    'listar_ventas',
    'listar_roles',
    'listar_asistencias',
    'listar_horas_extras',
    'listar_gratificaciones',
    'listar_caja',
    'listar_cuentas',
    'listar_propinas',
    'listar_comisiones',
    'listar_pagos',
    'listar_detalles',
    'listar_anticipos',
    'listar_devoluciones',
    'listar_habitaciones',
    'listar_privados',
    'ver_detalles',
    'ver_dashboard'
  ],
  create: ['create', 'crear', 'agregar_productos'],
  edit: ['edit', 'editar', 'registar_venta', 'registar_cuenta', 'process'],
  delete: ['delete', 'eliminar', 'anular'],
  process: ['process', 'registar_venta', 'registar_cuenta'],
  export: ['export'],
  anulate: ['anulate', 'anular'],
  open: ['open'],
  close: ['close'],
  withdraw: ['withdraw']
};

const moduleAliases: Record<string, string[]> = {
  cash_register: ['cash_register', 'cashregister', 'caja', 'finances'],
  cashregister: ['cash_register', 'cashregister', 'caja', 'finances'],
  caja: ['cash_register', 'cashregister', 'caja', 'finances'],
  finances: ['cash_register', 'cashregister', 'caja', 'finances'],
  accounts: ['accounts', 'cuentas'],
  attendance: ['attendance', 'asistencias'],
  overtime: ['overtime', 'horas_extras'],
  tips: ['tips', 'propinas'],
  commissions: ['commissions', 'comisiones'],
  rooms: ['rooms', 'habitaciones'],
  private_rooms: ['private_rooms', 'privados'],
  categories: ['categories', 'categorias'],
  returns: ['returns', 'devoluciones'],
  gratificaciones: ['gratificaciones'],
  payroll: ['payroll', 'pagos_trabajadores'],
  payroll_details: ['payroll_details'],
  roles: ['roles'],
  users: ['users', 'usuarios'],
  clients: ['clients', 'clientes'],
  products: ['products', 'productos'],
  orders: ['orders', 'pedidos'],
  sales: ['sales', 'ventas'],
  advances: ['advances', 'anticipos'],
  reports: ['reports', 'reportes'],
  settings: ['settings']
};

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
  // ponytail: dynamic import — Edge Runtime can't load pg/node modules statically
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

    const resolvedModules = moduleAliases[module] || [module];
    const resolvedActions = actionMap[action] || [action];

    const placeholdersModules = resolvedModules.map(() => '?').join(',');
    const placeholdersActions = resolvedActions.map(() => '?').join(',');

    const perms = await query<any[]>(
      `SELECT 1 FROM permissions p
       INNER JOIN role_permissions rp ON p.id = rp.permission_id
       WHERE rp.role_id = ?
         AND p.module IN (${placeholdersModules})
         AND p.action IN (${placeholdersActions})
         AND p.deleted_at IS NULL
       LIMIT 1`,
      [String(roleId), ...resolvedModules, ...resolvedActions]
    );

    return perms.length > 0;
  } catch {
    // Edge Runtime: can't load pg — deny by default, API routes will re-check
    return false;
  }
}

export default async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isApi = pathname.startsWith('/api/');
  const forwarded = request.headers.get('x-forwarded-for');
  const ip = forwarded ? forwarded.split(',')[0] : 'unknown';

  const origin = request.headers.get('origin');

  // CSP nonce solo es necesario para páginas HTML, no para APIs JSON
  let cspHeader = '';
  let cspRequestHeaders: Headers;
  if (!isApi) {
    const cspResult = addCspHeaders(request);
    cspHeader = cspResult.cspHeader;
    cspRequestHeaders = cspResult.headers;
  } else {
    cspRequestHeaders = request.headers;
  }

  // ponytail: skip rate limiting in dev
  const isProd = process.env.NODE_ENV === 'production' && process.env.SKIP_RATE_LIMIT !== 'true';
  if (isProd) {
    const isLoginPath =
      pathname === '/login' ||
      pathname.startsWith('/login/') ||
      pathname === '/api/auth/login' ||
      pathname.startsWith('/api/auth/login/');
    const isSsePath = pathname.includes('/sse');

    let rateLimitConfig: RateLimitConfig | null = null;
    if (isLoginPath) {
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
      'Content-Type, Authorization, X-Requested-With, X-CSRF-TOKEN'
    );
    response.headers.set('Access-Control-Max-Age', '86400');
    return response;
  }

  // Extract tokens early so addApiHeaders closure can reference them
  const tokenFromCookie = request.cookies.get('token')?.value;
  const tokenFromHeader = request.headers.get('authorization')?.replace('Bearer ', '');
  // Variable para almacenar un nuevo access token generado desde refresh token
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
    // If token came from Authorization header (not cookie), sync it as a cookie
    // so client-side fetch() calls (which only send cookies, not headers) can authenticate
    if (tokenFromHeader && !tokenFromCookie) {
      res.cookies.set('token', tokenFromHeader, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        path: '/',
        maxAge: 15 * 60
      });
    }
    // Si se renovó el token vía refresh token, setear la nueva cookie
    if (newAccessToken) {
      res.cookies.set('token', newAccessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        path: '/',
        maxAge: 15 * 60 // 15 minutos
      });
    }
    return res;
  };

  const isPublicPath = PUBLIC_PATHS.some((path: string) => {
    if (path === '/') return pathname === '/';
    if (path === '/_next' || path === '/img' || path === '/fonts') {
      return pathname.startsWith(path);
    }
    return pathname === path || pathname.startsWith(path + '/');
  });

  if (isPublicPath) {
    const response = NextResponse.next({
      request: {
        headers: cspRequestHeaders
      }
    });
    if (cspHeader) {
      response.headers.set('Content-Security-Policy', cspHeader);
    }
    return response;
  }

  // ─── Pantalla del local: credencial de dispositivo, no sesión de persona ───────
  // La ruta correspondiente verifica la cookie firmada (no puede hacerlo el middleware
  // porque necesita el secreto del kiosko). Acá solo se deja pasar; si trae una sesión
  // de usuario no cambia nada, porque estas rutas no la aceptan.
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

  // ─── CSRF: validate Origin on state-changing API requests ───────
  // If browser sent Origin and it's not allowed, reject.
  // curl/Postman don't send Origin, so they pass through.
  // Public paths (WhatsApp webhooks, etc.) already returned above.
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

  let token = tokenFromCookie || tokenFromHeader;
  let payload: any = null;

  if (token) {
    payload = await verifyToken(token);
  }

  // ─── Refresh token rotation ─────────────────────────────────
  // Si el access token expiró, intentar renovar silenciosamente
  // usando el refresh token (cookie httpOnly separada).
  if (!payload) {
    const refreshToken = request.cookies.get('refresh_token')?.value;
    if (refreshToken) {
      const refreshPayload = await verifyRefreshToken(refreshToken);
      if (refreshPayload) {
        // Generar nuevo access token desde el refresh payload
        const newToken = await generateAccessTokenFromPayload(refreshPayload);
        newAccessToken = newToken;
        token = newToken;
        payload = refreshPayload;

        // ♻️ Sync refreshed token into request headers so API route handlers
        // (which read cookies from the incoming request) see the valid token
        // instead of the expired one — prevents 401 on /api/auth/me after refresh.
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
    const requiredPermission = Object.entries(routePermissions).find(
      ([route]) => pathname === route || pathname.startsWith(route + '/')
    );

    if (requiredPermission) {
      const [, { module, action }] = requiredPermission;
      if (module === 'dashboard') {
        return addApiHeaders(
          NextResponse.next({
            request: {
              headers: cspRequestHeaders
            }
          })
        );
      }

      const hasPermission = await localCheckUserPermission(userId, module, action);

      if (!hasPermission) {
        return NextResponse.redirect(
          new URL(`/access-denied?module=${module}&action=${action}`, request.url)
        );
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

    const requiredPermission = Object.entries(apiRoutePermissions).find(([route]) =>
      pathname.startsWith(route)
    );

    if (requiredPermission) {
      const [, { module, action }] = requiredPermission;

      let requiredAction = action;
      if (request.method === 'POST') requiredAction = 'create';
      else if (request.method === 'PUT' || request.method === 'PATCH') requiredAction = 'edit';
      else if (request.method === 'DELETE') requiredAction = 'delete';

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
  // ponytail: _next/webpack-hmr excluded so HMR WebSocket is not intercepted
  matcher: ['/((?!_next/static|_next/image|_next/webpack-hmr|favicon.ico|public).*)']
};
