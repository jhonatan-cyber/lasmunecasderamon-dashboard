import { z } from 'zod';

export const AnulacionRequestSchema = z.object({
  id: z.string().optional(),
  venta_id: z.string().nullable().optional(),
  token: z.string().min(1, 'Token es requerido'),
  estado: z.enum(['pendiente', 'confirmada', 'rechazada']).default('pendiente'),
  motivo: z.string().optional().default('Motivo no especificado'),
  fecha_crea: z.string().or(z.date()).optional(),
});

export type AnulacionRequestType = z.infer<typeof AnulacionRequestSchema>;
