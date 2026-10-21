import { describe, expect, it } from 'vitest';
import {
  CATALOGOS_COLACION,
  CATEGORIA_BEBIDAS_ANALCOHOLICAS,
  ROLES_COLACION,
  parametrosCatalogoColacion,
  productoPermitidoParaRol,
  reglaColacionPorRol,
  reglasColacion,
  urlCatalogoColacion
} from '@/lib/business/colacionRoles';
import { PRODUCTS_FOR_SALE_ENDPOINT } from '@/lib/constants/api-endpoints';

describe('reglaColacionPorRol', () => {
  it('la anfitriona recibe el catálogo general de colación', () => {
    expect(reglaColacionPorRol('anfitriona')).toEqual({
      catalogo: 'productos',
      parametroCatalogo: 'solo_colaciones',
      categoriaSistema: null
    });
    expect(reglaColacionPorRol(' Anfitriona ')).toEqual({
      catalogo: 'productos',
      parametroCatalogo: 'solo_colaciones',
      categoriaSistema: null
    });
  });

  it.each(['cajero', 'garzon', 'barman', ' Garzon '])(
    '%s recibe solo bebidas analcohólicas',
    rol => {
      expect(reglaColacionPorRol(rol)).toEqual({
        catalogo: 'analcoholicas',
        parametroCatalogo: 'solo_colaciones_analcoholicas',
        categoriaSistema: CATEGORIA_BEBIDAS_ANALCOHOLICAS
      });
    }
  );

  it.each([undefined, null, '', 'supervisor', 'administrador'])(
    'no asigna catálogo al rol %s',
    rol => {
      expect(reglaColacionPorRol(rol)).toBeNull();
    }
  );

  it('entrega el parámetro de catálogo que entiende /api/products/for-sale', () => {
    expect(CATALOGOS_COLACION.productos.parametroCatalogo).toBe('solo_colaciones');
    expect(CATALOGOS_COLACION.analcoholicas.parametroCatalogo).toBe(
      'solo_colaciones_analcoholicas'
    );
    expect(parametrosCatalogoColacion('productos')).toEqual({ solo_colaciones: 'true' });
    expect(parametrosCatalogoColacion('analcoholicas')).toEqual({
      solo_colaciones_analcoholicas: 'true'
    });
    expect(urlCatalogoColacion('productos')).toBe(
      `${PRODUCTS_FOR_SALE_ENDPOINT}?solo_colaciones=true`
    );
    expect(urlCatalogoColacion('analcoholicas')).toBe(
      `${PRODUCTS_FOR_SALE_ENDPOINT}?solo_colaciones_analcoholicas=true`
    );
  });

  it('expone todas las reglas por rol sin repetir el mapeo en los clientes', () => {
    expect(ROLES_COLACION).toEqual(['anfitriona', 'cajero', 'garzon', 'barman']);
    const reglas = reglasColacion();
    expect(Object.keys(reglas)).toEqual([...ROLES_COLACION]);
    expect(reglas.anfitriona).toMatchObject({
      catalogo: 'productos',
      parametroCatalogo: 'solo_colaciones',
      categoriaSistema: null
    });
    for (const rol of ['cajero', 'garzon', 'barman'] as const) {
      expect(reglas[rol]).toMatchObject({
        catalogo: 'analcoholicas',
        parametroCatalogo: 'solo_colaciones_analcoholicas',
        categoriaSistema: CATEGORIA_BEBIDAS_ANALCOHOLICAS
      });
    }
  });

  it('valida la categoría del producto según la regla', () => {
    const anfitriona = reglaColacionPorRol('anfitriona')!;
    const bar = reglaColacionPorRol('barman')!;

    expect(productoPermitidoParaRol(anfitriona, 'licores')).toBe(true);
    expect(productoPermitidoParaRol(anfitriona, null)).toBe(true);
    expect(productoPermitidoParaRol(bar, CATEGORIA_BEBIDAS_ANALCOHOLICAS)).toBe(true);
    expect(productoPermitidoParaRol(bar, 'licores')).toBe(false);
    expect(productoPermitidoParaRol(bar, null)).toBe(false);
  });
});
