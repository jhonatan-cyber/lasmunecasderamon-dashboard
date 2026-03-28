import { z } from 'zod';

export const RoomSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, "Nombre requerido"),
  price: z.preprocess((v) => Number(v), z.number()),
  time: z.preprocess((v) => Number(v), z.number()),
  comision_anfitriona: z.preprocess((v) => (v === '' || v === null || v === undefined) ? null : Number(v), z.number().nullable().optional()),
  status: z.number().optional().default(1),
  display_order: z.number().nullable().optional(),
  created_at: z.string().nullable().optional(),
  updated_at: z.string().nullable().optional()
});

export type RoomType = z.infer<typeof RoomSchema>;
