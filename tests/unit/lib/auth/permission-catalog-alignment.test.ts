// @vitest-environment node
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { PROJECT_ROOT } from '../api/_walk-helpers';
import {
  API_ROUTE_PERMISSIONS,
  ROUTE_PERMISSIONS,
  SIDEBAR_PERMISSION_OVERRIDES
} from '@/lib/constants/route-permissions';

/**
 * Alineación entre lo que la UI pide y el catálogo de permisos.
 *
 * El catálogo (`permissions`) es el vocabulario único: la UI consulta pares
 * módulo/acción contra él (`hasPermission(módulo, acción)` y `<PermissionGuard>`) y
 * las tablas de rutas del middleware lo consultan por SQL. Si un par no existe en el
 * catálogo, ningún rol puede satisfacerlo: el control queda invisible para todos los
 * no-administradores y el administrador no tiene forma de concederlo desde el panel
 * de Roles. Pasó con 30 pares (nombres en español como `productos.eliminar`, o
 * acciones que nunca se modelaron como `rooms.occupy`), con el módulo inexistente
 * `payroll_details` en la tabla de rutas, y con `products.write` en un guard.
 *
 * Este test lee el catálogo de sus fuentes reales (el dump de esquema y las
 * migraciones), recorre la UI y las tablas de rutas, y falla si algo pide un par que
 * el catálogo no tenga. Si falla al agregar un control: agregá el permiso al
 * catálogo con una migración (patrón de 036) o usá el par que ya exista.
 */

const CATALOG_SOURCES = [
  path.join(PROJECT_ROOT, 'database', 'lasmunecasderamon.postgres.sql'),
  ...fs
    .readdirSync(path.join(PROJECT_ROOT, 'migrations'))
    .filter(name => name.endsWith('.sql'))
    .sort()
    .map(name => path.join(PROJECT_ROOT, 'migrations', name))
];

const UI_DIRS = ['components', 'app', 'hooks', 'contexts'];
/**
 * `app/api` queda afuera: las guardas de las rutas usan la matriz de flags
 * (`{ module: 'categories', action: 'write' }`), no pares del catálogo. Esa capa la
 * fijan los tipos de `withRoute` y el test `route-authorization-matrix`.
 */
const IGNORED_DIRS = new Set(['node_modules', '.next', '.git', 'api']);

/** Separa una lista SQL por comas de primer nivel (ignora comas dentro de literales). */
function splitTopLevel(text: string): string[] {
  const out: string[] = [];
  let current = '';
  let inQuote = false;
  let depth = 0;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (char === "'") {
      inQuote = !inQuote;
      current += char;
      continue;
    }
    if (!inQuote) {
      if (char === '(') depth++;
      else if (char === ')') depth--;
      else if (char === ',' && depth === 0) {
        out.push(current);
        current = '';
        continue;
      }
    }
    current += char;
  }
  if (current.trim()) out.push(current);
  return out.map(part => part.trim());
}

/** Valor de un campo SQL: el contenido del literal, o '' si no es un literal. */
function literalValue(field: string): { value: string } | null {
  const match = /^'(?:[^']|'')*'$/.test(field.trim());
  return match ? { value: field.trim().slice(1, -1).replace(/''/g, "'") } : null;
}

/** Instrucciones `INSERT INTO permissions ...` de un archivo SQL, sin el `;` final. */
function permissionInserts(sql: string): { columns: string[]; body: string }[] {
  const out: { columns: string[]; body: string }[] = [];
  const pattern = /INSERT\s+INTO\s+permissions\s*\(([^)]*)\)([\s\S]*?);/gi;
  for (const match of sql.matchAll(pattern)) {
    out.push({
      columns: match[1].split(',').map(column => column.trim()),
      body: match[2]
    });
  }
  return out;
}

