import { describe, expect, it } from 'vitest';
import type { TestModule } from 'vitest/node';
import DurationBudgetReporterPorDefecto, {
  DurationBudgetReporter,
  FILE_BUDGET_MS
} from '../../../scripts/vitest/duration-budget-reporter';

function modulo(id: string, duration: number): TestModule {
  return {
    moduleId: id,
    diagnostic: () => ({ duration })
  } as unknown as TestModule;
}

describe('presupuesto de duración por archivo', () => {
  it(`no falla si todos los archivos quedan bajo ${FILE_BUDGET_MS / 1000} s`, () => {
    const reporter = new DurationBudgetReporter();
    reporter.onTestRunStart();

    for (const [id, duration] of [
      ['tests/unit/rapido.test.ts', 1500],
      ['tests/unit/medio.test.ts', FILE_BUDGET_MS]
    ] as const) {
      reporter.onTestModuleStart(modulo(id, duration));
      reporter.onTestModuleEnd(modulo(id, duration));
    }

    expect(() => reporter.onTestRunEnd()).not.toThrow();
  });

  it('falla y nombra el archivo que supera el presupuesto', () => {
    const reporter = new DurationBudgetReporter();
    reporter.onTestRunStart();

    reporter.onTestModuleStart(modulo('tests/unit/rapido.test.ts', 1000));
    reporter.onTestModuleEnd(modulo('tests/unit/rapido.test.ts', 1000));
    reporter.onTestModuleStart(modulo('tests/unit/lento.test.ts', FILE_BUDGET_MS + 1));
    reporter.onTestModuleEnd(modulo('tests/unit/lento.test.ts', FILE_BUDGET_MS + 1));

    expect(() => reporter.onTestRunEnd()).toThrow(/tests\/unit\/lento\.test\.ts/);
    expect(() => reporter.onTestRunEnd()).toThrow(/file-budget/);
  });

  it('expone la clase como export por defecto para carga por ruta', () => {
    // `reporters: ['./ruta']` de Vitest exige un export por defecto; si algún
    // día se carga así, la clase tiene que ser la misma del export con nombre.
    expect(DurationBudgetReporterPorDefecto).toBe(DurationBudgetReporter);
  });

  it('limpia las duraciones al comenzar una nueva corrida', () => {
    const reporter = new DurationBudgetReporter();
    reporter.onTestRunStart();
    reporter.onTestModuleStart(modulo('tests/unit/lento.test.ts', FILE_BUDGET_MS + 1));
    reporter.onTestModuleEnd(modulo('tests/unit/lento.test.ts', FILE_BUDGET_MS + 1));
    expect(() => reporter.onTestRunEnd()).toThrow();

    reporter.onTestRunStart();
    reporter.onTestModuleStart(modulo('tests/unit/rapido.test.ts', 1000));
    reporter.onTestModuleEnd(modulo('tests/unit/rapido.test.ts', 1000));
    expect(() => reporter.onTestRunEnd()).not.toThrow();
  });
});
