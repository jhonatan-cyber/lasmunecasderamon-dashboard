import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

// Rutas públicas que no requieren autenticación
const PUBLIC_PATHS = [
  '/',
  '/landing',
  '/login',
  '/terminos-y-condiciones',
  '/politica-de-privacidad',
  '/confirmar-anulacion',
  '/confirmar-anulacion-servicio',
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
  '/api/notifications/pending',
  '/api/notifications/sse',
  '/api/notifications/pending-count',
  '/api/timers/active',
  '/api/codigo/actual',
  '/api/swagger',
  '/api-docs',
  '/api/docs',
  '/api/permissions/setup',
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

// APIs que requieren autenticación pero no verificación de permisos específicos
// (accesibles para todos los usuarios autenticados)
const AUTHENTICATED_ONLY_APIS = [
  '/api/users/user', // Datos del usuario actual
  '/api/users', // Lista de usuarios (permisos verificados en frontend)
  '/api/asistencias/user', // Asistencias del usuario
  '/api/anticipos/user', // Anticipos del usuario
  '/api/tips', // Propinas (necesario para ventas/pedidos)
  '/api/overtime/user', // Horas extras del usuario
  '/api/orders/user', // Pedidos del usuario
  '/api/commissions/user', // Comisiones del usuario
  '/api/stats/logged-users', // Estadísticas de usuarios logueados
  '/api/anfitrionas', // Lista de anfitrionas (necesario para pedidos)
  '/api/garzones', // Lista de garzones
  '/api/habitaciones', // Lista de habitaciones (necesario para servicios)
  '/api/products', // Lista de productos (necesario para pedidos)
  '/api/categories', // Lista de categorías (necesario para pedidos)
  '/api/clients', // Lista de clientes (necesario para pedidos/servicios)
  '/api/rooms', // Lista de habitaciones
  '/api/servicios', // Servicios
  '/api/sales', // Ventas
  '/api/cashregister/status', // Estado de caja abierta (necesario para usar módulos)
  '/api/cashregister' // Permitir operaciones de caja y delegar validación a la ruta
];

// Mapeo de rutas a módulos y acciones requeridas
// IMPORTANTE: Los nombres de módulos y acciones deben coincidir con la tabla 'permissions' en la BD
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
  '/cash-register': { module: 'cash_register', action: 'view' },
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
  // Rutas de dashboard - accesibles para todos los usuarios autenticados
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

// Mapeo de rutas API a módulos y acciones
// IMPORTANTE: Los nombres de módulos y acciones deben coincidir con la tabla 'permissions' en la BD
const apiRoutePermissions: Record<string, { module: string; action: string }> = {
  '/api/users': { module: 'users', action: 'view' },
  '/api/clients': { module: 'clients', action: 'view' },
  '/api/products': { module: 'products', action: 'view' },
  '/api/categories': { module: 'categories', action: 'view' },
  '/api/orders': { module: 'orders', action: 'view' },
  '/api/sales': { module: 'sales', action: 'view' },
  '/api/roles': { module: 'roles', action: 'view' },
  '/api/asistencias': { module: 'attendance', action: 'view' },
  '/api/overtime': { module: 'overtime', action: 'view' },
  '/api/cashregister': { module: 'cash_register', action: 'view' },
  '/api/cuentas': { module: 'accounts', action: 'view' },
  '/api/tips': { module: 'tips', action: 'view' },
  '/api/commissions': { module: 'commissions', action: 'view' },
  '/api/payroll': { module: 'payroll', action: 'view' },
  '/api/anticipos': { module: 'advances', action: 'view' },
  '/api/rooms': { module: 'rooms', action: 'view' },
  '/api/servicios': { module: 'private_rooms', action: 'view' },
  '/api/reports': { module: 'reports', action: 'view' }
};

async function verifyToken(token: string) {
  try {
    const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'default_secret');
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
    // Usar fetch para llamar a la API interna (Edge Runtime no soporta mysql2)
    const host = request.headers.get('x-forwarded-host') || request.headers.get('host');
    const protocol = request.headers.get('x-forwarded-proto') || request.nextUrl.protocol.replace(':', '');
    const baseUrl = host ? `${protocol}://${host}` : request.nextUrl.origin;

    const response = await fetch(`${baseUrl}/api/auth/check-permission`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ userId, module, action })
    });

    if (!response.ok) {
      console.error(`[checkUserPermission] API error: ${response.status}`);
      return false;
    }

    const result = await response.json();
    console.log(
      `[checkUserPermission] 🔐 ${module}.${action} para userId ${userId}: ${result.hasPermission ? '✅' : '❌'}`
    );
    if (!result.hasPermission) {
      console.warn(`[checkUserPermission] 🚫 Acceso DENEGADO para userId ${userId} en ${module}.${action}`);
    }
    return result.hasPermission === true;
  } catch (error) {
    console.error('[checkUserPermission] Error:', error);
    return false;
  }
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const searchParams = request.nextUrl.searchParams;

  // 1. Manejo de CORS
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
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, X-CSRF-TOKEN');
    response.headers.set('Access-Control-Max-Age', '86400');
    return response;
  }

  // Función auxiliar para añadir headers a cualquier respuesta de API
  const addApiHeaders = (res: NextResponse) => {
    if (isApi) {
      if (origin) {
        res.headers.set('Access-Control-Allow-Origin', origin);
      } else {
        res.headers.set('Access-Control-Allow-Origin', '*');
      }
      res.headers.set('Access-Control-Allow-Credentials', 'true');
      res.headers.set('Vary', 'Origin');
    }
    return res;
  };


  // 2. Permitir acceso a rutas públicas
  const isPublicPath = PUBLIC_PATHS.some((path: string) => {
    if (path === '/') return pathname === '/';
    if (path === '/_next' || path === '/img' || path === '/fonts') {
      return pathname.startsWith(path);
    }
    return pathname === path || pathname.startsWith(path + '/');
  });

  if (isPublicPath) {
    return addApiHeaders(NextResponse.next());
  }

  // 3. Obtener y verificar token
  const token =
    request.cookies.get('token')?.value ||
    request.headers.get('authorization')?.replace('Bearer ', '');

  if (!token) {
    if (pathname.startsWith('/api/')) {
      return addApiHeaders(NextResponse.json(
        { success: false, message: 'No autenticado', code: 'NO_TOKEN' },
        { status: 401 }
      ));
    }
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // 4. Verificar token JWT
  const payload = await verifyToken(token);
  if (!payload) {
    if (pathname.startsWith('/api/')) {
      return addApiHeaders(NextResponse.json(
        { success: false, message: 'Token inválido', code: 'INVALID_TOKEN' },
        { status: 401 }
      ));
    }
    return NextResponse.redirect(new URL('/login', request.url));
  }

  const userRole = (payload.role as string)?.toLowerCase();
  const userId = payload.id as number;

  // 5. Administrador tiene acceso a todo
  if (userRole === 'administrador') {
    return addApiHeaders(NextResponse.next());
  }

  // 6. Verificar permisos para rutas de páginas
  if (!pathname.startsWith('/api/')) {
    const requiredPermission = Object.entries(routePermissions).find(
      ([route]) => pathname === route || pathname.startsWith(route + '/')
    );

    if (requiredPermission) {
      const [, { module, action }] = requiredPermission;

      console.log('[Middleware] 🔍 Verificando ruta:', {
        pathname,
        module,
        action,
        userId,
        userRole
      });

      // El dashboard es accesible para todos los usuarios autenticados
      if (module === 'dashboard') {
        return addApiHeaders(NextResponse.next());
      }

      const hasPermission = await checkUserPermission(userId, module, action, request);

      if (!hasPermission) {
        return NextResponse.redirect(new URL(`/access-denied?module=${module}&action=${action}`, request.url));
      }
    }
  }

  // 7. Verificar permisos para rutas de API
  if (pathname.startsWith('/api/')) {
    // Verificar si la API está en la lista de APIs que solo requieren autenticación
    // Considerar tanto la ruta exacta como la ruta base (sin query params)
    const isAuthenticatedOnlyApi = AUTHENTICATED_ONLY_APIS.some(apiPath => {
      // Verificar coincidencia exacta o si la ruta comienza con el path
      return pathname === apiPath || pathname.startsWith(apiPath + '/');
    });

    // También permitir /api/users con cualquier query parameter (para anfitrionas, garzones, etc.)
    // pathname nunca incluye query params, así que solo verificamos la ruta base
    const isUsersApi = pathname === '/api/users';

    // Permitir obtener los propios permisos del usuario
    const isOwnPermissionsApi = /^\/api\/users\/\d+\/permissions$/.test(pathname);

    if (isAuthenticatedOnlyApi || isUsersApi || isOwnPermissionsApi) {
      // Solo requiere autenticación, no permisos específicos
      return addApiHeaders(NextResponse.next());
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
        return addApiHeaders(NextResponse.json(
          {
            success: false,
            message: 'No tienes permisos para esta acción',
            code: 'INSUFFICIENT_PERMISSIONS'
          },
          { status: 403 }
        ));
      }
    }
  }

  return addApiHeaders(NextResponse.next());
}

export { proxy as middleware };

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files
     */
    '/((?!_next/static|_next/image|favicon.ico|public).*)'
  ]
};
