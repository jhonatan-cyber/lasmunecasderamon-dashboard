import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import {
  AUTHENTICATED_ONLY_APIS,
  KIOSK_DEVICE_APIS,
  PUBLIC_PATHS
} from '@/lib/middleware/proxy-routes';
import {
  classifyGuard,
  exportedMethods,
  listApiRouteFiles,
  routeFromFilePath,
  type GuardLevel
} from './_walk-helpers';

/**
 * La matriz de autorización.
 *
 * El sistema tiene dos capas que deben coincidir: el middleware (`proxy.ts`, con
 * PUBLIC_PATHS como única barrera para quien no trae token) y el guard por ruta
 * (withRoute con su config, o lógica propia del handler). Históricamente divergían: había
 * rutas con `withPublicRoute` que el middleware igual bloqueaba sin sesión —funcionaban de
 * casualidad y mentían sobre su nivel real— y rutas de escritura sin guard explícito.
 *
 * Este test recorre TODAS las rutas API del árbol y las compara contra la política escrita
 * acá abajo. Si falla al agregar una ruta nueva, la ruta no declara su nivel de acceso:
 * agregá el guard correcto y, si es genuinamente pública, declarala en PUBLIC_PATHS y en
 * la política con el motivo.
 *
 * Convenciones del triage (2026-09):
 *
 *  1. `withPublicRoute` es, en la práctica de este repo, "lee la sesión dentro del
 *     handler con getAuth y funciona igual sin ella". El middleware solo deja pasar
 *     estas rutas si están en PUBLIC_PATHS, así que el nivel real es el del middleware.
 *     La convención se permite, pero una ruta con withPublicRoute que NO esté en la
 *     política pública no puede figurar en PUBLIC_PATHS (y viceversa).
 *  2. Un endpoint público es una decisión con motivo. Cada entrada de la política tiene
 *     el porqué de no exigir sesión.
 *  3. El kiosko es una credencial propia de dispositivo, ni pública ni de persona.
 */

interface RouteMethod {
  route: string;
  method: string;
  guard: GuardLevel;
}

function scanApiRoutes(): RouteMethod[] {
  const out: RouteMethod[] = [];
  for (const file of listApiRouteFiles()) {
    const source = fs.readFileSync(file, 'utf8');
    const route = routeFromFilePath(file);
    for (const { method, snippet } of exportedMethods(source)) {
      out.push({ route, method, guard: classifyGuard(method, snippet) });
    }
  }
  return out;
}

// ─── La política escrita ────────────────────────────────────────────────────────

/** Wrappers compuestos de proyecto considerados guard válido. */
const KNOWN_COMPOUND_WRAPPERS = new Set([
  'loginLimiterApp' // componen de rate limit de login sobre el handler
]);

/** Métodos que cambian estado: exigen guard con sesión o credencial propia. */
const WRITE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

/**
 * Rutas API genuinamente públicas: figuran en PUBLIC_PATHS y su handler lo declara con
 * withPublicRoute (o el wrapper compuesto correspondiente). El valor es el motivo por el
 * que NO exige sesión.
 */
const PUBLIC_API_POLICY: Record<string, string> = {
  // Ciclo de sesión (rate-limited en proxy.ts).
  '/api/auth/login': 'inicio de sesión',
  '/api/auth/reset-password': 'recuperación de contraseña por RUN',
  '/api/auth/register-first-user': 'primer administrador; el servicio rechaza si ya hay usuarios',
  '/api/auth/change-password': 'cambio de contraseña desde el login',
  '/api/health': 'sondeo de infraestructura',
  '/api/test-auth': 'diagnóstico de sesión; solo devuelve lo que getAuth resuelva',
  '/api/whatsapp/webhook': 'webhook de WhatsApp, verificado por firma',
  // Páginas de confirmación por enlace de un solo uso (token en la URL, sin sesión):
  '/api/ventas/solicitud-anulacion': 'confirmación de anulación por token de un solo uso',
  '/api/ventas/procesar-anulacion': 'confirmación de anulación por token de un solo uso',
  '/api/servicios/solicitud-anulacion': 'confirmación de anulación por token de un solo uso',
  '/api/servicios/procesar-anulacion': 'confirmación de anulación por token de un solo uso',
  '/api/cuentas/solicitud-anulacion': 'confirmación de anulación por token de un solo uso',
  '/api/cuentas/procesar-anulacion': 'confirmación de anulación por token de un solo uso',
  '/api/anticipos/solicitud-detalles': 'confirmación de anticipo por token de un solo uso',
  '/api/gratificaciones/solicitud-detalles': 'confirmación de gratificación por token',
  '/api/gratificaciones/aprobar': 'confirmación de gratificación por token',
  // Públicos de producto:
  '/api/public/users': 'padrón para la pantalla del local (sin credenciales desde la 024)',
  '/api/timers/active': 'lectura de timers activos para pantallas del local',
  '/api/images/products/[filename]': 'imágenes de productos públicas del catálogo'
};

