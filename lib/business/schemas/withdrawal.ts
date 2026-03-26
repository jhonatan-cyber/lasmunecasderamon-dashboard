import { z } from 'zod';

export const RetiroCajaSchema = z.object({
  id_retiro: z.string().optional(),
  caja_id: z.string().nullable().optional(),
  monto: z.number().int().positive('El monto debe ser positivo'),
  motivo: z.string().min(1, 'El motivo es requerido'),
  usuario_id: z.string().nullable().optional(),
  fecha_retiro: z.string().or(z.date()).optional(),
});

export type RetiroCajaType = z.infer<typeof RetiroCajaSchema>;
