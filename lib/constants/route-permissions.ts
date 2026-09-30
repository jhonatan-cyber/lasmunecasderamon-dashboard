import { ROUTES } from '@/lib/constants/routes';

/**
 * Mapa único ruta → permiso.
 *
 * Antes este mapa estaba copiado en cuatro lugares y las copias se desincronizaron:
 * `/payroll/calendar` pedía el módulo inexistente `payroll_details` en una tabla y
 * `payroll` en la otra, las páginas de rol (`/garzon-*`) existían en una sola tabla, y el
 * sidebar gateaba destinos con pares que la guarda de la página nunca miró. Cuando dos
 * copias discrepan, middleware y cliente deciden distinto sobre la misma URL: la página
 * carga en la navegación SPA y rebota a /access-denied al recargar (o al revés).
 *
 * Ahora la tabla vive acá y los tres consumidores la leen:
 *   - `proxy.ts` (middleware Edge) → redirect del servidor;
 *   - `components/auth/RouteGuard.tsx` → recarga completa y navegación SPA;
 *   - `hooks/useSidebarNavigation.ts` → qué ítems ve cada rol.
 *
 * Es un módulo de datos puros: sin React, sin `'use client'` y sin APIs de Node, para que
 * lo pueda importar tanto el runtime de Edge como el cliente.
 * `tests/unit/lib/constants/route-permissions.test.ts` falla si alguna capa vuelve a
 * declarar su propia tabla o si un destino del menú queda sin par que lo habilite.
 */

export interface RoutePermission {
  module: string;
  action: string;
}

export type RoutePermissionMap = Record<string, RoutePermission>;

/**
 * Rutas de página abiertas sin sesión. `RouteGuard` usa solo esta lista (no
 * `PUBLIC_PATHS` completa, que también describe assets y APIs) porque su trabajo es el de
 * las páginas que envuelve; el test verifica que siga siendo un subconjunto de
 * `PUBLIC_PATHS` para que las dos listas no se separen.
 */
export const PUBLIC_ROUTE_PATHS: readonly string[] = ['/', '/login', '/access-denied'];

export const PUBLIC_PATHS: string[] = [
  ...PUBLIC_ROUTE_PATHS,
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
  // Cierre de caja: el administrador autoriza desde el link del WhatsApp. La
  // creacion de la solicitud (POST /api/cashregister/cierre) NO es publica.
  ROUTES.CONFIRMAR_CIERRE_CAJA,
  '/api/cashregister/solicitud-cierre',
  '/api/cashregister/procesar-cierre',
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
  // Lector biométrico de la puerta (ZKTeco ADMS y Dahua push): su credencial es
  // el serial de alta en `biometric_devices`, que se comprueba dentro del handler.
  // Van acá y no en KIOSK_DEVICE_APIS porque los equipos hablan HTTP plano, sin
  // cookie ni sesión, y el handshake de ZKTeco repite cada pocos segundos.
  '/iclock',
  '/dahua',
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
  '/api/rooms',
  // Decisión deliberada (ver API_ROUTE_PERMISSIONS): las gratificaciones se gatean en el
  // handler, no acá. El prefijo solo exige sesión.
  '/api/gratificaciones',
  '/api/gratificaciones/me'
];

/**
 * Permiso que exige cada página. Las páginas de rol (`/garzon-*`, `/anfitriona-*`,
 * `/cajero-*`) se declaran con el módulo `dashboard`, el único que no se comprueba: las
 * ve cualquier sesión válida y el contenido se filtra adentro. Es la lista completa de
 * páginas que el sistema conoce; una ruta que no esté acá solo exige sesión.
 */
