import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from 'jose';

// Rutas públicas que no requieren autenticación
const PUBLIC_PATHS = [
  "/",
  "/landing",
  "/login",
  "/terminos-y-condiciones",
  "/politica-de-privacidad",
  "/confirmar-anulacion",
  "/confirmar-anulacion-servicio",
  "/api/auth/login",
  "/api/login",
  "/api/auth/me",
  "/api/logout",
  "/api/auth/check",
  "/api/auth/check-session",
  "/api/auth/check-permission",
  "/api/auth/register-first-user",
  "/api/health",
  "/api/reviews/create",
  "/api/whatsapp/webhook",
  "/api/notifications/pending",
  "/api/notifications/sse",
  "/api/notifications/pending-count",
  "/api/timers/active",
  "/api/codigo/actual",
  "/api/swagger",
  "/api-docs",
  "/api/docs",
  "/_next",
  "/favicon.ico",
  "/img",
  "/fonts",
  "/manifest.json",
  "/robots.txt",
  "/sitemap.xml",
  "/swagger.json",
  "/access-denied",
];

// APIs que requieren autenticación pero no verificación de permisos específicos
// (accesibles para todos los usuarios autenticados)
const AUTHENTICATED_ONLY_APIS = [
  "/api/users/user", // Datos del usuario actual
  "/api/users", // Lista de usuarios (permisos verificados en frontend)
  "/api/asistencias/user", // Asistencias del usuario
  "/api/anticipos/user", // Anticipos del usuario
  "/api/tips/user", // Propinas del usuario
  "/api/overtime/user", // Horas extras del usuario
  "/api/orders/user", // Pedidos del usuario
  "/api/commissions/user", // Comisiones del usuario
  "/api/stats/logged-users", // Estadísticas de usuarios logueados
  "/api/anfitrionas", // Lista de anfitrionas (necesario para pedidos)
  "/api/garzones", // Lista de garzones
  "/api/habitaciones", // Lista de habitaciones (necesario para servicios)
  "/api/products", // Lista de productos (necesario para pedidos)
  "/api/categories", // Lista de categorías (necesario para pedidos)
  "/api/clients", // Lista de clientes (necesario para pedidos/servicios)
  "/api/rooms", // Lista de habitaciones
  "/api/servicios", // Servicios
];

// Mapeo de rutas a módulos y acciones requeridas
const routePermissions: Record<string, { module: string; action: string }> = {
  '/dashboard': { module: 'dashboard', action: 'view' },
  '/users': { module: 'usuarios', action: 'listar' },
  '/clients': { module: 'clientes', action: 'listar' },
  '/categories': { module: 'categorias', action: 'listar' },
  '/orders': { module: 'pedidos', action: 'listar' },
  '/sales': { module: 'ventas', action: 'listar' },
  '/reports': { module: 'reportes', action: 'listar' },
  '/roles': { module: 'roles', action: 'listar' },
  '/attendance': { module: 'asistencias', action: 'listar' },
  '/overtime': { module: 'horas_extras', action: 'listar' },
  '/cash-register': { module: 'caja', action: 'listar' },
  '/accounts': { module: 'cuentas', action: 'listar' },
  '/tips': { module: 'propinas', action: 'listar' },
  '/commissions': { module: 'comisiones', action: 'listar' },
  '/payroll': { module: 'payroll', action: 'listar' },
  '/payroll/calendar': { module: 'detalle_planilla', action: 'listar' },
  '/advances': { module: 'anticipos', action: 'listar' },
  '/returns': { module: 'devoluciones', action: 'listar' },
  '/rooms': { module: 'habitaciones', action: 'listar' },
  '/private-rooms': { module: 'privados', action: 'listar' },
  '/settings': { module: 'configuraciones', action: 'listar' },
  // Rutas de dashboard - accesibles para todos los usuarios autenticados
  '/garzon-dashboard': { module: 'dashboard', action: 'view' },
  '/garzon-calendar': { module: 'dashboard', action: 'view' },
  '/garzon-asistencias': { module: 'dashboard', action: 'view' },
  '/garzon-anticipos': { module: 'dashboard', action: 'view' },
  '/garzon-propinas': { module: 'dashboard', action: 'view' },
  '/garzon-horas-extras': { module: 'dashboard', action: 'view' },
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
  '/cajero-horas-extras': { module: 'dashboard', action: 'view' }
};

