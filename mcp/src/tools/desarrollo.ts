import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { z } from 'zod';
import { config } from '../config.js';
import { acotar, ok, fallo } from '../formato.js';

const ejecutar = promisify(execFile);
const MAX_BUFFER = 16 * 1024 * 1024;

async function correr(comando: string, argumentos: string[], timeoutMs: number) {
  try {
    const { stdout, stderr } = await ejecutar(comando, argumentos, {
      cwd: config.repoRaiz,
      timeout: timeoutMs,
      maxBuffer: MAX_BUFFER,
      windowsHide: true
    });
    const salida = [stdout, stderr].filter(s => s && s.trim()).join('\n--- stderr ---\n');
    return { codigo: 0, salida: acotar(salida || '(sin salida)') };
  } catch (e: any) {
    if (typeof e?.code === 'number') {
      const salida = [e.stdout, e.stderr]
        .filter((s: string) => s && s.trim())
        .join('\n--- stderr ---\n');
      return { codigo: e.code, salida: acotar(salida || `(proceso terminó con código ${e.code})`) };
    }
    throw e;
  }
}

function nodo(rutaRelativa: string, argumentos: string[], timeoutMs: number) {
  return correr(process.execPath, [rutaRelativa, ...argumentos], timeoutMs);
}

function resultado(r: { codigo: number; salida: string }, texto = r.salida) {
  return r.codigo === 0 ? ok(texto) : fallo(`Comando terminó con código ${r.codigo}\n\n${texto}`);
}

export const herramientas = {
  check_limites: {
    description:
      'Ejecuta el control de límites del monolito modular (scripts/arquitectura/limites.mjs): imports privados entre módulos, propiedad de tablas y ciclos. Verde = 0 hallazgos. Con listar=true enumera hallazgos y excepciones sin fallar.',
    inputSchema: {
      listar: z.boolean().optional().describe('Solo enumerar hallazgos y excepciones (--listar)')
    },
    execute: async (a: any) => {
      try {
        const argumentos = ['scripts/arquitectura/limites.mjs', ...(a?.listar ? ['--listar'] : [])];
        const r = await nodo(argumentos[0], argumentos.slice(1), 180_000);
        return resultado(
          r,
          `${r.codigo === 0 ? '✓ VERDE' : '✗ FALLA (código ' + r.codigo + ')'}\n\n${r.salida}`
        );
      } catch (e) {
        return fallo(e);
      }
    }
  },

  diagnostico_arquitectura: {
    description:
      'Diagnóstico completo de arquitectura (scripts/arquitectura/analisis.mjs --json): SQL fuera de repositorios, propiedad de tablas, ciclos entre dominos, transacciones. Más lento que check_limites; úsalo para el informe completo.',
    inputSchema: {},
    execute: async () => {
      try {
        const r = await nodo('scripts/arquitectura/analisis.mjs', ['--json'], 300_000);
        return resultado(r);
      } catch (e) {
        return fallo(e);
      }
    }
  },

  typecheck: {
    description:
      'Verificación estricta de TypeScript del dashboard (tsc --noEmit -p tsconfig.typecheck.json). Lenta la primera vez; respeta la caché incremental.',
    inputSchema: {},
    execute: async () => {
      try {
        const r = await nodo(
          'node_modules/typescript/bin/tsc',
          ['--noEmit', '-p', 'tsconfig.typecheck.json'],
          420_000
        );
        return resultado(
          r,
          r.codigo === 0 && r.salida === '(sin salida)' ? '✓ TypeScript sin errores' : r.salida
        );
      } catch (e) {
        return fallo(e);
      }
    }
  },

  test_unit: {
    description:
      'Corre la suite de pruebas unitarias (vitest run). Con filtro, limita a los archivos cuyo nombre coincida (p. ej. "ventas" o "src/modules/caja").',
    inputSchema: {
      filtro: z.string().optional().describe('Filtro de nombre de archivo para vitest')
    },
    execute: async (a: any) => {
      try {
        const argumentos = ['node_modules/vitest/vitest.mjs', 'run'];
        if (a?.filtro) argumentos.push(a.filtro);
        const r = await nodo(argumentos[0], argumentos.slice(1), 600_000);
        return resultado(r);
      } catch (e) {
        return fallo(e);
      }
    }
  }
};
