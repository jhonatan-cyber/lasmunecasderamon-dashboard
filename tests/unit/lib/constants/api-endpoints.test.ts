import { describe, expect, it } from 'vitest';
import { PRODUCTS_FOR_SALE_ENDPOINT, urlProductosParaVenta } from '@/lib/constants/api-endpoints';

describe('endpoint compartido /api/products/for-sale', () => {
  it('devuelve la URL base sin filtros', () => {
    expect(urlProductosParaVenta()).toBe(PRODUCTS_FOR_SALE_ENDPOINT);
    expect(urlProductosParaVenta({})).toBe(PRODUCTS_FOR_SALE_ENDPOINT);
  });

  it('serializa filtros y omite los indefinidos', () => {
    expect(
      urlProductosParaVenta({
        solo_colaciones: 'true',
        term: 'ron',
        category_id: undefined
      })
    ).toBe(`${PRODUCTS_FOR_SALE_ENDPOINT}?solo_colaciones=true&term=ron`);
  });

  it('codifica los valores', () => {
    expect(urlProductosParaVenta({ term: 'whisky 12 años' })).toBe(
      `${PRODUCTS_FOR_SALE_ENDPOINT}?term=whisky+12+a%C3%B1os`
    );
  });
});
