#!/usr/bin/env node
/**
 * Verifica que todo archivo que usa hooks de React tenga 'use client'.
 *
 * Next.js 16 con Turbopack exige la directiva en cualquier archivo que importe
 * hooks de cliente: los de React (react y react-dom) y los de TanStack Query.
 *
 * La regla no enumera nombres: cualquier import de esos paquetes que empiece por
 * `use` más mayúscula (o el `use` suelto de React 19) es un hook. La lista fija
 * anterior dejaba fuera useId, useTransition, useOptimistic, useDeferredValue,
 * useSyncExternalStore, useActionState, useFormStatus y useQueryClient, así que
 * un archivo que sólo usaba esos pasaba el chequeo sin directiva.
 *
 * Sin dependencias ni shell aparte: el mismo comando corre en Windows, en Linux
 * y en CI. Antes esto era un .ps1 y por eso el escaneo completo solo podía
 * ejecutarse en una máquina con PowerShell.
 *
 *   node scripts/check-use-client.mjs            # árbol completo (CI; ~1685 archivos)
 *   node scripts/check-use-client.mjs --staged   # solo el índice (pre-commit)
 *
 * Sale con 0 si no hay violaciones y con 1 si las hay.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { pathToFileURL } from 'node:url';

/** Directorios que nunca se revisan, a cualquier profundidad. */
const DIRECTORIOS_EXCLUIDOS = new Set(['node_modules', '.next', '.git', '.agents']);
/** Más exclusiones por ruta: los tests levantan hooks sin ser componentes. */
const RUTA_EXCLUIDA = /(^|\/)tests\/(unit|e2e)(\/|$)/;

/** Paquetes cuyos hooks sólo existen en el cliente. */
const PAQUETES_CON_HOOKS = new Set(['react', 'react-dom', '@tanstack/react-query']);
/** `useState`, `useTransition` o el `use` suelto de React 19; no `user` ni `useful`. */
const NOMBRE_DE_HOOK = /^use($|[A-Z])/;
/** Import con nombres; el `[^;]` evita saltar de una sentencia a la siguiente. */
const IMPORTACION = /import\s+(?!type\b)([^;]*?)\s+from\s+['"]([^'"]+)['"]/g;

