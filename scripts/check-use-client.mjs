#!/usr/bin/env node
/**
 * Verifica que todo archivo que usa hooks de React tenga 'use client'.
 *
 * Next.js 16 con Turbopack exige la directiva en cualquier archivo que importe
 * hooks de React (useState, useEffect, useRef, useCallback, useMemo, useContext,
 * ...), y también en los que importan hooks de TanStack Query (useQuery,
 * useMutation) porque esos envuelven useRef.
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

const STAGED = process.argv.includes('--staged');

/** Directorios que nunca se revisan, a cualquier profundidad. */
const DIRECTORIOS_EXCLUIDOS = new Set(['node_modules', '.next', '.git', '.agents']);
/** Más exclusiones por ruta: los tests levantan hooks sin ser componentes. */
const RUTA_EXCLUIDA = /(^|\/)tests\/(unit|e2e)(\/|$)/;

/** Hooks de React; el `\s*[,}]` exige que vengan de una lista de imports. */
const HOOKS_REACT =
  /\buse(State|Effect|Ref|Callback|Memo|Context|Reducer|LayoutEffect|ImperativeHandle|DebugValue|InsertionEffect)\b\s*[,}]/i;
/** Hooks de TanStack Query (índice propio). */
const HOOKS_QUERY = /\buse(Mutation|Query)\b\s*[,}]/i;
const IMPORTA_REACT = /from\s+['"]react['"]/i;
const IMPORTA_QUERY = /from\s+['"]@tanstack\/react-query['"]/i;

/** 'use client' en la primera o segunda línea (con o sin comentario de ESLint). */
const DIRECTIVA = /^['"]use client['"]/i;

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

const RAIZ = raizDelRepo();

const aRelativa = absoluta => relative(RAIZ, absoluta).split(sep).join('/');

/** Recorre el árbol podando directorios excluidos (no los visita). */
function archivosDelArbol() {
  const encontrados = [];
  const recorrer = directorio => {
    for (const entrada of readdirSync(directorio, { withFileTypes: true })) {
      const completo = join(directorio, entrada.name);
      const relativa = aRelativa(completo);
      if (entrada.isDirectory()) {
        if (DIRECTORIOS_EXCLUIDOS.has(entrada.name)) continue;
        if (RUTA_EXCLUIDA.test(`${relativa}/`)) continue;
        recorrer(completo);
      } else if (/\.tsx?$/i.test(entrada.name)) {
        encontrados.push({ completo, relativa });
      }
    }
  };
  recorrer(RAIZ);
  return encontrados.sort((a, b) => a.relativa.localeCompare(b.relativa));
}

/** Solo los .ts/.tsx del índice, como los ve `git commit`. */
function archivosDelIndice() {
  const salida = execFileSync(
    'git',
    ['diff', '--cached', '--name-only', '--diff-filter=ACMR', '--', '*.ts', '*.tsx'],
    { encoding: 'utf8', cwd: RAIZ }
  );
  return salida
    .split('\n')
    .map(linea => linea.trim().replace(/\\/g, '/'))
    .filter(Boolean)
    .filter(relativa => !relativa.split('/').some(segmento => DIRECTORIOS_EXCLUIDOS.has(segmento)))
    .filter(relativa => !RUTA_EXCLUIDA.test(relativa))
    .map(relativa => ({ completo: join(RAIZ, relativa), relativa }))
    .filter(({ completo }) => existsSync(completo))
    .sort((a, b) => a.relativa.localeCompare(b.relativa));
}

function tieneDirectiva(lineas) {
  const primera = lineas[0] ?? '';
  if (DIRECTIVA.test(primera)) return true;
  const segunda = lineas[1] ?? '';
  // Línea 1 vacía, o comentario de ESLint, y 'use client' justo después.
  if (primera.trim() === '' && DIRECTIVA.test(segunda)) return true;
  if (primera.startsWith('/*') && DIRECTIVA.test(segunda)) return true;
  return false;
}

function usaHooksSinDirectiva(contenido) {
  const lineas = contenido.replace(/^\uFEFF/, '').split(/\r?\n/);
  if (tieneDirectiva(lineas)) return false;

  const importaReact = IMPORTA_REACT.test(contenido);
  const importaQuery = IMPORTA_QUERY.test(contenido);
  if (!importaReact && !importaQuery) return false;

  const usaReact = HOOKS_REACT.test(contenido);
  const usaQuery = HOOKS_QUERY.test(contenido);
  return usaReact || usaQuery;
}

const archivos = STAGED ? archivosDelIndice() : archivosDelArbol();
const alcance = STAGED ? 'del índice' : 'del árbol';

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
process.exit(0);
