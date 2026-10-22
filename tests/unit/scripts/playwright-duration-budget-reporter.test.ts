import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { FullResult, TestCase, TestResult } from '@playwright/test/reporter';
import {
  DurationBudgetReporter,
  E2E_FILE_BUDGET_MS
} from '../../../scripts/playwright/duration-budget-reporter';

function testCase(id: string, file: string): TestCase {
  return {
    id,
    location: { file: `${process.cwd()}/tests/e2e/${file}`, line: 1, column: 1 }
  } as TestCase;
}

function resultado(ms: number): TestResult {
  return { duration: ms } as TestResult;
}

const aprobado = { status: 'passed' } as FullResult;

describe('presupuesto de duración de Playwright', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it(`no falla si ningún archivo supera ${E2E_FILE_BUDGET_MS / 1000} s`, async () => {
    const reporter = new DurationBudgetReporter({ presupuestoMs: E2E_FILE_BUDGET_MS });
    reporter.onBegin();

    reporter.onTestEnd(testCase('a', 'uno.spec.ts'), resultado(60_000));
    reporter.onTestEnd(testCase('b', 'dos.spec.ts'), resultado(E2E_FILE_BUDGET_MS));

    await expect(reporter.onEnd(aprobado)).resolves.toBeUndefined();
    expect(console.error).not.toHaveBeenCalled();
  });

  it('falla el run y nombra el archivo que supera el presupuesto', async () => {
    const reporter = new DurationBudgetReporter({ presupuestoMs: 10_000 });
    reporter.onBegin();

    reporter.onTestEnd(testCase('a', 'rapido.spec.ts'), resultado(1_000));
    reporter.onTestEnd(testCase('b', 'lento.spec.ts'), resultado(6_000));
    reporter.onTestEnd(testCase('c', 'lento.spec.ts'), resultado(5_000));

    await expect(reporter.onEnd(aprobado)).resolves.toEqual({ status: 'failed' });
    const mensaje = vi.mocked(console.error).mock.calls.flat().join('\n');
    expect(mensaje).toContain('[file-budget] 1 archivo(s)');
    expect(mensaje).toContain('tests/e2e/lento.spec.ts: 11.0 s');
    expect(mensaje).not.toContain('rapido.spec.ts');
  });

  it('cuenta un reintento una sola vez, con el intento más lento', async () => {
    const reporter = new DurationBudgetReporter({ presupuestoMs: 10_000 });
    reporter.onBegin();

    // El mismo test se reporta dos veces (fallo + reintento): 4 s y 9 s.
    reporter.onTestEnd(testCase('reintento', 'reintentos.spec.ts'), resultado(4_000));
    reporter.onTestEnd(testCase('reintento', 'reintentos.spec.ts'), resultado(9_000));

    await expect(reporter.onEnd(aprobado)).resolves.toBeUndefined();
  });

  it('no pisa un run interrumpido', async () => {
    const reporter = new DurationBudgetReporter({ presupuestoMs: 1_000 });
    reporter.onBegin();
    reporter.onTestEnd(testCase('a', 'lento.spec.ts'), resultado(5_000));

    await expect(reporter.onEnd({ status: 'interrupted' } as FullResult)).resolves.toBeUndefined();
  });

  it('limpia las duraciones al empezar otro run', async () => {
    const reporter = new DurationBudgetReporter({ presupuestoMs: 1_000 });
    reporter.onBegin();
    reporter.onTestEnd(testCase('a', 'lento.spec.ts'), resultado(5_000));
    await expect(reporter.onEnd(aprobado)).resolves.toEqual({ status: 'failed' });

    reporter.onBegin();
    await expect(reporter.onEnd(aprobado)).resolves.toBeUndefined();
  });
});
