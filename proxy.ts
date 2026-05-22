import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';
import { logger } from '@/lib/utils/logger';
import { env } from '@/lib/utils/env';

// CSP Nonce middleware
function addCspHeaders(request: NextRequest): {
  nonce: string;
  cspHeader: string;
  headers: Headers;
} {
  const nonce = Buffer.from(crypto.randomUUID()).toString('base64');
  const isDev = process.env.NODE_ENV === 'development';

  // React dev mode requires 'unsafe-eval' for call stack reconstruction.
  // Never included in production.
  const scriptSrc = isDev
    ? `'self' 'nonce-${nonce}' 'strict-dynamic' 'unsafe-eval'`
    : `'self' 'nonce-${nonce}' 'strict-dynamic'`;

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
  `
    .replace(/\s{2,}/g, ' ')
    .trim();

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-nonce', nonce);

  return { nonce, cspHeader, headers: requestHeaders };
}

const PUBLIC_PATHS = [
  '/',
  '/landing',
  '/login',
  '/terminos-y-condiciones',
  '/politica-de-privacidad',
  '/confirmar-anulacion',
  '/confirmar-anulacion-servicio',
  '/confirmar-anulacion-cuenta',
  '/confirmar-anticipo',
  '/confirmar-anticipo',
  '/api/auth/login',
  '/api/auth/reset-password',
  '/api/login',
  '/api/auth/me',
  '/api/logout',
  '/api/auth/check',
  '/api/auth/check-session',
  '/api/auth/check-users',
  '/api/auth/check-permission',
  '/api/auth/register-first-user',
  '/api/test-auth',
  '/api/health',
  '/api/reviews/create',
  '/api/whatsapp/webhook',
  '/api/ventas/solicitud-anulacion',
  '/api/ventas/procesar-anulacion',
  '/api/servicios/solicitud-anulacion',
  '/api/servicios/procesar-anulacion',
  '/api/cuentas/solicitud-anulacion',
  '/api/cuentas/procesar-anulacion',
  '/api/notifications/pending',
  '/api/notifications/sse',
  '/api/notifications/pending-count',
  '/api/timers/active',
  '/api/anticipos/solicitud-detalles',
  '/api/anticipos/aprobar',
  '/api/swagger',
  '/api-docs',
  '/api/docs',
  '/api/permissions/setup-cajero',
  '/api/permissions/setup-roles',
  '/api/permissions/debug',
  '/api/permissions/test-cajero',
  '/api/permissions/verify',
  '/api/roles/setup',
  '/_next',
  '/favicon.ico',
  '/img',
  '/fonts',
  '/manifest.json',
  '/robots.txt',
  '/sitemap.xml',
  '/swagger.json',
  '/access-denied'
];

const AUTHENTICATED_ONLY_APIS = [
  '/api/codigo',
  '/api/users/user',
  '/api/users',
  // Attendance — acceso por autenticacion, sin verificacion de permisos extra
  '/api/attendance',
  '/api/attendance-stats',
  // Anticipos — acceso por autenticacion, sin verificacion de permisos extra
  '/api/anticipos',
  // Tips — acceso por autenticacion
  '/api/tips',
  // Overtime — acceso por autenticacion
  '/api/overtime',
  // Pedidos — acceso por autenticacion
  '/api/orders',
  // Comisiones — acceso por autenticacion
  '/api/commissions',
  // Servicios — acceso por autenticacion
  '/api/servicios',
  // Ventas — acceso por autenticacion
  '/api/sales',
  // Caja — acceso por autenticacion
  '/api/cashregister',
  '/api/caja',
  // Cuentas — acceso por autenticacion
  '/api/cuentas',
  // Gratificaciones — acceso por autenticacion
  '/api/gratificaciones',
  // Otros endpoints de empleados
  '/api/stats/logged-users',
  '/api/anfitrionas',
  '/api/garzones',
  '/api/habitaciones',
  '/api/products',
  '/api/categories',
  '/api/clients',
  '/api/rooms'
];

const routePermissions: Record<string, { module: string; action: string }> = {
  '/dashboard': { module: 'dashboard', action: 'view' },
  '/users': { module: 'users', action: 'view' },
  '/clients': { module: 'clients', action: 'view' },
  '/products': { module: 'products', action: 'view' },
  '/categories': { module: 'categories', action: 'view' },
  '/orders': { module: 'orders', action: 'view' },
  '/sales': { module: 'sales', action: 'view' },
  '/reports': { module: 'reports', action: 'view' },
  '/roles': { module: 'roles', action: 'view' },
  '/attendance': { module: 'attendance', action: 'view' },
  '/overtime': { module: 'overtime', action: 'view' },
  '/gratificaciones': { module: 'gratificaciones', action: 'view' },
  '/cash-register': { module: 'finances', action: 'view' },
  '/accounts': { module: 'accounts', action: 'view' },
  '/tips': { module: 'tips', action: 'view' },
  '/commissions': { module: 'commissions', action: 'view' },
  '/payroll': { module: 'payroll', action: 'view' },
  '/payroll/calendar': { module: 'payroll_details', action: 'view' },
  '/advances': { module: 'advances', action: 'view' },
  '/returns': { module: 'returns', action: 'view' },
  '/rooms': { module: 'rooms', action: 'view' },
  '/private-rooms': { module: 'private_rooms', action: 'view' },
  '/settings': { module: 'settings', action: 'view' },
  '/garzon-dashboard': { module: 'dashboard', action: 'view' },
  '/garzon-calendar': { module: 'dashboard', action: 'view' },
  '/garzon-asistencias': { module: 'dashboard', action: 'view' },
  '/garzon-anticipos': { module: 'dashboard', action: 'view' },
  '/garzon-propinas': { module: 'dashboard', action: 'view' },
  '/garzon-horas-extras': { module: 'overtime', action: 'view' },
  '/garzon-pedidos': { module: 'dashboard', action: 'view' },
  '/anfitriona-dashboard': { module: 'dashboard', action: 'view' },
  '/anfitriona-calendar': { module: 'dashboard', action: 'view' },
  '/anfitriona-asistencias': { module: 'dashboard', action: 'view' },
  '/anfitriona-anticipos': { module: 'dashboard', action: 'view' },
  '/anfitriona-comisiones': { module: 'dashboard', action: 'view' },
  '/anfitriona-servicios': { module: 'dashboard', action: 'view' },
  '/cajero-calendar': { module: 'dashboard', action: 'view' },
  '/cajero-asistencias': { module: 'dashboard', action: 'view' },
  '/cajero-anticipos': { module: 'dashboard', action: 'view' },
  '/cajero-propinas': { module: 'dashboard', action: 'view' },
  '/cajero-horas-extras': { module: 'overtime', action: 'view' }
};

// Solo rutas de administracion que requieren verificacion de permisos explicita.
// Los endpoints de empleados (anticipos, attendance, comisiones, servicios, etc.)
// estan en AUTHENTICATED_ONLY_APIS — solo requieren token valido.
const apiRoutePermissions: Record<string, { module: string; action: string }> = {
  '/api/roles': { module: 'roles', action: 'view' },
  '/api/gratificaciones': { module: 'gratificaciones', action: 'view' },
  '/api/payroll': { module: 'payroll', action: 'view' },
  '/api/reports': { module: 'reports', action: 'view' }
};

async function verifyToken(token: string) {
  try {
    const secret = new TextEncoder().encode(env.JWT_SECRET);
    const { payload } = await jwtVerify(token, secret);
    return payload;
  } catch (error) {
    return null;
  }
}

async function checkUserPermission(
  userId: number,
  module: string,
  action: string,
  request: NextRequest
): Promise<boolean> {
  try {
    const host = request.headers.get('x-forwarded-host') || request.headers.get('host');
    const protocol =
      request.headers.get('x-forwarded-proto') || request.nextUrl.protocol.replace(':', '');
    const baseUrl = host ? `${protocol}://${host}` : request.nextUrl.origin;

    const response = await fetch(`${baseUrl}/api/auth/check-permission`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ userId, module, action })
    });

    if (!response.ok) {
      return false;
    }

    const result = await response.json();
    return result.hasPermission === true;
  } catch (error) {
    return false;
  }
}

