import { z } from 'zod';

export const ColacionCreateSchema = z.object({
  usuario_id: z.string().min(1, 'ID de usuario requerido'),
  presentacion_id: z.string().min(1, 'ID de presentación requerido'),
  acompanamiento: z.enum(['gaseosa', 'soda']).nullable().optional(),
  acompanamiento_presentacion_id: z.string().nullable().optional(),
  ml_bebida: z.number().optional().nullable()
});
