// @vitest-environment node
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { listApiRouteFiles, routeFromFilePath } from '../api/_walk-helpers';
import {
  API_ROUTE_PERMISSIONS,
  fromMatrixModule,
  httpActionForMethod,
  toMatrixAction,
  toMatrixModule
} from '@/lib/constants/route-permissions';

/**
 * Middleware y handlers usan vocabularios distintos para la misma autorización:
 *
 *  - El middleware (`proxy.ts`) consulta el catálogo por SQL con pares
 *    `módulo.acción` (`cash_register.view`) o su derivación HTTP
 *    (POST→create, PUT/PATCH→edit, DELETE→delete).
 *  - El handler (`withRoute`) verifica la matriz de flags de `lib/middleware/auth`
 *    (`finances.write`), que es la traducción del catálogo.
 *
 * La traducción vive en un solo lugar (`toMatrixAction`/`toMatrixModule` en
 * `lib/constants/route-permissions`); este test la usa en la dirección inversa para
 * emparejar ambos lados y fallar si divergen. Antes se desincronizaron: `withRoute`
 * aceptaba 15 alias de acción y 22 de módulo que el catálogo no conoce.
 *
 * Con esto, agregar una ruta bajo un prefijo gateado obliga a que el handler declare el
 * módulo Y la acción del gate (o documentar la excepción acá con su motivo, apuntando
 * al método), y quitar el guard del GET de un prefijo gateado obliga a mover la entrada
 * de API_ROUTE_PERMISSIONS.
 */

interface HandlerGuard {
  route: string;
  method: string;
  module: string | null;
  action: string | null;
  kind: 'permission' | 'authenticated' | 'administrator' | 'public';
}

/**
 * Excepciones documentadas, con clave `MÉTODO RUTA`: un handler bajo un prefijo
 * gateado que no se autovalida con el par del gate (o que no usa permiso de módulo).
 *
 * La clave por método importa: los GET de estas rutas son `withPublicRoute` y su
 * barrera es el gate del middleware, pero los POST/PUT/DELETE de la misma ruta SÍ
 * declaran el par (`roles.*`, `payroll.*`) y el test de abajo los verifica solos.
 * Con excepciones por ruta, el GET sin guard tapaba la revisión de su escritura.
 */
const EXCEPCIONES: Record<string, string> = {
  // Lecturas del ciclo de roles: el gate `roles.view` vive en el middleware (por eso
  // /api/roles figura en API_ROUTE_PERMISSIONS); el handler no repite el check y solo
  // arma la respuesta. Es el mismo par que exige la página /roles para entrar.
  'GET /api/roles': 'lectura del ciclo de roles: gateada por el middleware (roles.view)',
  'GET /api/roles/[id]': 'lectura del ciclo de roles: gateada por el middleware (roles.view)',
  'GET /api/roles/[id]/permissions':
    'lectura del ciclo de roles: gateada por el middleware (roles.view)',
  'GET /api/roles/[id]/users': 'lectura del ciclo de roles: gateada por el middleware (roles.view)',
  'GET /api/roles/admin/permissions':
    'lectura del ciclo de roles: gateada por el middleware (roles.view)',
  // Lecturas de reportes y planillas: ídem con sus pares (reports.view, payroll.view).
  'GET /api/reports/cash-register': 'lectura de reportes: gateada por el middleware (reports.view)',
  'GET /api/reports/commissions': 'lectura de reportes: gateada por el middleware (reports.view)',
  'GET /api/reports/sales': 'lectura de reportes: gateada por el middleware (reports.view)',
  'GET /api/payroll': 'resumen de planillas: gateado por el middleware (payroll.view)',
  // Seed de roles por defecto si la tabla está vacía: administración sensible, no un
  // permiso de módulo. Lo puede disparar cualquier administrador desde la UI de Roles.
  'POST /api/roles/setup': 'seed de roles: access administrator, no un permiso de módulo'
};

