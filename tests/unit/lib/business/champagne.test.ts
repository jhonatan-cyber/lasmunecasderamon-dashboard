import { describe, it, expect } from 'vitest';
import {
  champagneTierFor,
  champagneComisionPorAnfitriona,
  CHAMPAGNE_DEFAULT_TIERS
} from '@/lib/business/champagne';

describe('champagneTierFor', () => {
  it('aplica la tabla del club', () => {
    expect(champagneTierFor(1, CHAMPAGNE_DEFAULT_TIERS)).toEqual({
      anfitrionas: 1,
      precio: 120000,
      comision: 40000
    });
    expect(champagneTierFor(2, CHAMPAGNE_DEFAULT_TIERS)).toEqual({
      anfitrionas: 2,
      precio: 120000,
      comision: 40000
    });
    expect(champagneTierFor(3, CHAMPAGNE_DEFAULT_TIERS)).toEqual({
      anfitrionas: 3,
      precio: 160000,
      comision: 60000
    });
    expect(champagneTierFor(4, CHAMPAGNE_DEFAULT_TIERS)).toEqual({
      anfitrionas: 4,
      precio: 180000,
      comision: 80000
    });
    expect(champagneTierFor(5, CHAMPAGNE_DEFAULT_TIERS)).toEqual({
      anfitrionas: 5,
      precio: 200000,
      comision: 100000
    });
  });

  it('limita al mínimo 1 y usa el último tramo si se pasa', () => {
    expect(champagneTierFor(0, CHAMPAGNE_DEFAULT_TIERS).anfitrionas).toBe(1);
    expect(champagneTierFor(9, CHAMPAGNE_DEFAULT_TIERS).anfitrionas).toBe(5);
  });
});

describe('champagneComisionPorAnfitriona', () => {
  it('reparte el pozo en partes iguales', () => {
    expect(champagneComisionPorAnfitriona(1, CHAMPAGNE_DEFAULT_TIERS)).toBe(40000);
    expect(champagneComisionPorAnfitriona(2, CHAMPAGNE_DEFAULT_TIERS)).toBe(20000);
    expect(champagneComisionPorAnfitriona(4, CHAMPAGNE_DEFAULT_TIERS)).toBe(20000);
  });
});