/**
 * Rutas que ya no existen pero siguen en las listas del middleware: se permiten por ahora
 * con motivo, y este test las tiene visibles para no olvidarlas.
 */
const TOLERATED_DEAD_ROUTES: Record<string, string> = {
  '/api/reviews/create': 'legado: la ruta real es /api/reviews; el dato quedó en el historial'
};

/** Rutas kiosko: la credencial es de dispositivo y la verifica cada handler. */
const KIOSK_POLICY: Record<string, string> = {
  '/api/kiosk/session': 'provisión de la pantalla con el secreto del local',
  '/api/kiosk/board': 'tablero; exige cookie de dispositivo firmada',
  '/api/kiosk/attendance/challenge': 'emite el desafío; exige cookie de dispositivo firmada',
  '/api/notifications/kiosk': 'canal SSE público con proyección mínima'
};

/** withPublicRoute legítimo fuera de PUBLIC_PATHS: sesión leída dentro del handler. */
const SESSION_WRAPPED_POLICY: Record<string, string> = {
  '/api/attendance/register': 'exige sesión dentro del handler y valida el desafío de asistencia',
  '/api/auth/logout': 'cierre de sesión; con o sin token el resultado es el mismo',
  '/api/auth/check-users': 'complemento del login: lista el personal activo para elegir',
  '/api/error-logs': 'POST ingesta de errores del cliente (logErrorToService, aún sin cablear)',
  '/api/reviews':
    'reseñas de clientes; arma un enlace de WhatsApp para el admin (sin escribir a la base)',
  '/api/orders/check-active-room': 'polling del modal de pedidos; GET equivalente exige sesión',
  '/api/csp-violation': 'report-uri de CSP; el navegador no envía el flujo autenticado',
  '/api/ping': 'telemetría de montaje del cliente; solo escribe un log',
  // Lecturas operativas para UI autenticada: el middleware exige token, el handler lee
  // la sesión para filtrar. Convención legacy documentada (ver encabezado).
  '/api/anfitrionas/disponibles': 'convención legacy: lectura operativa, sesión por middleware',
  '/api/anfitrionas': 'convención legacy: lectura operativa, sesión por middleware',
  '/api/attendance/[id]/detalle': 'convención legacy: lectura operativa, sesión por middleware',
  '/api/attendance/hoy': 'convención legacy: lectura operativa, sesión por middleware',
  '/api/attendance': 'convención legacy: lectura operativa, sesión por middleware',
  '/api/attendance/stats': 'convención legacy: lectura operativa, sesión por middleware',
  '/api/audit-logs': 'convención legacy: lectura operativa, sesión por middleware',
  '/api/bar/movements': 'convención legacy: lectura operativa, sesión por middleware',
  '/api/bar': 'convención legacy: lectura operativa, sesión por middleware',
  '/api/caja-status': 'convención legacy: lectura operativa, sesión por middleware',
  '/api/caja/habitaciones-stats': 'convención legacy: lectura operativa, sesión por middleware',
  '/api/caja/stats': 'convención legacy: lectura operativa, sesión por middleware',
  '/api/caja/ventas-barras': 'convención legacy: lectura operativa, sesión por middleware',
  '/api/caja/ventas-champagne': 'convención legacy: lectura operativa, sesión por middleware',
  '/api/caja/ventas-tragos-chicas': 'convención legacy: lectura operativa, sesión por middleware',
  '/api/calendar/data': 'convención legacy: lectura operativa, sesión por middleware',
  '/api/calendar': 'convención legacy: lectura operativa, sesión por middleware',
  '/api/cashregister/[id]': 'convención legacy: lectura operativa, sesión por middleware',
  '/api/cashregister/status': 'convención legacy: lectura operativa, sesión por middleware',
  '/api/categories': 'convención legacy: lectura operativa, sesión por middleware',
  '/api/clients/[id]': 'convención legacy: lectura operativa, sesión por middleware',
  '/api/clients/history': 'convención legacy: lectura operativa, sesión por middleware',
  '/api/clients': 'convención legacy: lectura operativa, sesión por middleware',
  '/api/commissions/[id]/details': 'convención legacy: lectura operativa, sesión por middleware',
  '/api/commissions': 'convención legacy: lectura operativa, sesión por middleware',
  '/api/cron/check-timers': 'convención legacy: cron interno, sesión por middleware',
  '/api/cuentas/[id]': 'convención legacy: lectura operativa, sesión por middleware',
  '/api/cuentas': 'convención legacy: lectura operativa, sesión por middleware',
  '/api/events/detail/[id]': 'convención legacy: lectura operativa, sesión por middleware',
  '/api/garzones': 'convención legacy: lectura operativa, sesión por middleware',
  '/api/orders/detail': 'convención legacy: lectura operativa, sesión por middleware',
  '/api/orders': 'convención legacy: lectura operativa, sesión por middleware',
  '/api/payroll': 'convención legacy: lectura operativa, sesión por middleware',
  '/api/permissions': 'convención legacy: lectura operativa, sesión por middleware',
  '/api/products/[id]/tiers': 'convención legacy: lectura operativa, sesión por middleware',
  '/api/products/for-sale': 'convención legacy: lectura operativa, sesión por middleware',
  '/api/products/presentations': 'convención legacy: lectura operativa, sesión por middleware',
  '/api/products': 'convención legacy: lectura operativa, sesión por middleware',
  '/api/products/units': 'convención legacy: lectura operativa, sesión por middleware',
  '/api/reports/cash-register': 'convención legacy: lectura operativa, sesión por middleware',
  '/api/reports/commissions': 'convención legacy: lectura operativa, sesión por middleware',
  '/api/reports/sales': 'convención legacy: lectura operativa, sesión por middleware',
  '/api/roles/[id]/permissions': 'convención legacy: lectura operativa, sesión por middleware',
  '/api/roles/[id]': 'convención legacy: lectura operativa, sesión por middleware',
  '/api/roles/[id]/users': 'convención legacy: lectura operativa, sesión por middleware',
  '/api/roles/admin/permissions': 'convención legacy: lectura operativa, sesión por middleware',
  '/api/roles': 'convención legacy: lectura operativa, sesión por middleware',
  '/api/rooms/[id]': 'convención legacy: lectura operativa, sesión por middleware',
  '/api/rooms': 'convención legacy: lectura operativa, sesión por middleware',
  '/api/sales/[id]': 'convención legacy: lectura operativa, sesión por middleware',
  '/api/sales': 'convención legacy: lectura operativa, sesión por middleware',
  '/api/sales/stats': 'convención legacy: lectura operativa, sesión por middleware',
  '/api/servicios/[id]': 'convención legacy: lectura operativa, sesión por middleware',
  '/api/servicios/by-dates': 'convención legacy: lectura operativa, sesión por middleware',
  '/api/servicios': 'convención legacy: lectura operativa, sesión por middleware',
  '/api/solicitudes-servicios/pending-count': 'convención legacy: sesión por middleware',
  '/api/solicitudes-servicios': 'convención legacy: sesión por middleware',
  '/api/stats/logged-users': 'convención legacy: lectura operativa, sesión por middleware',
  '/api/stats/sales-by-month': 'convención legacy: lectura operativa, sesión por middleware',
  '/api/stats/sales-by-week': 'convención legacy: lectura operativa, sesión por middleware',
  '/api/tips/[id]': 'convención legacy: lectura operativa, sesión por middleware',
  '/api/users/[id]/permissions': 'convención legacy: lectura operativa, sesión por middleware',
  '/api/ventas/[id]': 'convención legacy: lectura operativa, sesión por middleware'
};

