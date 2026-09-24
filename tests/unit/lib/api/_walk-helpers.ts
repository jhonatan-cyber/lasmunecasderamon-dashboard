import path from 'node:path';
import fs from 'node:fs';

/**
 * Raíz del proyecto. Los tests corren desde la raíz, pero el import de vitest resuelve
 * relativo al archivo, así que se sube hasta encontrar `package.json`.
 */
export function findProjectRoot(start: string): string {
  let dir = path.resolve(start);
  while (!fs.existsSync(path.join(dir, 'package.json'))) {
    const parent = path.dirname(dir);
    if (parent === dir) throw new Error('No se encontró package.json hacia arriba');
    dir = parent;
  }
  return dir;
}

export const PROJECT_ROOT = findProjectRoot(__dirname);

export const API_ROOT = path.join(PROJECT_ROOT, 'app', 'api');

/** Ruta URL de un archivo `route.ts` (p. ej. `app/api/users/[id]/route.ts` → `/api/users/[id]`). */
export function routeFromFilePath(filePath: string): string {
  // El walker devuelve rutas absolutas: se relativizan a la raíz del proyecto antes
  // de quitar el prefijo `app/`.
  const rel = path.relative(PROJECT_ROOT, filePath).split(path.sep).join('/');
  return '/' + rel.replace(/^app\//, '').replace(/\/route\.ts$/, '');
}

export function listApiRouteFiles(): string[] {
  const files: string[] = [];
  const visit = (dir: string) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        visit(full);
        continue;
      }
      if (entry.name === 'route.ts') files.push(full);
    }
  };
  visit(API_ROOT);
  return files.sort();
}

export interface ExportedMethod {
  method: string;
  /** Texto desde `export ...` hasta ~600 caracteres después, para clasificar el guard. */
  snippet: string;
}

/** Exportaciones de handlers HTTP de un archivo, con el texto circundante. */
export function exportedMethods(source: string): ExportedMethod[] {
  const out: ExportedMethod[] = [];
  const re = /export\s+(?:const|async\s+function)\s+(GET|POST|PUT|PATCH|DELETE|HEAD)\b/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(source))) {
    out.push({ method: m[1], snippet: source.slice(m.index, m.index + 600) });
  }
  return out;
}

export type GuardLevel =
  | 'withRoute:permission'
  | 'withRoute:administrator'
  | 'withRoute:authenticated'
  | 'withRoute:public'
  | 'withPublicRoute'
  | 'bare'
  | 'custom-wrapper';

/**
 * Nivel de acceso declarado por el handler, leído del código fuente.
 *
 * `custom-wrapper` cubre composiciones de proyecto sobre withRoute/withPublicRoute,
 * que se verifican con la lista blanca de la política.
 */
export function classifyGuard(method: string, snippet: string): GuardLevel {
  const callMatch = new RegExp(
    `export\\s+(?:const|async\\s+function)\\s+${method}\\b[^=]*=\\s*([A-Za-z_$][\\w$]*)\\s*\\(`
  ).exec(snippet);
  const wrapper = callMatch?.[1];

  // `export const POST = async (request) => ...` es un handler pelado, no un wrapper.
  if (!wrapper || wrapper === 'async' || wrapper === 'function') return 'bare';
  if (wrapper === 'withPublicRoute') return 'withPublicRoute';
  if (wrapper === 'withRoute') {
    const cfg = snippet.slice(snippet.indexOf('withRoute('));
    if (/auth\s*:\s*true/.test(cfg)) {
      if (/module\s*:/.test(cfg)) return 'withRoute:permission';
      if (/access\s*:\s*'administrator'/.test(cfg)) return 'withRoute:administrator';
      if (/access\s*:\s*'authenticated'/.test(cfg)) return 'withRoute:authenticated';
      return 'withRoute:public';
    }
    return 'withRoute:public';
  }
  if (wrapper && wrapper !== 'undefined') return 'custom-wrapper';
  return 'bare';
}