export default async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const forwarded = request.headers.get('x-forwarded-for');
  const ip = forwarded ? forwarded.split(',')[0] : 'unknown';

  // Add CSP nonce to request headers
  const { nonce, cspHeader, headers: cspRequestHeaders } = addCspHeaders(request);

  const origin = request.headers.get('origin');
  const isApi = pathname.startsWith('/api/');

  if (isApi && request.method === 'OPTIONS') {
    const response = new NextResponse(null, { status: 200 });
    if (origin) {
      response.headers.set('Access-Control-Allow-Origin', origin);
    } else {
      response.headers.set('Access-Control-Allow-Origin', '*');
    }
    response.headers.set('Access-Control-Allow-Credentials', 'true');
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
    response.headers.set(
      'Access-Control-Allow-Headers',
      'Content-Type, Authorization, X-Requested-With, X-CSRF-TOKEN'
    );
    response.headers.set('Access-Control-Max-Age', '86400');
    return response;
  }

  const addApiHeaders = (res: NextResponse, includeCsp = true) => {
    if (isApi) {
      if (origin) {
        res.headers.set('Access-Control-Allow-Origin', origin);
      } else {
        res.headers.set('Access-Control-Allow-Origin', '*');
      }
      res.headers.set('Access-Control-Allow-Credentials', 'true');
      res.headers.set('Vary', 'Origin');
    }
    if (includeCsp) {
      res.headers.set('Content-Security-Policy', cspHeader);
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
    response.headers.set('Content-Security-Policy', cspHeader);
    return response;
  }

  const token =
    request.cookies.get('token')?.value ||
    request.headers.get('authorization')?.replace('Bearer ', '');

  if (!token) {
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

  const payload = await verifyToken(token);
  if (!payload) {
    if (pathname.startsWith('/api/')) {
      return addApiHeaders(
        NextResponse.json(
          { success: false, message: 'Token inválido', code: 'INVALID_TOKEN' },
          { status: 401 }
        )
      );
    }
    return NextResponse.redirect(new URL('/login', request.url));
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

      const hasPermission = await checkUserPermission(userId, module, action, request);

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

      const hasPermission = await checkUserPermission(userId, module, requiredAction, request);

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
  matcher: ['/((?!_next/static|_next/image|favicon.ico|public).*)']
};
