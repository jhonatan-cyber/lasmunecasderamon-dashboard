import { z } from 'zod';

const amount = z.number().int().min(0).max(2147483647);
export const SaleOptionsSchema = z
  .array(
    z
      .object({
        tipo: z.enum(['botella', 'shot']),
        colacion_habilitada: z.boolean().optional(),
        acompanamiento: z
          .object({
            tipo: z.enum(['gaseosa', 'soda']).optional(),
            unidades: z.number().int().min(0).max(1000)
          })
          .optional(),
        ml_acompanamiento_cliente: z.number().int().min(0).max(10000).optional(),
        ml_acompanamiento_anfitriona: z.number().int().min(0).max(10000).optional(),
        precio: amount,
        precio_sin_anfitriona: amount.min(1).optional(),
        comision: amount.optional().default(0),
        // Precio independiente del corto para anfitrionas; sin precio no se ofrece.
        precio_anfitriona: amount.optional(),
        precios_anfitriona: z
          .array(z.object({ precio: amount.min(1), comision: amount }))
          .max(20)
          .refine(
            rows => new Set(rows.map(row => row.precio)).size === rows.length,
            'No repitas precios de corto para anfitrionas'
          )
          .refine(
            rows => rows.every(row => row.comision <= row.precio),
            'La comisión no puede superar el precio del corto'
          )
          .optional()
      })
      .refine(
        option =>
          option.tipo === 'shot' ||
          (option.ml_acompanamiento_cliente === undefined &&
            option.ml_acompanamiento_anfitriona === undefined),
        'Los ml de bebida solo corresponden a cortos'
      )
      .refine(
        option => option.tipo === 'shot' || option.precios_anfitriona === undefined,
        'Los precios de anfitriona solo corresponden a cortos'
      )
      .refine(
        option => option.tipo === 'botella' || option.precio_sin_anfitriona === undefined,
        'El precio sin anfitriona solo corresponde a botellas'
      )
      .refine(
        option => option.tipo === 'botella' || option.acompanamiento === undefined,
        'La bebida solo corresponde a botellas'
      )
      .refine(
        option => option.tipo === 'botella' || option.colacion_habilitada === undefined,
        'La colación solo puede habilitarse para bebidas por botella'
      )
      .transform(option =>
        option.tipo === 'shot' && option.precios_anfitriona ? { ...option, comision: 0 } : option
      )
  )
  .min(1, 'Selecciona al menos un tipo de venta')
  .max(2)
  .refine(
    options => new Set(options.map(option => option.tipo)).size === options.length,
    'No se puede repetir un tipo de venta'
  );

/** Configuración nueva o editada; la lectura conserva configuraciones históricas. */
export const ConfiguredSaleOptionsSchema = SaleOptionsSchema.refine(
  options =>
    options.every(
      option => option.tipo !== 'botella' || option.precio <= 0 || Number(option.comision) > 0
    ),
  'La comisión de botella con anfitriona es requerida y debe ser mayor a cero cuando el precio es mayor a cero'
);
