import { z } from 'zod';

export const TipRegisterSchema = z.object({
  venta_id: z.string().min(1, 'ID de venta requerido'),
  monto: z.number().positive('El monto debe ser positivo'),
  usuario_ids: z.array(z.string()).optional().default([])
});
