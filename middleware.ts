import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Rutas públicas que no requieren autenticación
const PUBLIC_PATHS = [
  "/login",
  "/confirmar-anulacion",
  "/confirmar-anulacion-servicio",
  "/api/login",
  "/api/logout",
  "/api/auth/check",
  "/api/auth/me",
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

  // Configurar CORS global para todas las rutas API
  if (pathname.startsWith('/api/')) {
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
    const dashboardUrl = request.nextUrl.clone();
    dashboardUrl.pathname = "/";
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
    "/((?!api/login|api/logout|api/auth/check|api/auth/me|api/ventas/confirmar-anulacion|api/ventas/procesar-anulacion|api/ventas/solicitud-anulacion|api/servicios/solicitud-anulacion|api/servicios/procesar-anulacion|api/notifications/pending|api-docs|api/docs|_next|favicon.ico|img|fonts|manifest.json|robots.txt|sitemap.xml|confirmar-anulacion|confirmar-anulacion-servicio).*)",
  ],
};
