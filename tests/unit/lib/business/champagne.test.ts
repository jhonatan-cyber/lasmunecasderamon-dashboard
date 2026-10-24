import { describe, it, expect } from 'vitest';
import {
  champagneTierFor,
  champagneComisionPorAnfitriona,
  faltaConfiguracionChampagne,
  type ChampagneTier
} from '@/lib/business/champagne';

/** Tabla de ejemplo: los tramos reales viven por producto en la base. */
const TRAMOS: ChampagneTier[] = [
  { anfitrionas: 1, precio: 120000, comision: 40000 },
  { anfitrionas: 2, precio: 120000, comision: 40000 },
  { anfitrionas: 3, precio: 160000, comision: 60000 },
  { anfitrionas: 4, precio: 180000, comision: 80000 },
  { anfitrionas: 5, precio: 200000, comision: 100000 }
];

describe('champagneTierFor', () => {
  it('aplica la tabla del producto', () => {
    expect(champagneTierFor(1, TRAMOS)).toEqual({
      anfitrionas: 1,
      precio: 120000,
      comision: 40000
    });
    expect(champagneTierFor(2, TRAMOS)).toEqual({
      anfitrionas: 2,
      precio: 120000,
      comision: 40000
    });
    expect(champagneTierFor(3, TRAMOS)).toEqual({
      anfitrionas: 3,
      precio: 160000,
      comision: 60000
    });
    expect(champagneTierFor(4, TRAMOS)).toEqual({
      anfitrionas: 4,
      precio: 180000,
      comision: 80000
    });
    expect(champagneTierFor(5, TRAMOS)).toEqual({
      anfitrionas: 5,
      precio: 200000,
      comision: 100000
    });
  });

  it('limita al mínimo 1 y usa el último tramo si se pasa', () => {
    expect(champagneTierFor(0, TRAMOS).anfitrionas).toBe(1);
    expect(champagneTierFor(9, TRAMOS).anfitrionas).toBe(5);
  });
});

describe('champagneComisionPorAnfitriona', () => {
  it('reparte el pozo en partes iguales', () => {
    expect(champagneComisionPorAnfitriona(1, TRAMOS)).toBe(40000);
    expect(champagneComisionPorAnfitriona(2, TRAMOS)).toBe(20000);
    expect(champagneComisionPorAnfitriona(4, TRAMOS)).toBe(20000);
  });
});

describe('faltaConfiguracionChampagne', () => {
  it('bloquea cuando no hay máximo ni tramos', () => {
    expect(faltaConfiguracionChampagne(null, [])).toBe(true);
    expect(faltaConfiguracionChampagne(undefined, [])).toBe(true);
    expect(faltaConfiguracionChampagne(0, [])).toBe(true);
  });

  it('alcanza con el máximo explícito o con tramos guardados', () => {
    expect(faltaConfiguracionChampagne(3, [])).toBe(false);
    expect(faltaConfiguracionChampagne(null, [{ anfitrionas: 1 }])).toBe(false);
  });
});
