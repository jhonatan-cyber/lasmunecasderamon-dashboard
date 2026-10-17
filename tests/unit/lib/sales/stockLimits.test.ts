import { expect, it } from 'vitest';
import { cantidadReposicion, StockLimitsSchema } from '@/lib/business/stockLimits';
it.each([
  [3, 5, 12, 9],
  [0, 5, 12, 12],
  [5, 5, 12, 0],
  [13, 5, 12, 0],
  [3, null, null, 0]
])('calcula compra de stock %s sin pasar el máximo', (stock, min, max, expected) => {
  expect(cantidadReposicion(stock!, min, max)).toBe(expected);
});
it.each([
  { stock_minimo: 5, stock_maximo: 4 },
  { stock_minimo: 0, stock_maximo: 10 },
  { stock_minimo: 5 },
  { stock_minimo: 1.5, stock_maximo: 10 }
])('rechaza límites inválidos: %j', value => {
  expect(StockLimitsSchema.safeParse(value).success).toBe(false);
});
it('permite desactivar dejando ambos campos vacíos', () => {
  expect(StockLimitsSchema.parse({ stock_minimo: '', stock_maximo: '' })).toEqual({
    stock_minimo: null,
    stock_maximo: null
  });
});