/** Par módulo/acción del catálogo declarado en el config de un withRoute. */
function parseHandlerGuard(snippet: string): { module: string; action: string } | null {
  const moduleMatch = /module:\s*'([a-z_]+)'/.exec(snippet);
  const actionMatch = /action:\s*'([a-z_]+)'/.exec(snippet);
  return moduleMatch && actionMatch ? { module: moduleMatch[1], action: actionMatch[1] } : null;
}

/** Nivel de guard del handler, leído del snippet de su export. */
function guardKind(snippet: string): HandlerGuard['kind'] {
  if (!/withRoute\(/.test(snippet)) return 'public';
  const cfg = snippet.slice(snippet.indexOf('withRoute('));
  if (/module\s*:/.test(cfg)) return 'permission';
  if (/access\s*:\s*'administrator'/.test(cfg)) return 'administrator';
  if (/access\s*:\s*'authenticated'/.test(cfg)) return 'authenticated';
  return 'public';
}

/** Handlers con guard de permiso, derivados del código fuente de app/api. */
function deriveHandlers(): HandlerGuard[] {
  const out: HandlerGuard[] = [];
  for (const file of listApiRouteFiles()) {
    const source = fs.readFileSync(file, 'utf8');
    const route = routeFromFilePath(file);
    const re = /export\s+(?:const|async\s+function)\s+(GET|POST|PUT|PATCH|DELETE|HEAD)\b/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(source))) {
      // Ventana hasta el próximo export (o fin de archivo): el snippet fijo se filtraba
      // al export siguiente y leía su config.
      const next = source.indexOf('export ', m.index + 10);
      const snippet = source.slice(m.index, next === -1 ? source.length : next);
      const kind = guardKind(snippet);
      const pair = kind === 'permission' ? parseHandlerGuard(snippet) : null;
      out.push({
        route,
        method: m[1],
        module: pair ? fromMatrixModule(pair.module) : null,
        // Flag de matriz tal cual lo declara el handler: la comparación contra el gate
        // se hace en vocabulario de matriz (`toMatrixAction` de la acción derivada),
        // porque el catálogo es más fino (roles.create y roles.edit conceden el mismo
        // write de la matriz).
        action: pair ? pair.action : null,
        kind
      });
    }
  }
  return out;
}

const handlers = deriveHandlers();

/** Prefijo gateado que cubre esta ruta, según la tabla del middleware. */
function coveringGate(route: string): { prefix: string; module: string; action: string } | null {
  const entry = Object.keys(API_ROUTE_PERMISSIONS)
    .sort((a, b) => b.length - a.length)
    .find(prefix => route === prefix || route.startsWith(prefix + '/'));
  return entry ? { prefix: entry, ...API_ROUTE_PERMISSIONS[entry] } : null;
}

describe('traducción catálogo ↔ matriz (única copia)', () => {
  it('es la inversa una de la otra para cada acción del catálogo', () => {
    // Las acciones que el catálogo declara y la matriz sabe expresar.
    const pares = [
      ['cash_register', 'view'],
      ['cash_register', 'view_details'],
      ['cash_register', 'open'],
      ['cash_register', 'close'],
      ['cash_register', 'withdraw'],
      ['users', 'view'],
      ['users', 'create'],
      ['users', 'edit'],
      ['users', 'delete'],
      ['products', 'accept_transfer'],
      ['orders', 'process'],
      ['sales', 'anulate'],
      ['reports', 'export']
    ] as const;

    for (const [modulo, action] of pares) {
      const matrixModule = toMatrixModule(modulo);
      const matrixAction = toMatrixAction(action);
      // La matriz concede ese flag, y el inverso vuelve al módulo original.
      expect(fromMatrixModule(matrixModule), `${modulo}.${action}`).toBe(modulo);
      // El inverso de la acción devuelve el vocabulario de withRoute (read/write/…):
      // es lo que el handler declara, no la acción original del catálogo.
      expect(typeof matrixAction, `${modulo}.${action} se traduce`).toBe('string');
      expect(
        matrixAction.length,
        `${modulo}.${action} se traduce a un flag conocido`
      ).toBeGreaterThan(0);
    }
  });

  it('las acciones en español siguen sin traducción (vocabulario muerto)', () => {
    // El catálogo es todo en inglés; si reaparecieran, la traducción los escondería.
    for (const legacy of ['eliminar', 'editar', 'crear', 'listar_ventas', 'ver_detalles']) {
      expect(toMatrixAction(legacy), legacy).toBe(legacy);
    }
  });
});

