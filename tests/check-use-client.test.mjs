import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  analizar,
  archivosDelArbol,
  archivosDelIndice,
  usaHooksSinDirectiva
} from '../scripts/check-use-client.mjs';

const RUTA_SCRIPT = fileURLToPath(new URL('../scripts/check-use-client.mjs', import.meta.url));

/** Componente con hooks de React y sin directiva: la violación de referencia. */
const VIOLACION = [
  "import { useState } from 'react';",
  '',
  'export function Contador() {',
  '  const [n] = useState(0);',
  '  return n;',
  ''
].join('\n');

const CON_DIRECTIVA = `${"'use client';"}\n${VIOLACION}`;

/** Árbol temporal con los archivos dados; el test lo borra al terminar. */
function crearArbol(t, archivos) {
  const raiz = mkdtempSync(join(tmpdir(), 'use-client-'));
  for (const [ruta, contenido] of Object.entries(archivos)) {
    const completo = join(raiz, ruta);
    mkdirSync(dirname(completo), { recursive: true });
    writeFileSync(completo, contenido);
  }
  t.after(() => rmSync(raiz, { recursive: true, force: true }));
  return raiz;
}

/** Árbol temporal con todo ya en el índice, para probar el modo --staged. */
function crearRepo(t, archivos) {
  const raiz = crearArbol(t, archivos);
  execFileSync('git', ['init', '--quiet'], { cwd: raiz });
  // autocrlf a false: en Windows global suele estar en true y llena la salida
  // del test con avisos de conversión que no vienen al caso.
  execFileSync('git', ['-c', 'core.autocrlf=false', 'add', '-A'], { cwd: raiz });
  return raiz;
}

test('acepta la directiva en la primera línea, con comillas simples o dobles', () => {
  assert.equal(usaHooksSinDirectiva(CON_DIRECTIVA), false);
  assert.equal(usaHooksSinDirectiva(`"use client";\n${VIOLACION}`), false);
});

test('acepta la directiva tras una línea vacía o un comentario de ESLint', () => {
  assert.equal(usaHooksSinDirectiva(`\n${CON_DIRECTIVA}`), false);
  assert.equal(
    usaHooksSinDirectiva(`/* eslint-disable react-hooks/rules-of-hooks */\n${CON_DIRECTIVA}`),
    false
  );
});

test('ignora el BOM y los finales de línea CRLF al buscar la directiva', () => {
  assert.equal(usaHooksSinDirectiva(`\uFEFF${CON_DIRECTIVA}`), false);
  assert.equal(usaHooksSinDirectiva(CON_DIRECTIVA.replace(/\n/g, '\r\n')), false);
  assert.equal(usaHooksSinDirectiva(VIOLACION.replace(/\n/g, '\r\n')), true);
});

test('detecta hooks de React y de TanStack Query sin directiva', () => {
  assert.equal(usaHooksSinDirectiva(VIOLACION), true);
  assert.equal(
    usaHooksSinDirectiva(
      [
        "import { useQuery } from '@tanstack/react-query';",
        '',
        'export const { data } = useQuery({});'
      ].join('\n')
    ),
    true
  );
});

test('no marca archivos que solo importan tipos de react', () => {
  assert.equal(
    usaHooksSinDirectiva(
      ["import type { ReactNode } from 'react';", '', 'export type Slot = ReactNode;', ''].join(
        '\n'
      )
    ),
    false
  );
});

test('el árbol revisa rutas con corchetes y solo poda node_modules, .next, .agents y tests unit/e2e', t => {
  const raiz = crearArbol(t, {
    'app/api/[id]/route.ts': VIOLACION,
    'app/api/[[...slug]]/route.ts': CON_DIRECTIVA,
    'app/vacio.ts': '',
    'node_modules/pkg/index.ts': VIOLACION,
    '.next/types/validators.ts': VIOLACION,
    '.agents/skills/x/script.ts': VIOLACION,
    'tests/unit/fixture.test.ts': VIOLACION,
    'tests/e2e/fixture.spec.ts': VIOLACION,
    'tests/postgres/consulta.ts': VIOLACION,
    'components/nota.md': 'no es TypeScript'
  });

  const relativas = archivosDelArbol(raiz).map(archivo => archivo.relativa);
  assert.deepEqual(
    [...relativas].sort(),
    [
      'app/api/[[...slug]]/route.ts',
      'app/api/[id]/route.ts',
      'app/vacio.ts',
      'tests/postgres/consulta.ts'
    ].sort()
  );

  const resultado = analizar({ raiz });
  assert.equal(resultado.alcance, 'del árbol');
  assert.equal(resultado.revisados, 4);
  assert.equal(resultado.omitidos, 1);
  // tests/postgres queda dentro del escaneo: solo unit y e2e están excluidos.
  assert.deepEqual(resultado.violaciones, ['app/api/[id]/route.ts', 'tests/postgres/consulta.ts']);
});

test('el modo --staged ve los archivos con corchetes (el .ps1 los saltaba)', t => {
  const raiz = crearRepo(t, { 'app/api/[id]/route.ts': VIOLACION });

  assert.deepEqual(
    archivosDelIndice(raiz).map(archivo => archivo.relativa),
    ['app/api/[id]/route.ts']
  );
  assert.deepEqual(analizar({ raiz, staged: true }).violaciones, ['app/api/[id]/route.ts']);
});

test('el CLI sale con 1 y nombra el archivo con corchetes', t => {
  const raiz = crearRepo(t, { 'app/api/[id]/route.ts': VIOLACION });

  const resultado = spawnSync(process.execPath, [RUTA_SCRIPT, '--staged'], {
    cwd: raiz,
    encoding: 'utf8'
  });

  assert.equal(resultado.status, 1);
  assert.match(resultado.stderr, /app\/api\/\[id\]\/route\.ts/);
  assert.match(resultado.stderr, /Revisados del índice: 1/);
});

test('el CLI sale con 0 cuando el índice está limpio', t => {
  const raiz = crearRepo(t, {
    'app/api/[id]/route.ts': CON_DIRECTIVA,
    'tests/unit/fixture.test.ts': VIOLACION
  });

  const resultado = spawnSync(process.execPath, [RUTA_SCRIPT, '--staged'], {
    cwd: raiz,
    encoding: 'utf8'
  });

  assert.equal(resultado.status, 0);
  assert.match(resultado.stdout, /Revisados del índice: 1/);
});
