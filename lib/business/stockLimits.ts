import { z } from 'zod';

export const stockLimit = z.preprocess(
  value => (value === '' || value === undefined || value === null ? null : Number(value)),
  z.number().int().positive().max(2147483647).nullable()
);
export const StockLimitsSchema = z
  .object({ stock_minimo: stockLimit, stock_maximo: stockLimit })
  .refine(
    value =>
      (value.stock_minimo === null && value.stock_maximo === null) ||
      (value.stock_minimo !== null &&
        value.stock_maximo !== null &&
        value.stock_maximo >= value.stock_minimo),
    'Indica mínimo y máximo, con máximo mayor o igual al mínimo'
  );

export function cantidadReposicion(
  stock: number,
  minimo: number | null,
  maximo: number | null
): number {
  return minimo !== null && maximo !== null && stock < minimo ? Math.max(0, maximo - stock) : 0;
}
