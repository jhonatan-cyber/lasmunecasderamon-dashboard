import { ROUTES } from '@/lib/constants/routes';

export const PUBLIC_PATHS = [
  '/',
  '/login',
  // Deep links universales (Android App Links / iOS Universal Links): el
  // esquema de la app apunta a /app/* en este dominio. Son solo un redirect
  // a '/' para cuando la app no está instalada; no requieren sesión.
  '/app',
  '/asistencia-qr',
  '/api/public/users',
  ROUTES.CONFIRMAR_ANULACION,
  ROUTES.CONFIRMAR_ANULACION_SERVICIO,
  ROUTES.CONFIRMAR_ANULACION_CUENTA,
  ROUTES.CONFIRMAR_ANTICIPO,
  ROUTES.CONFIRMAR_GRATIFICACION,
  '/api/auth/login',
  '/api/auth/reset-password',
  // '/api/login' y '/api/logout' retirados: rutas muertas (el front usa /api/auth/*).
  '/api/auth/register-first-user',
  // Complemento del aprovisionamiento inicial: la pantalla de login consulta si ya
  // existe algún usuario para decidir entre login y registro del primer administrador.
  // Solo devuelve un booleano, sin datos de personal.
  '/api/auth/check-users',
  '/api/test-auth',
  '/api/health',
  '/api/whatsapp/webhook',
  '/api/ventas/solicitud-anulacion',
  '/api/ventas/procesar-anulacion',
  '/api/servicios/solicitud-anulacion',
  '/api/servicios/procesar-anulacion',
  '/api/cuentas/solicitud-anulacion',
  '/api/cuentas/procesar-anulacion',
  '/api/timers/active',
  '/api/anticipos/solicitud-detalles',
  // Confirmación de gratificación por enlace de un solo uso (página pública
  // /confirmar-gratificacion, como sus hermanas de anticipo y anulación).
  '/api/gratificaciones/solicitud-detalles',
  '/api/gratificaciones/aprobar',
  // ⚠️ Endpoints protegidos removidos de PUBLIC_PATHS por seguridad
  // '/api/permissions/setup-cajero',
  // '/api/permissions/setup-roles',
  // '/api/permissions/debug',
  // '/api/permissions/test-cajero',
  // '/api/permissions/verify',
  // '/api/roles/setup',
  '/api/images',
  '/_next',
  '/favicon.ico',
  '/img',
  '/fonts',
  '/manifest.json',
  '/robots.txt',
  '/sitemap.xml',
  '/access-denied',
  '/sw.js',
  '/precache-manifest.json',
  '/offline',
  '/change-password',
  '/api/auth/change-password',
  '/swagger.json',
  '/notification.mp3',
  '/placeholder-logo.png',
  '/placeholder-logo.svg',
  '/placeholder-user.jpg',
  '/placeholder.jpg',
  '/placeholder.svg'
];

// Credencial de dispositivo: la pantalla del local se autentica con su propia cookie
// (`kiosk_token`, validada contra kiosk_devices), no con una sesión de persona. El
// middleware deja pasar estas rutas y cada una verifica la credencial; no son públicas
// y no aceptan una sesión de usuario como sustituto.
export const KIOSK_DEVICE_APIS = ['/api/kiosk', '/api/notifications/kiosk'];

export const AUTHENTICATED_ONLY_APIS = [
  '/api/codigo',
  '/api/users',
  '/api/attendance',
  '/api/anticipos',
  '/api/tips',
  '/api/overtime',
  '/api/orders',
  '/api/commissions',
  '/api/servicios',
  '/api/sales',
  '/api/cashregister',
  '/api/caja',
  '/api/cuentas',
  '/api/gratificaciones',
  '/api/stats/logged-users',
  '/api/anfitrionas',
  '/api/garzones',
  '/api/products',
  '/api/categories',
  '/api/clients',
  '/api/rooms'
];

export const routePermissions: Record<string, { module: string; action: string }> = {
  '/dashboard': { module: 'dashboard', action: 'view' },
  '/users': { module: 'users', action: 'view' },
  '/clients': { module: 'clients', action: 'view' },
  '/products': { module: 'products', action: 'view' },
  '/inventory': { module: 'products', action: 'view' },
  '/bar': { module: 'products', action: 'view' },
  '/transfers': { module: 'products', action: 'view' },
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

export const apiRoutePermissions: Record<string, { module: string; action: string }> = {
  '/api/roles': { module: 'roles', action: 'view' },
  '/api/gratificaciones': { module: 'gratificaciones', action: 'view' },
  '/api/payroll': { module: 'payroll', action: 'view' },
  '/api/reports': { module: 'reports', action: 'view' }
};
