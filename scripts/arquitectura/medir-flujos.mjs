#!/usr/bin/env node
/** Repite fixtures de PostgreSQL en serie y conserva latencias y conteos crudos. */
import { spawnSync, execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { tmpdir, cpus, platform, release } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { config } from 'dotenv';

const raiz = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
config({ path: join(raiz, '.env'), quiet: true });
if (
  !['127.0.0.1', 'localhost', '::1'].includes(process.env.DB_HOST || '') ||
  !process.env.DB_NAME?.endsWith('_test')
) {
  throw new Error('La medición exige DB_HOST local y DB_NAME terminado en _test');
}
const repeticiones = Number(process.env.BASELINE_RUNS ?? 7);
if (!Number.isInteger(repeticiones) || repeticiones < 3 || repeticiones > 30) {
  throw new Error('BASELINE_RUNS debe ser un entero entre 3 y 30');
}
const salida = resolve(raiz, process.argv[2] || 'docs/arquitectura/FASE0_TIEMPOS.json');
const temporal = mkdtempSync(join(tmpdir(), 'lmr-fase0-'));
const muestras = [];
const git = (...args) => execFileSync('git', args, { cwd: raiz, encoding: 'utf8' }).trim();
const revision = git('rev-parse', 'HEAD');
const cambios = git('status', '--short');
const estadisticas = valores => {
  const ordenados = [...valores].sort((a, b) => a - b);
  const mitad = Math.floor(ordenados.length / 2);
  return {
    min: ordenados[0],
    mediana:
      ordenados.length % 2 ? ordenados[mitad] : (ordenados[mitad - 1] + ordenados[mitad]) / 2,
    max: ordenados.at(-1)
  };
};

try {
  // La primera corrida completa calienta cachés del SO/servidor y se descarta.
  // Cada corrida abre un proceso nuevo; los fixtures restauran la base al salir.
  for (let i = 0; i <= repeticiones; i++) {
    const archivo = join(temporal, `${i}.json`);
    const resultado = spawnSync(
      process.execPath,
      [
        join(raiz, 'node_modules/vitest/vitest.mjs'),
        'run',
        '--config',
        'vitest.postgres.config.ts',
        'tests/postgres/linea-base-flujos.test.ts'
      ],
      {
        cwd: raiz,
        env: { ...process.env, BASELINE_OUTPUT: archivo },
        encoding: 'utf8',
        timeout: 180000,
        maxBuffer: 8 * 1024 * 1024
      }
    );
    if (resultado.error || resultado.status !== 0) {
      throw new Error(
        `Corrida ${i} falló: ${resultado.error?.message || ''}\n${resultado.stdout}\n${resultado.stderr}`
      );
    }
    const corrida = JSON.parse(readFileSync(archivo, 'utf8'));
    if (corrida.length !== 10 || new Set(corrida.map(m => m.flujo)).size !== 10) {
      throw new Error('Se esperaban exactamente los diez flujos de referencia');
    }
    if (i > 0) muestras.push(corrida);
    console.log(
      `Corrida ${i}/${repeticiones}: ${i === 0 ? 'calentamiento descartado' : '10 flujos medidos'}`
    );
  }
  const resumen = muestras[0].map(({ flujo }) => {
    const filas = muestras.map(corrida => corrida.find(m => m.flujo === flujo));
    return {
      flujo,
      consultas: estadisticas(filas.map(m => m.n)),
      duracionMs: estadisticas(filas.map(m => m.duracionMs)),
      sqlClienteMs: estadisticas(filas.map(m => m.ms)),
      conexiones: filas.map(m => [m.conexionesAntes, m.conexionesDespues])
    };
  });
  mkdirSync(dirname(salida), { recursive: true });
  writeFileSync(
    salida,
    JSON.stringify(
      {
        revision,
        cambios,
        node: process.version,
        sistema: `${platform()} ${release()}`,
        cpu: cpus()[0]?.model,
        fechaUTC: new Date().toISOString(),
        base: process.env.DB_NAME,
        conexionesCalentadas: Number(process.env.BASELINE_POOL_WARM ?? 4),
        repeticiones,
        calentamientosDescartados: 1,
        metrica:
          'Duración del caso de uso con performance.now; excluye fixtures, calentamiento y limpieza. SQL es tiempo visto por cliente, no EXPLAIN.',
        resumen,
        muestras
      },
      null,
      2
    ) + '\n'
  );
  console.table(
    resumen.map(m => ({
      flujo: m.flujo,
      consultas: m.consultas.mediana,
      medianaMs: m.duracionMs.mediana.toFixed(2),
      minMs: m.duracionMs.min.toFixed(2),
      maxMs: m.duracionMs.max.toFixed(2)
    }))
  );
  console.log(`Informe: ${salida}`);
} finally {
  // Solo borra el directorio temporal creado por esta ejecución.
  if (
    dirname(temporal) !== resolve(tmpdir()) ||
    !temporal.startsWith(join(tmpdir(), 'lmr-fase0-'))
  ) {
    throw new Error('Directorio temporal fuera del destino esperado');
  }
  rmSync(temporal, { recursive: true, force: true });
}
