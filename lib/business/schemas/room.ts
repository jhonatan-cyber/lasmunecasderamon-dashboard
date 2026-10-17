import { z } from 'zod';

export const RoomSchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(1, 'Nombre requerido'),
  price: z.preprocess(v => Number(v ?? 0), z.number().nonnegative()),
  time: z.preprocess(v => Number(v ?? 0), z.number().nonnegative()),
  comision_anfitriona: z.preprocess(v => Number(v ?? 0), z.number().nonnegative()),
  status: z.number().optional().default(1),
  display_order: z.number().nullable().optional(),
  created_at: z.string().nullable().optional(),
  updated_at: z.string().nullable().optional()
});

export type RoomType = z.infer<typeof RoomSchema>;

// La lectura conserva habitaciones históricas gratuitas; las altas y ediciones validan sus inputs.
export const RoomWriteSchema = RoomSchema.omit({ id: true }).extend({
  name: z
    .string()
    .trim()
    .min(1, 'Nombre requerido')
    .refine(value => !/^0+$/.test(value), 'Nombre inválido'),
  price: z.preprocess(v => Number(v), z.number().positive('El precio debe ser mayor que cero')),
  time: z.preprocess(v => Number(v), z.number().positive('El tiempo debe ser mayor que cero')),
  comision_anfitriona: z.preprocess(
    v => (v === undefined || v === null || v === '' ? undefined : Number(v)),
    z.number().positive('La comisión debe ser mayor que cero').optional()
  )
});
