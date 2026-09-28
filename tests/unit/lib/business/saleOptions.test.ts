import { describe, expect, it } from 'vitest';
import { SaleOptionsSchema } from '@/lib/business/schemas/sale-options';

describe('opciones de venta al traspasar', () => {
  it('conserva el precio del shot para anfitrionas', () => {
    const parsed = SaleOptionsSchema.parse([
      { tipo: 'botella', precio: 180000, comision: 20000 },
      { tipo: 'shot', precio: 5000, comision: 0, precio_anfitriona: 3000 }
    ]);
    expect(parsed[1]).toEqual({
      tipo: 'shot',
      precio: 5000,
      comision: 0,
      precio_anfitriona: 3000
    });
  });

  it('sigue aceptando opciones sin precio de anfitriona', () => {
    expect(SaleOptionsSchema.parse([{ tipo: 'shot', precio: 5000 }])).toEqual([
      { tipo: 'shot', precio: 5000, comision: 0 }
    ]);
  });

  it('rechaza precios negativos o no enteros', () => {
    expect(
      SaleOptionsSchema.safeParse([{ tipo: 'shot', precio: 5000, precio_anfitriona: -1 }]).success
    ).toBe(false);
    expect(
      SaleOptionsSchema.safeParse([{ tipo: 'shot', precio: 5000, precio_anfitriona: 10.5 }]).success
    ).toBe(false);
  });

  it('no permite repetir el tipo de venta', () => {
    expect(
      SaleOptionsSchema.safeParse([
        { tipo: 'shot', precio: 5000 },
        { tipo: 'shot', precio: 3000 }
      ]).success
    ).toBe(false);
  });
});
