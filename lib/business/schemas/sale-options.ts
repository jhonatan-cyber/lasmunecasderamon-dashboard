import { z } from 'zod';

const amount = z.number().int().min(0).max(2147483647);
export const SaleOptionsSchema = z
  .array(
    z.object({
      tipo: z.enum(['botella', 'shot']),
      precio: amount,
      comision: amount.optional().default(0)
    })
  )
  .min(1, 'Selecciona al menos un tipo de venta')
  .max(2)
  .refine(
    options => new Set(options.map(option => option.tipo)).size === options.length,
    'No se puede repetir un tipo de venta'
  );
