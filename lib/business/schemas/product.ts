import { z } from 'zod';

export const ProductSchema = z.object({
  id: z.string().optional(),
  code: z.string().min(1, 'Código requerido'),
  name: z.string().min(1, 'Nombre requerido'),
  category_id: z
    .union([z.string(), z.number()])
    .transform(v => String(v))
    .refine(v => v !== 'NaN' && v !== 'undefined' && v.length > 0, 'Categoría requerida'),
  price: z.preprocess(
    v => (v === undefined || v === null || v === '' ? undefined : Number(v)),
    z.number().optional()
  ),
  commission: z.preprocess(
    v => (v === undefined || v === null || v === '' ? undefined : Number(v)),
    z.number().optional()
  ),
  max_anfitrionas: z.number().nullable().optional(),
  // Ml servidos por shot de este producto. '' lo borra (se usa el `shot_ml` global
  // de Configuraciones > Bar).
  ml_shot: z.preprocess(
    v => (v === undefined ? undefined : v === null || v === '' ? null : Number(v)),
    z
      .number()
      .int()
      .min(1, 'Los ml por shot deben ser mayores a 0')
      .max(10000)
      .nullable()
      .optional()
  ),
  description: z.string().optional(),
  status: z.preprocess(v => Number(v), z.number()),
  stock_almacen: z.preprocess(
    v => (v === undefined || v === null || v === '' ? undefined : Number(v)),
    z.number().int().min(0, 'El stock no puede ser negativo').optional()
  ),
  foto: z.string().nullable().optional(),
  display_order: z.number().optional(),
  created_at: z.string().nullable().optional(),
  updated_at: z.string().nullable().optional()
});

export type ProductType = z.infer<typeof ProductSchema>;

export const PresentacionSchema = z.object({
  id: z.string().optional(),
  nombre: z.string().trim().min(1, 'Nombre de presentación requerido').max(100),
  codigo_barras: z
    .string()
    .trim()
    .max(50)
    .optional()
    .transform(v => (v === '' ? undefined : v)),
  precio_compra: z.preprocess(
    v => (v === undefined || v === null || v === '' ? undefined : Number(v)),
    z.number().int().min(0, 'El precio de compra no puede ser negativo').optional()
  ),
  cantidad: z
    .preprocess(
      v => (v === undefined || v === null || v === '' ? 0 : Number(v)),
      z
        .number()
        .int()
        .min(0, 'La cantidad no puede ser negativa')
        .max(1000, 'Máximo 1000 unidades por carga')
    )
    .optional()
    .default(0),
  foto: z.string().max(255).nullable().optional()
});

export type PresentacionType = z.infer<typeof PresentacionSchema>;
