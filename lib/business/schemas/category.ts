import { z } from 'zod';

export const CategorySchema = z.object({
  id: z.string().optional(),
  name: z
    .string()
    .min(1, 'El nombre es obligatorio')
    .max(255, 'El nombre no puede superar 255 caracteres'),
  // La columna es text desde 035; el tope es de UX para no guardar basura.
  description: z.string().max(2000, 'La descripción no puede superar 2000 caracteres'),
  created_at: z.string().optional(),
  updated_at: z.string().optional()
});

export type CategoryType = z.infer<typeof CategorySchema>;
