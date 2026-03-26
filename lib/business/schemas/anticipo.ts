import { z } from 'zod';

export const AnticipoSchema = z.object({
  id: z.string().optional(),
  usuario_id: z.string().min(1, 'ID de usuario es requerido'),
  monto: z.number().positive('El monto debe ser positivo'),
  motivo: z.string().optional(),
  estado: z.number().optional().default(1),
  fecha_crea: z.string().or(z.date()).optional(),
  fecha_mod: z.string().or(z.date()).optional(),
  usuario_nombre: z.string().optional(),
});

export type AnticipoType = z.infer<typeof AnticipoSchema>;

export const AnticipoRequestSchema = z.object({
  monto: z.number().positive('El monto debe ser positivo'),
  motivo: z.string().min(1, 'El motivo es requerido'),
});
