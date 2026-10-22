import { relative, sep } from 'node:path';
import type { Reporter } from 'vitest/reporters';
import type { TestModule } from 'vitest/node';
import { formatearExcesoDePresupuesto, segundos } from '../duration-budget';

/**
 * Presupuesto por archivo sin cobertura. Corridas completas en esta máquina:
 * el archivo más pesado (`SaleProductModal.test.tsx`) tarda 17 s, y 45 s deja
 * margen antes de que la contención del pool doble ese número. Con `--coverage`
 * la instrumentación v8 lo lleva a 71 s, así que ahí el presupuesto sube a
 * 120 s (ver `vitest.config.ts`).
 */
export const FILE_BUDGET_MS = 45_000;

/** Presupuesto por archivo con `--coverage`, más lento por la instrumentación. */
export const FILE_BUDGET_COVERAGE_MS = 120_000;

interface FileDuration {
  file: string;
  elapsedMs: number;
  measuredMs: number;
}

export class DurationBudgetReporter implements Reporter {
  private readonly startedAt = new Map<string, number>();
  private readonly durations = new Map<string, FileDuration>();
  private readonly budgetMs: number;

  constructor(budgetMs = FILE_BUDGET_MS) {
    this.budgetMs = budgetMs;
  }

  onTestRunStart(): void {
    this.startedAt.clear();
    this.durations.clear();
  }

  onTestModuleStart(testModule: TestModule): void {
    this.startedAt.set(testModule.moduleId, performance.now());
  }

  onTestModuleEnd(testModule: TestModule): void {
    const started = this.startedAt.get(testModule.moduleId);
    if (started === undefined) return;

    const elapsedMs = performance.now() - started;
    const measuredMs = testModule.diagnostic().duration;
    const relativo = relative(process.cwd(), testModule.moduleId);
    this.durations.set(testModule.moduleId, {
      file:
        relativo && !relativo.startsWith('..')
          ? relativo.split(sep).join('/')
          : testModule.moduleId,
      elapsedMs,
      measuredMs
    });
  }

  onTestRunEnd(): void {
    const exceeded = [...this.durations.values()]
      .map(duration => ({
        ...duration,
        totalMs: Math.max(duration.elapsedMs, duration.measuredMs)
      }))
      .filter(duration => duration.totalMs > this.budgetMs)
      .sort((a, b) => b.totalMs - a.totalMs);

    const mensaje = formatearExcesoDePresupuesto(
      this.budgetMs,
      exceeded.map(({ file, totalMs, measuredMs, elapsedMs }) => ({
        archivo: file,
        totalMs,
        detalle: `diagnóstico ${segundos(measuredMs)}, reloj ${segundos(elapsedMs)}`
      }))
    );

    if (mensaje) throw new Error(mensaje);
  }
}

// Si en algún momento se carga por ruta (`reporters: ['./scripts/vitest/...']`),
// Vitest exige el default export; en la configuración actual se usa la clase
// directamente, así que ambos caminos quedan cubiertos.
export default DurationBudgetReporter;