/** Toda la política pública sumada, para los tests de paridad con el middleware. */
const ALL_PUBLIC_ROUTES = { ...PUBLIC_API_POLICY, ...KIOSK_POLICY };

// ─── Matching del middleware ────────────────────────────────────────────────────

function isUnder(route: string, prefix: string): boolean {
  return route === prefix || route.startsWith(prefix + '/');
}

/** Nivel de barrera del middleware para esta ruta (lo que ve un request sin token). */
function middlewareBarrier(route: string): 'publica' | 'kiosko' | 'autenticada' {
  if (KIOSK_DEVICE_APIS.some(p => isUnder(route, p))) return 'kiosko';
  if (PUBLIC_PATHS.some(p => p.startsWith('/api/') && isUnder(route, p))) return 'publica';
  return 'autenticada';
}

// ─── El recorrido ───────────────────────────────────────────────────────────────

const routes = scanApiRoutes();
const routeIndex = new Map<string, RouteMethod[]>();
for (const rm of routes) {
  routeIndex.set(rm.route, [...(routeIndex.get(rm.route) ?? []), rm]);
}

describe('matriz de autorización de la API', () => {
  it('hay rutas que recorrer (el walker no se rompió en silencio)', () => {
    expect(routes.length).toBeGreaterThan(250);
  });

  it('cada entrada de la política corresponde a una ruta real o está tolerada con motivo', () => {
    const rutasReales = new Set(routes.map(r => r.route));
    const fantasmas = Object.keys(ALL_PUBLIC_ROUTES).filter(
      route => !rutasReales.has(route) && TOLERATED_DEAD_ROUTES[route] === undefined
    );
    expect(fantasmas, `La política declara rutas inexistentes: ${fantasmas.join(', ')}`).toEqual(
      []
    );
  });

  it('PUBLIC_PATHS de API solo declara rutas vivas o muertas toleradas', () => {
    const rutasReales = routes.map(r => r.route);
    const muertos = PUBLIC_PATHS.filter(
      p =>
        p.startsWith('/api/') &&
        !rutasReales.some(r => isUnder(r, p)) &&
        TOLERATED_DEAD_ROUTES[p] === undefined
    );
    expect(muertos, `PUBLIC_PATHS declara rutas inexistentes: ${muertos.join(', ')}`).toEqual([]);
  });

  it('AUTHENTICATED_ONLY_APIS no declara prefijos muertos sin motivo', () => {
    const rutasReales = routes.map(r => r.route);
    const muertos = AUTHENTICATED_ONLY_APIS.filter(
      p => !rutasReales.some(r => isUnder(r, p)) && TOLERATED_DEAD_ROUTES[p] === undefined
    );
    expect(muertos, `Prefijos muertos nuevos: ${muertos.join(', ')} — borralos`).toEqual([]);
  });

  it('KIOSK_DEVICE_APIS apunta a rutas que existen', () => {
    const rutasReales = routes.map(r => r.route);
    for (const prefix of KIOSK_DEVICE_APIS) {
      expect(
        rutasReales.some(r => isUnder(r, prefix)),
        `${prefix} declarado en KIOSK_DEVICE_APIS pero no hay rutas debajo`
      ).toBe(true);
    }
  });

  it('cada ruta pública del middleware está en la política con su motivo', () => {
    const faltantes = routes
      .filter(rm => middlewareBarrier(rm.route) === 'publica')
      .filter(rm => PUBLIC_API_POLICY[rm.route] === undefined)
      .map(rm => rm.route);
    expect(
      [...new Set(faltantes)],
      `Públicas sin motivo en la política: ${[...new Set(faltantes)].join(', ')}`
    ).toEqual([]);
  });

  it('cada ruta pública por política figura en PUBLIC_PATHS', () => {
    const faltantes = Object.keys(PUBLIC_API_POLICY).filter(
      route => middlewareBarrier(route) !== 'publica'
    );
    expect(
      faltantes,
      `La política las declara públicas pero el middleware las bloquea: ${faltantes.join(', ')}`
    ).toEqual([]);
  });

  it('las rutas kiosko son bare (verifican su credencial en el handler) y no públicas', () => {
    for (const rm of routes.filter(r => middlewareBarrier(r.route) === 'kiosko')) {
      expect(
        PUBLIC_API_POLICY[rm.route],
        `${rm.route} no debe estar en la política pública`
      ).toBeUndefined();
      expect(
        ['bare', 'custom-wrapper'].includes(rm.guard),
        `${rm.route} (${rm.guard}): el kiosko verifica su credencial en el handler, no con auth de persona`
      ).toBe(true);
    }
  });

  it('ninguna ruta de escritura queda sin guard de sesión o credencial propia', () => {
    const violaciones: string[] = [];
    for (const { route, method, guard } of routes) {
      if (!WRITE_METHODS.has(method)) continue;
      // Con política declarada (pública por token/firma o legacy con sesión en handler).
      if (PUBLIC_API_POLICY[route] !== undefined || SESSION_WRAPPED_POLICY[route] !== undefined)
        continue;
      if (middlewareBarrier(route) === 'kiosko') continue; // credencial de dispositivo
      const protegida =
        guard === 'withRoute:permission' ||
        guard === 'withRoute:administrator' ||
        guard === 'withRoute:authenticated' ||
        guard === 'custom-wrapper';
      if (!protegida) violaciones.push(`${method} ${route} (${guard})`);
    }
    expect(violaciones, `Escrituras sin guard: ${violaciones.join('; ')}`).toEqual([]);
  });

  it('cada withPublicRoute está en la política: nada de públicos accidentales', () => {
    const fuera = routes
      .filter(
        r =>
          r.guard === 'withPublicRoute' &&
          PUBLIC_API_POLICY[r.route] === undefined &&
          SESSION_WRAPPED_POLICY[r.route] === undefined
      )
      .map(r => `${r.method} ${r.route}`);
    expect(
      fuera,
      `withPublicRoute fuera de la política: ${fuera.join('; ')} — declaralo con motivo o cambiá a withRoute`
    ).toEqual([]);
  });

  it('los wrappers compuestos son los de la lista blanca', () => {
    const desconocidos: string[] = [];
    for (const { route } of routes.filter(r => r.guard === 'custom-wrapper')) {
      const file = listApiRouteFiles().find(f => routeFromFilePath(f) === route)!;
      const src = fs.readFileSync(file, 'utf8');
      for (const { method, snippet } of exportedMethods(src)) {
        const wrapper = new RegExp(
          `export\\s+(?:const|async\\s+function)\\s+${method}\\b[^=]*=\\s*([A-Za-z_$][\\w$]*)\\s*\\(`
        ).exec(snippet)?.[1];
        if (!wrapper || wrapper === 'withRoute' || wrapper === 'withPublicRoute') continue;
        if (!KNOWN_COMPOUND_WRAPPERS.has(wrapper)) {
          desconocidos.push(`${method} ${route} usa "${wrapper}"`);
        }
      }
    }
    expect(desconocidos, `Wrappers no reconocidos: ${desconocidos.join('; ')}`).toEqual([]);
  });

  it('las rutas de administración sensible son access: administrator', () => {
    for (const route of ['/api/error-logs', '/api/debug/slow-queries', '/api/auth/logs']) {
      const metodos = routeIndex.get(route) ?? [];
      expect(metodos.length, `${route} debería existir`).toBeGreaterThan(0);
      for (const { guard, method } of metodos) {
        if (method === 'POST' && route === '/api/error-logs') continue; // ingesta pública
        expect(
          guard,
          `${method} ${route}: administración debe declarar access: 'administrator'`
        ).toBe('withRoute:administrator');
      }
    }
  });

  it('cada handler exportado pertenece a un método HTTP estándar', () => {
    expect(routes.every(r => /^(GET|POST|PUT|PATCH|DELETE|HEAD)$/.test(r.method))).toBe(true);
  });

  it('el scan es determinista', () => {
    expect(scanApiRoutes()).toHaveLength(routes.length);
  });
});