/** 'use client' en la primera o segunda línea (con o sin comentario de ESLint). */
const DIRECTIVA = /^['"]use client['"]/i;

/** Raíz del repo según git, para que el escaneo funcione desde un subdirectorio. */
function raizDelRepo() {
  try {
    return execFileSync('git', ['rev-parse', '--show-toplevel'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore']
    }).trim();
  } catch {
    return process.cwd();
  }
}

const aRelativa = (raiz, absoluta) => relative(raiz, absoluta).split(sep).join('/');

/** `'use client'` como primera sentencia, admitiendo un comentario de ESLint. */
export function tieneDirectiva(lineas) {
  const primera = lineas[0] ?? '';
  if (DIRECTIVA.test(primera)) return true;
  const segunda = lineas[1] ?? '';
  // Línea 1 vacía, o comentario de ESLint, y 'use client' justo después.
  if (primera.trim() === '' && DIRECTIVA.test(segunda)) return true;
  if (primera.startsWith('/*') && DIRECTIVA.test(segunda)) return true;
  return false;
}

/** Nombres de hook importados desde react, react-dom o TanStack Query. */
export function hooksImportados(contenido) {
  const hooks = new Set();
  for (const [, clausula, modulo] of contenido.matchAll(IMPORTACION)) {
    if (!PAQUETES_CON_HOOKS.has(modulo)) continue;
    const conLlaves = clausula.match(/\{([\s\S]*?)\}/);
    if (!conLlaves) continue;
    for (const especificador of conLlaves[1].split(',')) {
      // Cuenta el nombre importado, no el alias; `type X` no es un hook.
      const nombre = especificador
        .trim()
        .replace(/^type\s+/, '')
        .split(/\s+as\s+/)[0]
        .trim();
      if (NOMBRE_DE_HOOK.test(nombre)) hooks.add(nombre);
    }
  }
  return [...hooks];
}

/** Importa al menos un hook de cliente y no declara la directiva. */
export function usaHooksSinDirectiva(contenido) {
  const lineas = contenido.replace(/^\uFEFF/, '').split(/\r?\n/);
  if (tieneDirectiva(lineas)) return false;
  return hooksImportados(contenido).length > 0;
}

/** Recorre el árbol podando directorios excluidos (no los visita). */
export function archivosDelArbol(raiz) {
  const encontrados = [];
  const recorrer = directorio => {
    for (const entrada of readdirSync(directorio, { withFileTypes: true })) {
      const completo = join(directorio, entrada.name);
      const relativa = aRelativa(raiz, completo);
      if (entrada.isDirectory()) {
        if (DIRECTORIOS_EXCLUIDOS.has(entrada.name)) continue;
        if (RUTA_EXCLUIDA.test(`${relativa}/`)) continue;
        recorrer(completo);
      } else if (/\.tsx?$/i.test(entrada.name)) {
        encontrados.push({ completo, relativa });
      }
    }
  };
  recorrer(raiz);
  return encontrados.sort((a, b) => a.relativa.localeCompare(b.relativa));
}

/** Solo los .ts/.tsx del índice, como los ve `git commit`. */
export function archivosDelIndice(raiz) {
  const salida = execFileSync(
    'git',
    ['diff', '--cached', '--name-only', '--diff-filter=ACMR', '--', '*.ts', '*.tsx'],
    { encoding: 'utf8', cwd: raiz }
  );
  return salida
    .split('\n')
    .map(linea => linea.trim().replace(/\\/g, '/'))
    .filter(Boolean)
    .filter(relativa => !relativa.split('/').some(segmento => DIRECTORIOS_EXCLUIDOS.has(segmento)))
    .filter(relativa => !RUTA_EXCLUIDA.test(relativa))
    .map(relativa => ({ completo: join(raiz, relativa), relativa }))
    .filter(({ completo }) => existsSync(completo))
    .sort((a, b) => a.relativa.localeCompare(b.relativa));
}

/**
 * Revisa los archivos del árbol o del índice y devuelve el veredicto, sin
 * imprimir nada: así los tests pueden comprobarlo sin capturar stdout.
 */
export function analizar({ raiz = raizDelRepo(), staged = false } = {}) {
  const archivos = staged ? archivosDelIndice(raiz) : archivosDelArbol(raiz);
  const violaciones = [];
  let revisados = 0;
  let omitidos = 0;

  for (const { completo, relativa } of archivos) {
    revisados++;
    let contenido;
    try {
      contenido = readFileSync(completo, 'utf8');
    } catch {
      omitidos++;
      continue;
    }
    if (contenido === '') {
      omitidos++;
      continue;
    }
    if (usaHooksSinDirectiva(contenido)) violaciones.push(relativa);
  }

  return { alcance: staged ? 'del índice' : 'del árbol', revisados, omitidos, violaciones };
}

function main() {
  const { alcance, revisados, omitidos, violaciones } = analizar({
    staged: process.argv.includes('--staged')
  });

  if (violaciones.length > 0) {
    console.error('');
    console.error('========================================');
    console.error("  ERROR: Archivos sin 'use client'");
    console.error('========================================');
    console.error('Los siguientes archivos usan React hooks');
    console.error("pero NO tienen 'use client' en la primera línea:");
    console.error('');
    for (const violacion of violaciones) console.error(`  ❌ ${violacion}`);
    console.error('');
    console.error("Agregá 'use client' al inicio de cada archivo.");
    console.error(
      `Revisados ${alcance}: ${revisados} | Omitidos: ${omitidos} | Errores: ${violaciones.length}`
    );
    process.exit(1);
  }

  console.log("✅ Todos los archivos revisados tienen 'use client'");
  console.log(`   Revisados ${alcance}: ${revisados} | Omitidos (vacíos): ${omitidos}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
