import { relative, sep } from 'node:path';
import type { FullResult, Reporter, TestCase, TestResult } from '@playwright/test/reporter';
import { formatearExcesoDePresupuesto, presupuestoDesdeEnv, segundos } from '../duration-budget';

/**
 * Presupuesto de duración por archivo para la suite E2E.
 *
 * En unitarias el motivo es el timeout de RPC de Vitest (60 s); aquí el riesgo
 * es otro: con `workers: 1` y `retries: 1` un solo spec que se desborda retrasa
 * toda la suite y no deja rastro de cuál fue. Cada test tiene `timeout: 30 s`,
 * y los specs más largos (`venta-caja`, `login`) suman ~70 s por corrida, con
 * reintentos incluidos; 180 s los deja pasar con holgura y sigue cazando el
 * archivo que se desboca. Se ajusta con `E2E_FILE_BUDGET_MS` (útil también
 * para probar el fallo a mano: `E2E_FILE_BUDGET_MS=1`).
 */
export const E2E_FILE_BUDGET_MS = 180_000;

/**
 * Suma por archivo el intento más lento de cada test: los reintentos suman
 * tiempo real de CI, pero lo que interesa es el peor intento de cada test, no
 * la suma de todos ellos.
 */
export class DurationBudgetReporter implements Reporter {
  /** archivo → (id de test → duración del intento más lento). */
  private readonly duraciones = new Map<string, Map<string, number>>();
  private readonly presupuestoMs: number;

  /** Playwright instancia el reporter con las opciones de la tupla del config. */
  constructor(opciones: { presupuestoMs?: number } = {}) {
    this.presupuestoMs =
      opciones.presupuestoMs ?? presupuestoDesdeEnv('E2E_FILE_BUDGET_MS', E2E_FILE_BUDGET_MS);
  }

  onBegin(): void {
    this.duraciones.clear();
  }

  onTestEnd(test: TestCase, result: TestResult): void {
    const archivo = relative(process.cwd(), test.location.file).split(sep).join('/');
    const tests = this.duraciones.get(archivo) ?? new Map<string, number>();
    tests.set(test.id, Math.max(tests.get(test.id) ?? 0, result.duration));
    this.duraciones.set(archivo, tests);
  }

  // `async` no es decorativo: el tipo de `Reporter.onEnd` es
  // `void | Promise<void | { status } | undefined>`, y devolver el objeto de
  // forma síncrona no encaja en esa unión (TS2416). Playwright lo espera.
  async onEnd(result: FullResult): Promise<{ status?: FullResult['status'] } | undefined> {
    const excedidos = [...this.duraciones.entries()]
      .map(([archivo, tests]) => ({
        archivo,
        totalMs: [...tests.values()].reduce((total, ms) => total + ms, 0),
        tests: tests.size
      }))
      .filter(({ totalMs }) => totalMs > this.presupuestoMs)
      .sort((a, b) => b.totalMs - a.totalMs)
      .map(({ archivo, totalMs, tests }) => ({
        archivo,
        totalMs,
        detalle: `${tests} test(s), presupuesto ${segundos(this.presupuestoMs)}`
      }));

    const mensaje = formatearExcesoDePresupuesto(this.presupuestoMs, excedidos);
    if (!mensaje) return undefined;

    console.error(`\n${mensaje}\n`);

    // `onEnd` puede devolver un estado: Playwright lo usa como resultado final
    // del run y el CLI lo traduce a exit code 1. No pisotea un run interrumpido.
    return result.status === 'interrupted' ? undefined : { status: 'failed' };
  }

  /** No imprimimos el reporte de tests: solo el aviso de presupuesto. */
  printsToStdio(): boolean {
    return false;
  }
}

export default DurationBudgetReporter;
