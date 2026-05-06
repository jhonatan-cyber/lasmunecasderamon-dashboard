import { z } from 'zod';

export const RetiroCajaSchema = z.object({
  id_retiro: z.string().optional(),
  caja_id: z.union([z.string(), z.number()]).transform(val => String(val)).nullable().optional(),
  id_caja: z.union([z.string(), z.number()]).transform(val => String(val)).optional(),
  monto: z.number().int().positive('El monto debe ser positivo'),
  motivo: z.string().min(1, 'El motivo es requerido'),
  usuario_id: z.union([z.string(), z.number()]).transform(val => String(val)).nullable().optional(),
  fecha_retiro: z.string().or(z.date()).optional(),
}).transform(data => ({
  ...data,
  caja_id: data.caja_id ?? data.id_caja ?? null,
}));

export type RetiroCajaType = z.infer<typeof RetiroCajaSchema>;