// Mapeo de rutas API a módulos y acciones
const apiRoutePermissions: Record<string, { module: string; action: string }> = {
  '/api/users': { module: 'usuarios', action: 'listar' },
  '/api/clients': { module: 'clientes', action: 'listar' },
  '/api/products': { module: 'productos', action: 'listar' },
  '/api/categories': { module: 'categorias', action: 'listar' },
  '/api/orders': { module: 'pedidos', action: 'listar' },
  '/api/sales': { module: 'ventas', action: 'listar' },
  '/api/roles': { module: 'roles', action: 'listar' },
  '/api/asistencias': { module: 'asistencias', action: 'listar' },
  '/api/overtime': { module: 'horas_extras', action: 'listar' },
  '/api/cashregister': { module: 'caja', action: 'listar' },
  '/api/cuentas': { module: 'cuentas', action: 'listar' },
  '/api/tips': { module: 'propinas', action: 'listar' },
  '/api/commissions': { module: 'comisiones', action: 'listar' },
  '/api/payroll': { module: 'payroll', action: 'listar' },
  '/api/anticipos': { module: 'anticipos', action: 'listar' },
  '/api/rooms': { module: 'habitaciones', action: 'listar' },
  '/api/servicios': { module: 'privados', action: 'listar' },
  '/api/reports': { module: 'reportes', action: 'listar' }
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

async function checkUserPermission(userId: number, module: string, action: string): Promise<boolean> {
  try {
    console.log('[checkUserPermission] Verificando:', { userId, module, action });
    
    const mysql = await import('mysql2/promise');
    
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'lasmunecasderamon',
      port: parseInt(process.env.DB_PORT || '3306')
    });

    try {
      const [userRows] = await connection.execute(
        'SELECT rol_id FROM usuarios WHERE id_usuario = ?',
        [userId]
      ) as any[];

      console.log('[checkUserPermission] Usuario encontrado:', userRows[0]);

      if (!userRows || userRows.length === 0) {
        console.log('[checkUserPermission] ❌ Usuario no encontrado');
        return false;
      }

      const roleId = userRows[0].rol_id;

      const [permissionRows] = await connection.execute(
        `SELECT COUNT(*) as has_permission 
         FROM role_permissions rp
         INNER JOIN permissions p ON rp.permission_id = p.id
         WHERE rp.role_id = ? AND p.module = ? AND p.action = ?`,
        [roleId, module, action]
      ) as any[];

      const hasPermission = permissionRows[0]?.has_permission > 0;
      
      console.log('[checkUserPermission] Resultado:', {
        roleId,
        module,
        action,
        hasPermission,
        count: permissionRows[0]?.has_permission
      });

      return hasPermission;
    } finally {
      await connection.end();
    }
  } catch (error) {
    console.error('[checkUserPermission] Error:', error);
    return false;
  }
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const searchParams = request.nextUrl.searchParams;

  // 1. Configurar CORS global para todas las rutas API
  if (pathname.startsWith('/api/')) {
    const response = NextResponse.next();
    
    response.headers.set('Access-Control-Allow-Origin', '*');
    response.headers.set('Vary', 'Origin');
    response.headers.set('Access-Control-Allow-Credentials', 'true');
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, X-CSRF-TOKEN');
    response.headers.set('Access-Control-Max-Age', '86400');
    
    if (request.method === 'OPTIONS') {
      return new NextResponse(null, { status: 200, headers: response.headers });
    }
  }

  // 2. Permitir acceso a rutas públicas
  if (PUBLIC_PATHS.some((path: string) => pathname.startsWith(path))) {
    const token = request.cookies.get("token");
    
    if (pathname === "/login" && token) {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
    
    return NextResponse.next();
  }

  // 3. Obtener y verificar token
  const token = request.cookies.get('token')?.value || 
                request.headers.get('authorization')?.replace('Bearer ', '');

  if (!token) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json(
        { success: false, message: 'No autenticado', code: 'NO_TOKEN' },
        { status: 401 }
      );
    }
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // 4. Verificar token JWT
  const payload = await verifyToken(token);
  if (!payload) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json(
        { success: false, message: 'Token inválido', code: 'INVALID_TOKEN' },
        { status: 401 }
      );
    }
    return NextResponse.redirect(new URL('/login', request.url));
  }

  const userRole = (payload.role as string)?.toLowerCase();
  const userId = payload.id as number;

  // 5. Administrador tiene acceso a todo
  if (userRole === 'administrador') {
    return NextResponse.next();
  }

  // 6. Verificar permisos para rutas de páginas
  if (!pathname.startsWith('/api/')) {
    const requiredPermission = Object.entries(routePermissions).find(([route]) => 
      pathname === route || pathname.startsWith(route + '/')
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
        console.log('[Middleware] ✅ Dashboard - acceso permitido para usuario autenticado');
        return NextResponse.next();
      }
      
      const hasPermission = await checkUserPermission(userId, module, action);
      
      console.log('[Middleware] 📊 Resultado verificación:', {
        hasPermission,
        module,
        action,
        userId,
        willRedirect: !hasPermission
      });
      
      if (!hasPermission) {
        console.log('[Middleware] ❌ Acceso denegado - redirigiendo a /access-denied');
        return NextResponse.redirect(new URL('/access-denied', request.url));
      }
      
      console.log('[Middleware] ✅ Acceso permitido - continuando a la página');
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
    
    if (isAuthenticatedOnlyApi || isUsersApi) {
      // Solo requiere autenticación, no permisos específicos
      return NextResponse.next();
    }
    
    const requiredPermission = Object.entries(apiRoutePermissions).find(([route]) => 
      pathname.startsWith(route)
    );

    if (requiredPermission) {
      const [, { module, action }] = requiredPermission;
      
      let requiredAction = action;
      if (request.method === 'POST') requiredAction = 'crear';
      else if (request.method === 'PUT' || request.method === 'PATCH') requiredAction = 'editar';
      else if (request.method === 'DELETE') requiredAction = 'eliminar';
      
      const hasPermission = await checkUserPermission(userId, module, requiredAction);
      
      if (!hasPermission) {
        return NextResponse.json(
          { success: false, message: 'No tienes permisos para esta acción', code: 'INSUFFICIENT_PERMISSIONS' },
          { status: 403 }
        );
      }
    }
  }

  return NextResponse.next();
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
    '/((?!_next/static|_next/image|favicon.ico|public).*)',
  ],
};
