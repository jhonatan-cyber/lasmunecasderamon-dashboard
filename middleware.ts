import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Rutas públicas que no requieren autenticación
const PUBLIC_PATHS = [
  "/login",
  "/login-debug",
  "/confirmar-anulacion",
  "/confirmar-anulacion-servicio",
  "/api/login",
  "/api/logout",
  "/api/auth/check",
  "/api/auth/me",
  "/api/test-login-redirect",
  "/api/debug-cookies",
  "/api/ventas/confirmar-anulacion",
  "/api/ventas/procesar-anulacion",
  "/api/ventas/solicitud-anulacion",
  "/api/servicios/solicitud-anulacion",
  "/api/servicios/procesar-anulacion",
  "/api/notifications/pending",
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

  // DEBUG: Log middleware execution
  console.log('🔍 Middleware executing for:', pathname);
  console.log('📊 Token present:', !!token);
  console.log('📊 Token value:', token ? `${token.value.substring(0, 20)}...` : 'null');

  // Configurar CORS global para todas las rutas API
  if (pathname.startsWith('/api/')) {
    console.log('✅ API route, allowing CORS');
    const response = NextResponse.next();
    
    // Headers CORS
    response.headers.set('Access-Control-Allow-Origin', '*');
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
    response.headers.set('Access-Control-Max-Age', '86400');
    
    // Manejar preflight requests
    if (request.method === 'OPTIONS') {
      return new NextResponse(null, { status: 200, headers: response.headers });
    }
    
    return response;
  }

  // Si intenta acceder a /login y ya tiene sesión, redirigir a /dashboard
  if (pathname === "/login" && token) {
    console.log('🔄 Redirecting from /login to / (user has token)');
    const dashboardUrl = request.nextUrl.clone();
    dashboardUrl.pathname = "/";
    dashboardUrl.search = "";
    return NextResponse.redirect(dashboardUrl);
  }

  // Permitir acceso a rutas públicas
  if (PUBLIC_PATHS.some((path) => pathname.startsWith(path))) {
    console.log('✅ Public path, allowing access:', pathname);
    return NextResponse.next();
  }

  // Si no hay token, redirigir a /login
  if (!token) {
    console.log('❌ No token found, redirecting to /login from:', pathname);
    
    // TEMPORAL: Permitir acceso a / para debugging
    if (pathname === '/') {
      console.log('🔧 TEMPORAL: Allowing access to / without token for debugging');
      return NextResponse.next();
    }
    
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.search = "";
    return NextResponse.redirect(loginUrl);
  }

  // Si hay token, permitir acceso
  console.log('✅ Token found, allowing access to:', pathname);
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!api/login|api/logout|api/auth/check|api/auth/me|api/test-login-redirect|api/debug-cookies|api/ventas/confirmar-anulacion|api/ventas/procesar-anulacion|api/ventas/solicitud-anulacion|api/servicios/solicitud-anulacion|api/servicios/procesar-anulacion|api/notifications/pending|api-docs|api/docs|_next|favicon.ico|img|fonts|manifest.json|robots.txt|sitemap.xml|confirmar-anulacion|confirmar-anulacion-servicio|login-debug).*)",
  ],
};
