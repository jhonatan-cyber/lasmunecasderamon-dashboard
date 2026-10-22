import { afterEach, describe, expect, it } from 'vitest';
import {
  formatearExcesoDePresupuesto,
  presupuestoDesdeEnv,
  segundos
} from '../../../scripts/duration-budget';

describe('formato del presupuesto de duración', () => {
  it('no devuelve mensaje si ningún archivo se pasa', () => {
    expect(formatearExcesoDePresupuesto(30_000, [])).toBeNull();
  });

  it('nombra cada archivo excedido con su tiempo y su detalle', () => {
    const mensaje = formatearExcesoDePresupuesto(30_000, [
      { archivo: 'tests/unit/lento.test.ts', totalMs: 31_500, detalle: 'diagnóstico 31.5 s' },
      { archivo: 'tests/unit/otro.test.ts', totalMs: 45_000 }
    ]);

    expect(mensaje).toContain('[file-budget] 2 archivo(s)');
    expect(mensaje).toContain('presupuesto de 30.0 s por archivo');
    expect(mensaje).toContain('- tests/unit/lento.test.ts: 31.5 s (diagnóstico 31.5 s)');
    expect(mensaje).toContain('- tests/unit/otro.test.ts: 45.0 s');
  });

  it('formatea los segundos con un decimal', () => {
    expect(segundos(1500)).toBe('1.5 s');
    expect(segundos(30_000)).toBe('30.0 s');
    expect(segundos(180_000)).toBe('180.0 s');
  });
});

describe('presupuestoDesdeEnv', () => {
  const NOMBRE = 'PRESUPUESTO_DE_PRUEBA_MS';

  afterEach(() => {
    delete process.env[NOMBRE];
  });

  it('usa el valor del entorno cuando es un número positivo', () => {
    process.env[NOMBRE] = '45000';
    expect(presupuestoDesdeEnv(NOMBRE, 30_000)).toBe(45_000);
  });

  it('cae al valor por defecto si falta o no es válido', () => {
    expect(presupuestoDesdeEnv(NOMBRE, 30_000)).toBe(30_000);
    process.env[NOMBRE] = 'no-es-un-numero';
    expect(presupuestoDesdeEnv(NOMBRE, 30_000)).toBe(30_000);
    process.env[NOMBRE] = '-5';
    expect(presupuestoDesdeEnv(NOMBRE, 30_000)).toBe(30_000);
    process.env[NOMBRE] = '0';
    expect(presupuestoDesdeEnv(NOMBRE, 30_000)).toBe(30_000);
  });
});
