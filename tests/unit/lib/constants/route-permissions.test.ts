// @vitest-environment node
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { PROJECT_ROOT } from '../api/_walk-helpers';
import {
  API_ROUTE_PERMISSIONS,
  AUTHENTICATED_ONLY_APIS,
  BARMAN_ROUTE_ALLOWLIST,
  KIOSK_DEVICE_APIS,
  PUBLIC_PATHS,
  PUBLIC_ROUTE_PATHS,
  ROUTE_PERMISSIONS,
  SIDEBAR_PERMISSION_OVERRIDES,
  accessDeniedPath,
  findRoutePermission,
  findSidebarPermission,
  isAnySessionRoute,
  isPublicPath,
  matrixFlagsFor,
  matchesRoutePath
} from '@/lib/constants/route-permissions';

/**
 * El mapa ruta → permiso es uno solo.
 *
 * El middleware, `RouteGuard` y el sidebar decidían por separado si una ruta se abre, cada
 * uno con su copia de la tabla. Cuando las copias se separaron, la misma URL se comportó
 * distinto según cómo se llegara: `/payroll/calendar` pedía el módulo inexistente
 * `payroll_details` en una tabla y `payroll` en la otra (la página cargaba por SPA y
 * rebotaba a /access-denied al recargar), las páginas de rol solo existían en una de las
 * listas, y el menú gateaba `/rooms` con una acción que la guarda de la página nunca miró.
 *
 * Este test es el guardián de esa unificación: falla si alguna capa vuelve a declarar su
 * propia tabla, si un destino del menú queda sin par que lo habilite, si una excepción del
 * menú cambia sin querer, o si una lista de acceso (pública, de kiosko, de solo-sesión) se
 * solapa con otra. Si falla al agregar una ruta nueva: agregala a `ROUTE_PERMISSIONS` (o
 * declarala como excepción del menú) en `lib/constants/route-permissions.ts`.
 */

/** Consumidores que deben leer la tabla compartida en vez de repetirla. */
const CONSUMERS = ['proxy.ts', 'components/auth/RouteGuard.tsx', 'hooks/useSidebarNavigation.ts'];

const SHARED_MODULE = "from '@/lib/constants/route-permissions'";

const read = (relative: string) =>
  fs.readFileSync(path.join(PROJECT_ROOT, relative), 'utf8').replace(/\r\n/g, '\n');

/** Pares módulo/acción escritos como literal en un archivo. */
const literalPairs = (source: string): string[] =>
  [...source.matchAll(/module:\s*'[a-z_]+'\s*,\s*action:\s*'[a-z_]+'/g)].map(match => match[0]);

describe('el mapa vive en un solo módulo', () => {
  it('los tres consumidores lo importan y no vuelven a declarar la tabla', () => {
    for (const file of CONSUMERS) {
      const source = read(file);
      expect(source, `${file} no importa el mapa compartido`).toContain(SHARED_MODULE);
      expect(
        literalPairs(source),
        `${file} volvió a declarar pares módulo/acción: usá ROUTE_PERMISSIONS`
      ).toEqual([]);
    }
  });

  it('el archivo viejo del middleware no vuelve a aparecer', () => {
    // Cuando existía `lib/middleware/proxy-routes.ts` había dos tablas de páginas y podían
    // divergir en silencio. El mapa ahora es uno; recrear el archivo es reabrir la grieta.
    expect(fs.existsSync(path.join(PROJECT_ROOT, 'lib/middleware/proxy-routes.ts'))).toBe(false);
  });

  it('las páginas que el guard del cliente cubría antes de unificar siguen en la tabla', () => {
    const paginasDelGuard = [
      '/dashboard',
      '/users',
      '/clients',
      '/products',
      '/categories',
      '/orders',
      '/sales',
      '/reports',
      '/roles',
      '/attendance',
      '/overtime',
      '/gratificaciones',
      '/cash-register',
      '/accounts',
      '/tips',
      '/commissions',
      '/payroll',
      '/payroll/calendar',
      '/advances',
      '/returns',
      '/rooms',
      '/private-rooms',
      '/settings'
    ];

    for (const route of paginasDelGuard) {
      expect(ROUTE_PERMISSIONS[route], `se perdió ${route} al unificar`).toBeDefined();
    }
  });
});