export const ROUTE_PERMISSIONS: RoutePermissionMap = {
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
  '/cash-register': { module: 'cash_register', action: 'view' },
  '/accounts': { module: 'accounts', action: 'view' },
  '/tips': { module: 'tips', action: 'view' },
  '/commissions': { module: 'commissions', action: 'view' },
  '/payroll': { module: 'payroll', action: 'view' },
  // El detalle de la planilla vive dentro de payroll: `payroll_details` nunca
  // existió como módulo en el catálogo y dejaba la página inaccesible.
  '/payroll/calendar': { module: 'payroll', action: 'view' },
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

/**
 * APIs que exigen un permiso concreto además de la sesión. El middleware traduce el
 * método HTTP a la acción (POST→create, PUT/PATCH→edit, DELETE→delete, resto→la acción
 * declarada) y el handler vuelve a comprobar con `withRoute`.
 *
 * `/api/gratificaciones` NO está acá a propósito: su GET ya limita los datos en
 * el handler (solo el administrador consulta ajenos; el resto —incluido el cajero—
 * ve lo suyo y lo que él mismo solicitó, migración 037) y la app móvil usa
 * `/gratificaciones/me` con sesión. Los WRITE_METHODS
 * (POST/PUT/DELETE) exigen su par con `withRoute` (`gratificaciones.write/delete`), que
 * es una autorización más fina que lo que esta tabla podría dar. Poner el par acá sería
 * una entrada muerta: el middleware resuelve la ruta por AUTHENTICATED_ONLY_APIS antes de
 * mirar esta tabla. El test guardián falla si una entrada de esta lista vuelve a quedar
 * tapada por las otras listas de acceso.
 */
export const API_ROUTE_PERMISSIONS: RoutePermissionMap = {
  '/api/roles': { module: 'roles', action: 'view' },
  '/api/payroll': { module: 'payroll', action: 'view' },
  '/api/reports': { module: 'reports', action: 'view' }
};

/**
 * Acción del catálogo que exige un método HTTP sobre una ruta gateada. El middleware
 * la deriva así (POST→create, PUT/PATCH→edit, DELETE→delete, el resto→la acción
 * declarada) y `withRoute` verifica su traducción a flag de matriz
 * (`toMatrixAction`). Vive acá para que proxy.ts y el test de alineación la compartan
 * en lugar de mantener dos copias de la derivación.
 */
export function httpActionForMethod(method: string, declaredAction: string): string {
  if (method === 'POST') return 'create';
  if (method === 'PUT' || method === 'PATCH') return 'edit';
  if (method === 'DELETE') return 'delete';
  return declaredAction;
}

/**
 * Destinos del menú cuyo permiso no es el de la página. Cada excepción es una decisión
 * explícita: el ítem existe para una acción puntual aunque la página se abra con `view`.
 * Los demás ítems toman su par de `ROUTE_PERMISSIONS` a través de
 * `findSidebarPermission`; el test falla si aparece un ítem sin par, si una excepción
 * repite el par que ya declara la tabla de páginas o si esta lista cambia sin querer.
 */
export const SIDEBAR_PERMISSION_OVERRIDES: RoutePermissionMap = {
  // La página lista habitaciones (`rooms.view`); el ítem crea un privado.
  '/rooms': { module: 'rooms', action: 'create' },
  // La página es el almacén; el ítem confirma la devolución de envases.
  '/products/containers': { module: 'products', action: 'confirm_container_return' },
  // Compras no figura en la tabla de páginas (el middleware solo le pide sesión).
  '/purchases': { module: 'products', action: 'view' }
};

/**
 * Menú reducido del Barman: aunque la sesión tenga permisos de más, la barra solo ofrece
 * estos destinos. Son hrefs reales del sidebar; el test falla si alguno deja de existir.
 */
export const BARMAN_ROUTE_ALLOWLIST = ['/dashboard', '/bar', '/sales', '/private-rooms'];

export const ACCESS_DENIED_PATH = '/access-denied';

/** Rutas de assets que se comparan por prefijo simple, sin frontera de segmento. */
const PREFIX_MATCH_PATHS = new Set(['/_next', '/img', '/fonts']);

/**
 * ¿La ruta declarada cubre este pathname? Exacto, o con la ruta como prefijo de segmento:
 * `/payroll` cubre `/payroll/calendar` pero no `/payrollx`. `'/'` solo cuenta exacto.
 * Mismo criterio para páginas, APIs y destinos del menú.
 */
export function matchesRoutePath(pathname: string, route: string): boolean {
  if (route === '/') return pathname === '/';
  return pathname === route || pathname.startsWith(route + '/');
}

/** Ruta pública, con el mismo criterio que usa el middleware. */
export function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some(route =>
    PREFIX_MATCH_PATHS.has(route) ? pathname.startsWith(route) : matchesRoutePath(pathname, route)
  );
}

/**
 * Permiso que exige una ruta. Gana la coincidencia más específica: la tabla se recorre de
 * la ruta más larga a la más corta, así `/payroll/calendar` manda sobre `/payroll` sin
 * depender del orden en que estén escritas.
 */
