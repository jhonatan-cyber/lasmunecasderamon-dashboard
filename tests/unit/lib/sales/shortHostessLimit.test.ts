import { expect, it } from 'vitest';
import { SaleCreateSchema } from '@/lib/business/schemas/sale';

const corto = {
  producto_id: 'p1',
  tipo_venta: 'shot',
  shot_anfitriona: true,
  precio: 6000,
  comision: 1000,
  cantidad: 1
};

it('rechaza dos anfitrionas en un corto, incluso entre ambos campos de asignación', () => {
  for (const asignacion of [
    { hostesses: ['ana', 'bea'] },
    { hostess_id: 'ana', hostesses: ['bea'] }
  ]) {
    expect(SaleCreateSchema.shape.detalles.safeParse([{ ...corto, ...asignacion }]).success).toBe(
      false
    );
  }
});

it('acepta una anfitriona en cortos y conserva varias para botellas', () => {
  expect(
    SaleCreateSchema.shape.detalles.safeParse([{ ...corto, hostesses: ['ana'] }]).success
  ).toBe(true);
  expect(
    SaleCreateSchema.shape.detalles.safeParse([
      { ...corto, tipo_venta: 'botella', hostesses: ['ana', 'bea'] }
    ]).success
  ).toBe(true);
});

it('permite dos anfitrionas con dos unidades y rechaza tres', () => {
  expect(
    SaleCreateSchema.shape.detalles.safeParse([
      { ...corto, cantidad: 2, hostesses: ['ana', 'bea'] }
    ]).success
  ).toBe(true);
  expect(
    SaleCreateSchema.shape.detalles.safeParse([
      { ...corto, cantidad: 2, hostesses: ['ana', 'bea', 'carla'] }
    ]).success
  ).toBe(false);
});