describe('pares del mapa', () => {
  it('detalle de planilla y caja usan el par que el catálogo tiene', () => {
    expect(ROUTE_PERMISSIONS['/payroll/calendar']).toEqual({ module: 'payroll', action: 'view' });
    expect(ROUTE_PERMISSIONS['/cash-register']).toEqual({
      module: 'cash_register',
      action: 'view'
    });
    // `payroll_details` no existe como módulo: si reaparece, la página es inaccesible.
    expect(JSON.stringify([ROUTE_PERMISSIONS, API_ROUTE_PERMISSIONS])).not.toContain(
      'payroll_details'
    );
  });

  it('gana la coincidencia más específica, sin depender del orden de la tabla', () => {
    expect(findRoutePermission('/payroll/calendar/2026')).toEqual({
      module: 'payroll',
      action: 'view'
    });
    expect(findRoutePermission('/cash-register')).toEqual({
      module: 'cash_register',
      action: 'view'
    });
    expect(findRoutePermission('/ruta-que-no-existe')).toBeNull();
  });

  it('cada ruta declara un par completo y sin vocabulario muerto', () => {
    const tablas = { ROUTE_PERMISSIONS, API_ROUTE_PERMISSIONS };

    for (const [tabla, rutas] of Object.entries(tablas)) {
      expect(Object.keys(rutas).length).toBeGreaterThan(0);
      for (const [route, { module, action }] of Object.entries(rutas)) {
        expect(route, `${tabla}: la ruta se declara sin host`).toMatch(/^\/[a-z0-9/-]+$/);
        expect(module, `${tabla}['${route}']`).toMatch(/^[a-z][a-z_]*$/);
        expect(action, `${tabla}['${route}']`).toMatch(/^[a-z][a-z_]*$/);
        // Nombres en español: nunca existieron en el catálogo (ver el test de alineación).
        expect(module, `${tabla}['${route}']`).not.toMatch(/^(productos|cuentas|pedidos)$/);
      }
    }
  });

  it('las páginas de rol quedan abiertas salvo las horas extras', () => {
    const deRol = Object.keys(ROUTE_PERMISSIONS).filter(route =>
      /^\/(garzon|anfitriona|cajero)-/.test(route)
    );

    expect(deRol.length).toBeGreaterThan(0);
    for (const route of deRol) {
      const permission = ROUTE_PERMISSIONS[route];
      // Las de rol las ve cualquier sesión válida (módulo `dashboard`). La excepción son
      // las horas extras: dependen del permiso de overtime del propio trabajador.
      if (isAnySessionRoute(permission)) continue;

      expect(permission, `${route} quedó detrás de un permiso inesperado`).toEqual({
        module: 'overtime',
        action: 'view'
      });
    }

    expect(isAnySessionRoute({ module: 'payroll', action: 'view' })).toBe(false);
  });
});

describe('el menú lateral', () => {
  const sidebarSource = read('hooks/useSidebarNavigation.ts');
  const hrefs = [...sidebarSource.matchAll(/href:\s*'([^']+)'/g)].map(match => match[1]);

  it('todos sus destinos declaran un permiso alcanzable', () => {
    // Si el conteo baja, el archivo cambió de forma y el resto del test no probaría nada.
    expect(hrefs.length).toBeGreaterThan(20);

    const sinPar = hrefs.filter(href => !findSidebarPermission(href));
    expect(
      sinPar,
      `\nDestinos del menú sin permiso que los habilite:\n${sinPar.join('\n')}\n` +
        'Agregalos a ROUTE_PERMISSIONS o a SIDEBAR_PERMISSION_OVERRIDES.\n'
    ).toEqual([]);
  });

  it('sigue la guarda de la página salvo las excepciones declaradas', () => {
    // Las excepciones son decisiones: si cambia una, la guarda y el menú podrían
    // contradecirse (el ítem se ve y la página rebota, o al revés).
    expect(SIDEBAR_PERMISSION_OVERRIDES).toEqual({
      '/rooms': { module: 'rooms', action: 'create' },
      '/products/containers': { module: 'products', action: 'confirm_container_return' },
      '/purchases': { module: 'products', action: 'view' }
    });

    for (const href of hrefs) {
      const delMenu = findSidebarPermission(href);
      const deLaPagina = findRoutePermission(href);

      if (deLaPagina && !SIDEBAR_PERMISSION_OVERRIDES[href]) {
        expect(delMenu, `${href}: el menú no coincide con la guarda de su página`).toEqual(
          deLaPagina
        );
      }
    }
  });

  it('el menú reducido del Barman apunta a destinos que existen', () => {
    expect(BARMAN_ROUTE_ALLOWLIST.length).toBeGreaterThan(0);
    for (const href of BARMAN_ROUTE_ALLOWLIST) {
      expect(hrefs, `${href} ya no es un ítem del menú`).toContain(href);
    }
  });
});