/** Pares (módulo, acción) declarados en un INSERT del catálogo. */
function pairsFromInsert(columns: string[], body: string): string[] {
  const moduleIndex = columns.indexOf('module');
  const actionIndex = columns.indexOf('action');
  if (moduleIndex < 0 || actionIndex < 0) return [];

  const pairs: string[] = [];
  const push = (fields: string[]) => {
    const modulo = literalValue(fields[moduleIndex] ?? '');
    const action = literalValue(fields[actionIndex] ?? '');
    if (modulo && action) pairs.push(`${modulo.value}.${action.value}`);
  };

  const valuesMatch = /\bVALUES\b/i.exec(body);
  if (valuesMatch) {
    // Tuplas `(...), (...), ...` después de VALUES.
    const tuples = body
      .slice(valuesMatch.index + valuesMatch[0].length)
      .match(/\(([^()]|'[^']*')*\)/g);
    for (const tuple of tuples ?? []) {
      push(splitTopLevel(tuple.slice(1, -1)));
    }
  } else {
    // `INSERT INTO permissions (...) SELECT 'id', 'nombre', 'desc', 'modulo', 'accion', ...`
    const selectMatch = /\bSELECT\b([\s\S]*)$/i.exec(body);
    const fields = selectMatch ? splitTopLevel(selectMatch[1].split(/\bWHERE\b/i)[0]) : [];
    push(fields);
  }

  // Cualquier `module = 'x' AND action = 'y'` del statement (WHERE / ON ...).
  for (const match of body.matchAll(
    /module\s*=\s*'([^']+)'[\s\S]{0,120}?action\s*=\s*'([^']+)'/gi
  )) {
    pairs.push(`${match[1]}.${match[2]}`);
  }
  return pairs;
}

/** Catálogo completo leído del dump y de las migraciones. */
function readCatalog(): Map<string, string> {
  const catalog = new Map<string, string>();
  for (const file of CATALOG_SOURCES) {
    const sql = fs.readFileSync(file, 'utf8');
    for (const { columns, body } of permissionInserts(sql)) {
      for (const pair of pairsFromInsert(columns, body)) {
        if (!catalog.has(pair)) catalog.set(pair, path.relative(PROJECT_ROOT, file));
      }
    }
  }
  return catalog;
}

interface Request {
  module: string;
  action: string;
  file: string;
}

/** Pares que pide la UI: `hasPermission`, `hasAnyPermission`, `hasAllPermissions` y `<PermissionGuard>`. */
function readUiRequests(): Request[] {
  const requests: Request[] = [];

  const walk = (dir: string) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (IGNORED_DIRS.has(entry.name)) continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full);
        continue;
      }
      if (!/\.(ts|tsx)$/.test(entry.name)) continue;

      const source = fs.readFileSync(full, 'utf8');
      const file = path.relative(PROJECT_ROOT, full).split(path.sep).join('/');
      const add = (module: string, action: string) => requests.push({ module, action, file });

      for (const match of source.matchAll(/hasPermission\(\s*'([^']+)'\s*,\s*'([^']+)'/g)) {
        add(match[1], match[2]);
      }
      // Pares escritos como literal en la UI (p. ej. un arreglo de acciones con
      // `{ module: 'payroll', action: 'view' }`): también se alinean al catálogo.
      // Las rutas ya no se declaran así: viven en `lib/constants/route-permissions`.
      for (const match of source.matchAll(/module:\s*'([^']+)'\s*,\s*action:\s*'([^']+)'/g)) {
        add(match[1], match[2]);
      }
      for (const match of source.matchAll(/hasAnyPermission\(\s*'([^']+)'/g)) {
        add(match[1], '*');
      }
      for (const match of source.matchAll(/hasAllPermissions\(\s*'([^']+)'\s*,\s*\[([^\]]*)\]/g)) {
        for (const action of match[2].matchAll(/'([^']+)'/g)) add(match[1], action[1]);
      }
      for (const match of source.matchAll(/<PermissionGuard[\s\S]*?\/?>/g)) {
        const tag = match[0];
        const modulo = tag.match(/module='([^']+)'/);
        if (!modulo) continue;
        const action = tag.match(/action='([^']+)'/);
        if (action) add(modulo[1], action[1]);
        else add(modulo[1], '*');
        const actionsProp = tag.match(/actions=\{\[([^\]]*)\]\}/);
        for (const extra of actionsProp?.[1].matchAll(/'([^']+)'/g) ?? []) {
          add(modulo[1], extra[1]);
        }
      }
    }
  };

  for (const dir of UI_DIRS) {
    const full = path.join(PROJECT_ROOT, dir);
    if (fs.existsSync(full)) walk(full);
  }
  return requests;
}

const catalog = readCatalog();
const uiRequests = readUiRequests();

const describeMissing = (missing: Request[]): string =>
  missing.map(({ module, action, file }) => `  ${module}.${action}  <- ${file}`).join('\n');

describe('catálogo de permisos', () => {
  it('las fuentes SQL declaran el catálogo completo', () => {
    // Guarda del parser: si esto falla, el test de abajo no prueba nada.
    expect(catalog.size).toBeGreaterThan(100);
    for (const pair of ['users.view', 'rooms.occupy', 'products.return_container']) {
      expect(catalog.has(pair), `falta ${pair} en el catálogo leído`).toBe(true);
    }
  });

  it('todo par módulo/acción que pide la UI existe en el catálogo', () => {
    const missing = uiRequests.filter(({ module, action }) =>
      action === '*'
        ? ![...catalog.keys()].some(pair => pair.startsWith(`${module}.`))
        : !catalog.has(`${module}.${action}`)
    );

    expect(
      missing,
      `\nPares que la UI pide y el catálogo no tiene:\n${describeMissing(missing)}\n`
    ).toEqual([]);
  });

  it('la tabla compartida de rutas y menú usa pares del catálogo', () => {
    const missing: Request[] = [];
    // Las tres tablas del mapa único más las excepciones del menú: si una pide un par
    // que el catálogo no tiene, ningún rol puede concederlo y el control queda muerto.
    const tablas = {
      ROUTE_PERMISSIONS,
      API_ROUTE_PERMISSIONS,
      SIDEBAR_PERMISSION_OVERRIDES
    };
    for (const [table, routes] of Object.entries(tablas)) {
      for (const [route, { module, action }] of Object.entries(routes)) {
        if (!catalog.has(`${module}.${action}`)) {
          missing.push({ module, action, file: `${table}['${route}']` });
        }
      }
    }

    expect(
      missing,
      `\nRutas cuyo permiso no existe en el catálogo:\n${describeMissing(missing)}\n`
    ).toEqual([]);
  });
});

describe('llamados de la UI', () => {
  it('no quedaron pares con vocabulario muerto (módulos o acciones en español)', () => {
    // Lista negra por forma: si reaparece un alias en español, el test lo nombra.
    const dead = uiRequests.filter(
      ({ module, action }) =>
        /^(productos|cuentas|pedidos|anticipos|detalle_planilla|habitaciones)$/.test(module) ||
        /^(eliminar|editar|activar|desactivar|crear|cobrar|ver_detalles|asignar_permisos|editar_categoria|agregar_productos|ventas|write)$/.test(
          action
        )
    );

    expect(
      dead,
      `\nLlamados con vocabulario que el catálogo no conoce:\n${describeMissing(dead)}\n`
    ).toEqual([]);
  });
});
