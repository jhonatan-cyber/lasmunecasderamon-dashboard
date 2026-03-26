import { z } from 'zod';

export const CommissionSchema = z.object({
  id: z.string().optional(),
  usuario_id: z.string().optional(),
  venta_id: z.string().nullable().optional(),
  servicio_id: z.string().nullable().optional(),
  monto: z.number().optional(),
  status: z.enum(['por_pagar', 'pagado', 'anulado']).optional().default('por_pagar'),
  fecha_crea: z.string().or(z.date()).optional(),
  anfitriona_nombre: z.string().optional(),
  nick: z.string().optional(),
  venta_monto: z.number().optional(),
  servicio_monto: z.number().optional(),
});

export type CommissionType = z.infer<typeof CommissionSchema>;

export const CommissionCreateSchema = z.object({
  usuario_id: z.string().min(1, 'ID de anfitriona es requerido'),
  venta_id: z.string().nullable().optional(),
  servicio_id: z.string().nullable().optional(),
  monto: z.number().min(0, 'El monto debe ser mayor o igual a 0')
}).refine(data => data.venta_id || data.servicio_id, {
  message: 'Debe especificar al menos una venta o un servicio'
});