describe('rutas públicas y listas de acceso', () => {
  it('las páginas públicas del cliente están declaradas en el middleware', () => {
    for (const route of PUBLIC_ROUTE_PATHS) {
      expect(PUBLIC_PATHS, `${route} es pública para el cliente y no para el middleware`).toContain(
        route
      );
    }
  });

  it('el criterio de coincidencia es el mismo en todas las capas', () => {
    expect(matchesRoutePath('/payroll', '/payroll')).toBe(true);
    expect(matchesRoutePath('/payroll/calendar', '/payroll')).toBe(true);
    expect(matchesRoutePath('/payrollx', '/payroll')).toBe(false);
    expect(matchesRoutePath('/', '/')).toBe(true);
    expect(matchesRoutePath('/login', '/')).toBe(false);

    expect(isPublicPath('/')).toBe(true);
    expect(isPublicPath('/login')).toBe(true);
    expect(isPublicPath('/login/confirmar')).toBe(true);
    expect(isPublicPath('/loginx')).toBe(false);
    expect(isPublicPath('/_next/static/chunk.js')).toBe(true);
    expect(isPublicPath('/users')).toBe(false);
  });

  it('el redirect de acceso denegado se arma en un solo lugar', () => {
    expect(accessDeniedPath('categories', 'view')).toBe(
      '/access-denied?module=categories&action=view'
    );
    expect(PUBLIC_PATHS).toContain('/access-denied');

    // Si una capa arma el query string por su cuenta, la página puede dejar de leerlo.
    for (const file of CONSUMERS) {
      expect(read(file), `${file} arma el redirect por su cuenta`).not.toContain(
        'access-denied?module='
      );
    }
  });

  it('las listas de acceso no se solapan', () => {
    for (const route of KIOSK_DEVICE_APIS) {
      expect(PUBLIC_PATHS, `${route} es credencial de dispositivo, no ruta pública`).not.toContain(
        route
      );
      expect(AUTHENTICATED_ONLY_APIS, `${route} no es una API de sesión`).not.toContain(route);
    }

    for (const route of AUTHENTICATED_ONLY_APIS) {
      expect(PUBLIC_PATHS, `${route} es de solo-sesión y figura como pública`).not.toContain(route);
    }
  });

  it('ninguna entrada de la tabla de permisos queda tapada por otra lista', () => {
    // El middleware resuelve antes por PUBLIC_PATHS / KIOSK / AUTHENTICATED_ONLY: una
    // entrada tapada sería letra muerta y la autorización real viviría en otra parte.
    // Si esto falla al agregar una ruta, movela de lista o sacá la entrada duplicada.
    const tapadas = [
      ...Object.keys(API_ROUTE_PERMISSIONS),
      ...Object.keys(ROUTE_PERMISSIONS).filter(route => route.startsWith('/api/'))
    ].filter(
      route =>
        PUBLIC_PATHS.some(p => matchesRoutePath(route, p)) ||
        KIOSK_DEVICE_APIS.some(p => matchesRoutePath(route, p)) ||
        AUTHENTICATED_ONLY_APIS.some(p => matchesRoutePath(route, p))
    );

    expect(
      tapadas,
      `\nEntradas de permisos que el middleware nunca evalúa:\n${tapadas.join('\n')}\n`
    ).toEqual([]);
  });

  it('la decisión sobre /api/gratificaciones quedó documentada', () => {
    // Es deliberado que NO esté en API_ROUTE_PERMISSIONS: el GET limita a datos propios
    // en el handler, /me cubre a la app móvil y las escrituras piden su par con
    // withRoute (más fino que un gate por prefijo). Si un día cambia esa decisión,
    // actualizá este test y la documentación de las dos listas juntas.
    const fuente = read('lib/constants/route-permissions.ts');

    expect(API_ROUTE_PERMISSIONS['/api/gratificaciones']).toBeUndefined();
    expect(AUTHENTICATED_ONLY_APIS).toContain('/api/gratificaciones');
    expect(fuente).toContain('/api/gratificaciones` NO está acá a propósito');
  });
});

describe('matrixFlagsFor · la traducción de un par del catálogo a flags', () => {
  const gratificaciones = { read: false, write: false, edit: false, delete: false };

  it('edit concede write (traducido) y además su flag homónimo', () => {
    expect(matrixFlagsFor(gratificaciones, 'edit')).toEqual(['write', 'edit']);
  });

  it('create NO concede el flag edit: solo write (el cajero no puede editar)', () => {
    expect(matrixFlagsFor(gratificaciones, 'create')).toEqual(['write']);
  });

  it('view → read; delete → delete una sola vez, sin duplicados', () => {
    expect(matrixFlagsFor(gratificaciones, 'view')).toEqual(['read']);
    expect(matrixFlagsFor(gratificaciones, 'delete')).toEqual(['delete']);
  });

  it('acciones sin flag en el módulo no conceden nada', () => {
    // `permissions` no está en la matriz: la UI lo lee del catálogo crudo.
    expect(matrixFlagsFor(gratificaciones, 'permissions')).toEqual([]);
    // Módulo sin flag homónimo: `edit` traducido alcanza, el homónimo no existe.
    expect(matrixFlagsFor({ read: false, write: false, delete: false }, 'edit')).toEqual(['write']);
  });
});