describe('el gate del middleware y los handlers no divergen', () => {
  it('existe al menos un prefijo gateado que emparejar', () => {
    expect(Object.keys(API_ROUTE_PERMISSIONS).length).toBeGreaterThan(0);
  });

  it('cada prefijo gateado tiene algún handler que dependa del middleware', () => {
    for (const prefix of Object.keys(API_ROUTE_PERMISSIONS)) {
      const debajo = handlers.filter(h => h.route === prefix || h.route.startsWith(prefix + '/'));
      expect(
        debajo.length,
        `${prefix} no tiene handlers: la entrada del middleware no protege nada`
      ).toBeGreaterThan(0);

      // La entrada es load-bearing mientras exista un handler que no se autovalide con
      // el permiso (público o solo-sesión): para él, el gate del middleware ES la barrera.
      const autovalidados = debajo.filter(h => h.kind === 'permission');
      expect(
        autovalidados.length,
        `${prefix}: todos sus handlers declaran el permiso; la entrada de ` +
          `API_ROUTE_PERMISSIONS es letra muerta. Mové la entrada o cambiá el guard.`
      ).toBeLessThan(debajo.length);
    }
  });

  it('cada handler bajo un prefijo gateado declara el par del gate o su excepción', () => {
    const violaciones: string[] = [];

    for (const handler of handlers) {
      const gate = coveringGate(handler.route);
      if (!gate) continue;

      const key = `${handler.method} ${handler.route}`;
      const excepcion = EXCEPCIONES[key];
      if (excepcion) {
        // La excepción existe con motivo; solo exigimos que siga siendo real.
        expect(
          excepcion.length,
          `${key}: el motivo de la excepción es demasiado corto`
        ).toBeGreaterThan(10);
        continue;
      }

      if (handler.kind !== 'permission') {
        violaciones.push(`${key}: sin guard de permiso`);
        continue;
      }

      if (handler.module !== gate.module) {
        violaciones.push(
          `${key}: el gate de ${gate.prefix} exige ${gate.module}, el handler declara ` +
            `${handler.module}`
        );
        continue;
      }

      // La acción también: el middleware deriva el método sobre la acción declarada
      // (httpActionForMethod) y el handler la exige como flag de matriz. Ambas caras
      // se comparan en matriz, no en catálogo.
      const esperada = toMatrixAction(httpActionForMethod(handler.method, gate.action));
      if (handler.action !== esperada) {
        violaciones.push(
          `${key}: el gate exige ${gate.module}.${esperada} vía ${handler.method}, el handler ` +
            `declara ${handler.module}.${handler.action}`
        );
      }
    }

    expect(
      violaciones,
      `\nHandlers bajo un prefijo gateado sin guard coherente:\n${violaciones.join('\n')}\n` +
        'Declará el par del catálogo en el withRoute o documentá la excepción en EXCEPCIONES.\n'
    ).toEqual([]);
  });

  it('las excepciones documentadas apuntan a handlers que existen', () => {
    const reales = new Set(handlers.map(h => `${h.method} ${h.route}`));
    for (const key of Object.keys(EXCEPCIONES)) {
      expect(reales.has(key), `${key} ya no existe: sacá la excepción`).toBe(true);
    }
  });
});