export function findRoutePermission(
  pathname: string,
  table: RoutePermissionMap = ROUTE_PERMISSIONS
): RoutePermission | null {
  const match = Object.keys(table)
    .sort((a, b) => b.length - a.length)
    .find(route => matchesRoutePath(pathname, route));
  return match ? table[match] : null;
}

/** Permiso que habilita un destino del menú: su excepción declarada o el de la página. */
export function findSidebarPermission(href: string): RoutePermission | null {
  return SIDEBAR_PERMISSION_OVERRIDES[href] ?? findRoutePermission(href);
}

/**
 * Rutas de rol (`/garzon-*`, `/anfitriona-*`, `/cajero-*`): cualquier sesión válida entra y
 * el contenido se filtra adentro. Es la única excepción a la comprobación de permisos.
 */
export function isAnySessionRoute(permission: RoutePermission): boolean {
  return permission.module === 'dashboard';
}

/** Destino del redirect cuando falta el permiso; `module` y `action` los lee la página. */
export function accessDeniedPath(module: string, action: string): string {
  return `${ACCESS_DENIED_PATH}?module=${encodeURIComponent(module)}&action=${encodeURIComponent(
    action
  )}`;
}

/*
 * ─── Vocabulario compartido catálogo ↔ matriz ─────────────────────────────────
 *
 * Las guardas de las rutas API (`withRoute` en app/api) verifican contra la matriz de
 * flags de `lib/middleware/auth` (`finances.write`, `users.delete`…), pero el vocabulario
 * real es el catálogo (`cash_register.view`, `roles.edit`…): lo que asigna el panel de
 * Roles y lo que usan middleware, RouteGuard y sidebar. Esta es la ÚNICA traducción entre
 * ambos; `lib/middleware/auth` la aplica para poblar la matriz y el test de `withRoute`
 * la usa en la dirección inversa para verificar que los handlers declaran el par que el
 * middleware (o la tabla) exige. Antes había dos copias de estos mapas y divergieron.
 */

/** Acción del catálogo → flag de la matriz. Lo no mapeado se respeta tal cual. */
export function toMatrixAction(action: string): string {
  const actionMap: Record<string, string> = {
    view: 'read',
    view_details: 'read',
    create: 'write',
    edit: 'write',
    open: 'write',
    close: 'write',
    withdraw: 'write',
    // Operaciones de estado (migración 036): la matriz no distingue "activar" de
    // "editar", pero las rutas que las ejecutan sí exigen `write` del módulo.
    activate: 'write',
    deactivate: 'write',
    occupy: 'write',
    liberate: 'write',
    delete: 'delete',
    export: 'export',
    anulate: 'anulate',
    process: 'process'
  };
  return actionMap[action] ?? action;
}

/** Módulo del catálogo → clave de la matriz. `cash_register` vive como `finances`. */
export function toMatrixModule(module: string): string {
  const moduleAliases: Record<string, string> = {
    cash_register: 'finances',
    cashregister: 'finances'
  };
  return moduleAliases[module] ?? module;
}

/**
 * Flags que concede un par del catálogo sobre un módulo de la matriz.
 *
 * Además del flag traducido (`edit` → `write`), concede el flag homónimo cuando la
 * matriz lo declara: es lo que permite que un handler exija `gratificaciones.edit`
 * sin que `gratificaciones.create` (que colapsa a `write`) lo otorgue. Única copia
 * de esta regla: la aplican los dos poblatores de la matriz,
 * `lib/middleware/auth` y `lib/repositories/auth/AuthQueries`.
 */
export function matrixFlagsFor(
  moduleFlags: Record<string, boolean>,
  catalogAction: string
): string[] {
  const mapped = toMatrixAction(catalogAction);
  const flags: string[] = [];
  if (mapped in moduleFlags) flags.push(mapped);
  if (catalogAction !== mapped && catalogAction in moduleFlags) flags.push(catalogAction);
  return flags;
}

/** Inverso de `toMatrixAction`: flags de withRoute → el par del catálogo que lo concede. */
export function fromMatrixAction(matrixAction: string): string {
  const reverse: Record<string, string> = {
    read: 'view',
    write: 'edit',
    delete: 'delete',
    export: 'export',
    anulate: 'anulate',
    process: 'process'
  };
  return reverse[matrixAction] ?? matrixAction;
}

/** Inverso de `toMatrixModule`: clave de la matriz → el módulo del catálogo. */
export function fromMatrixModule(matrixModule: string): string {
  return matrixModule === 'finances' ? 'cash_register' : matrixModule;
}
