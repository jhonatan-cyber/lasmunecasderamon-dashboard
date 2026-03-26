import { z } from 'zod';

export const CuentaSchema = z.object({
  id: z.string().optional(),
  tipo: z.enum(['ingreso', 'egreso', 'traspaso']).default('egreso'),
  monto: z.number().positive('El monto debe ser positivo'),
  descripcion: z.string().min(1, 'La descripción es requerida'),
  metodo_pago: z.enum(['efectivo', 'tarjeta', 'transferencia', 'otro']).default('efectivo'),
  caja_id: z.string().nullable().optional(),
  created_by: z.string().optional(),
  estado: z.number().optional().default(1),
  fecha_crea: z.string().or(z.date()).optional(),
  fecha_mod: z.string().or(z.date()).optional(),
});

export type CuentaType = z.infer<typeof CuentaSchema>;

export const CuentaCreateSchema = CuentaSchema.omit({ id: true, created_by: true, fecha_crea: true, fecha_mod: true });
