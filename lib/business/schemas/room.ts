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
