import { describe, expect, it } from 'vitest';
import { getExplicitMaxAnfitrionas, getHostessLimit } from '@/components/orders/productModalRules';

describe('getExplicitMaxAnfitrionas', () => {
  it('devuelve el máximo configurado por producto', () => {
    expect(getExplicitMaxAnfitrionas({ max_anfitrionas: 3 })).toBe(3);
  });

  it('devuelve null cuando no hay valor configurado', () => {
    expect(getExplicitMaxAnfitrionas({})).toBeNull();
    expect(getExplicitMaxAnfitrionas({ max_anfitrionas: null })).toBeNull();
    expect(getExplicitMaxAnfitrionas({ max_anfitrionas: 0 })).toBeNull();
  });
});

describe('getHostessLimit prioriza el máximo explícito', () => {
  it('usa max_anfitrionas por sobre tiers y fallback', () => {
    expect(getHostessLimit({ categoria: 'Whisky', precio: 200000, max_anfitrionas: 2 })).toBe(2);
  });
});
