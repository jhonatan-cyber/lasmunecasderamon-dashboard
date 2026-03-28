import { z } from 'zod';

export const ProductSchema = z.object({
  id: z.string().optional(),
  code: z.string().min(1, 'Código requerido'),
  name: z.string().min(1, 'Nombre requerido'),
  category_id: z.union([z.string(), z.number()]).transform(v => String(v)).refine(v => v !== 'NaN' && v !== 'undefined' && v.length > 0, 'Categoría requerida'),
  price: z.preprocess(v => Number(v), z.number()),
  commission: z.preprocess(v => Number(v), z.number()),
  description: z.string().optional(),
  status: z.preprocess(v => Number(v), z.number()),
  foto: z.string().nullable().optional(),
  display_order: z.number().optional(),
  created_at: z.string().nullable().optional(),
  updated_at: z.string().nullable().optional()
});

export type ProductType = z.infer<typeof ProductSchema>;
