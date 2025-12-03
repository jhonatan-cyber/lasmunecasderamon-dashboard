import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

  // Rutas públicas que no requieren autenticación
  const PUBLIC_PATHS = [
    "/",
    "/landing",
    "/login",
    "/terminos-y-condiciones",
    "/politica-de-privacidad",
    // debug pages removidas
    "/confirmar-anulacion",
    "/confirmar-anulacion-servicio",
    "/api/auth/login",
    "/api/login",
    "/api/auth/me",
    "/api/logout",
    "/api/auth/check",
    "/api/auth/check-session",
    // endpoints de usuario para la app
    "/api/asistencias/user",
    "/api/anticipos/user",
    "/api/commissions/user",
    "/api/servicios/user",
    "/api/tips/user",
    "/api/overtime/user",
    "/api/orders/user",
    // endpoints para pedidos (clientes y anfitrionas)
    "/api/clients",
    "/api/users",
    "/api/anfitrionas",
    // endpoints para categorías
    "/api/categories",
    // endpoints para productos
    "/api/products",
    // endpoints para pedidos/órdenes
    "/api/orders",
    // endpoints de prueba removidos
    "/api/ventas/confirmar-anulacion",
    "/api/ventas/procesar-anulacion",
    "/api/ventas/solicitud-anulacion",
    "/api/servicios/solicitud-anulacion",
    "/api/servicios/procesar-anulacion",
    "/api/notifications/pending",
    "/api/notifications/sse",
    "/api/swagger",
    "/api/health",
    "/api-docs",
    "/api/docs",
    "/_next",
    "/favicon.ico",
    "/img",
    "/fonts",
    "/manifest.json",
    "/robots.txt",
    "/sitemap.xml",
  ];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get("token");

  // Configurar CORS global para todas las rutas API
  if (pathname.startsWith('/api/')) {
    const response = NextResponse.next();
    
    // Headers CORS - Permitir todas las conexiones
    response.headers.set('Access-Control-Allow-Origin', '*');
    
    response.headers.set('Vary', 'Origin');
    response.headers.set('Access-Control-Allow-Credentials', 'true');
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, X-CSRF-TOKEN');
    response.headers.set('Access-Control-Max-Age', '86400');
    
    // Manejar preflight requests
    if (request.method === 'OPTIONS') {
      return new NextResponse(null, { status: 200, headers: response.headers });
    }
    
    return response;
  }

  // Si intenta acceder a /login y ya tiene sesión, redirigir a /dashboard
  if (pathname === "/login" && token) {
    const dashboardUrl = request.nextUrl.clone();
    dashboardUrl.pathname = "/dashboard";
    dashboardUrl.search = "";
    return NextResponse.redirect(dashboardUrl);
  }

  // Permitir acceso a rutas públicas
  if (PUBLIC_PATHS.some((path) => pathname.startsWith(path))) {
    return NextResponse.next();
  }

  // Si no hay token, redirigir a /login
  if (!token) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.search = "";
    return NextResponse.redirect(loginUrl);
  }

  // Si hay token, permitir acceso
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!api/auth/login|api/login|api/auth/me|api/logout|api/auth/check|api/auth/check-session|api/asistencias/user|api/anticipos/user|api/commissions/user|api/servicios/user|api/tips/user|api/overtime/user|api/orders/user|api/clients|api/users|api/anfitrionas|api/categories|api/products|api/orders|api/ventas/confirmar-anulacion|api/ventas/procesar-anulacion|api/ventas/solicitud-anulacion|api/servicios/solicitud-anulacion|api/servicios/procesar-anulacion|api/notifications/pending|api/notifications/sse|api/swagger|api/health|api-docs|api/docs|_next|favicon.ico|img|fonts|manifest.json|robots.txt|sitemap.xml|confirmar-anulacion|confirmar-anulacion-servicio).*)",
  ],
};
