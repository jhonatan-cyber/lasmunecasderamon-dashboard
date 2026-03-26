import { z } from 'zod';

export const CategorySchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, 'El nombre es obligatorio'),
  description: z.string(),
  created_at: z.string().optional(),
  updated_at: z.string().optional()
});

export type CategoryType = z.infer<typeof CategorySchema>;
