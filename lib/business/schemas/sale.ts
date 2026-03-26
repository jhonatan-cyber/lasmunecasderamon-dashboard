import { z } from 'zod';

export const SaleSchema = z.object({
  id: z.string().optional(),
  codigo: z.string().optional(),
  cliente_id: z.string().nullable().optional(),
  pedido_id: z.string().nullable().optional(),
  habitacion_id: z.string().nullable().optional(),
  metodo_pago: z.enum(['efectivo', 'tarjeta', 'transferencia', 'prepago']).optional().default('efectivo'),
  propina: z.number().optional().default(0),
  sub_total: z.number().optional().default(0),
  total: z.number().min(0),
  tiempo: z.number().optional().default(0),
  caja_id: z.string().nullable().optional(),
  created_by: z.string().optional(),
  estado: z.number().optional().default(1),
  fecha_crea: z.string().or(z.date()).optional(),
  fecha_mod: z.string().or(z.date()).optional(),
  cliente_nombre: z.string().optional(),
  habitacion_nombre: z.string().optional(),
});

export const SaleCreateSchema = z.object({
  total: z.number().min(0),
  sub_total: z.number().optional(),
  total_comision: z.number().optional().default(0),
  cliente_id: z.string().nullable().optional(),
  pedido_id: z.string().nullable().optional(),
  habitacion_id: z.string().nullable().optional(),
  metodo_pago: z.enum(['efectivo', 'tarjeta', 'transferencia', 'prepago']).optional().default('efectivo'),
  propina: z.number().optional().default(0),
  usuarios: z.array(z.string()).optional().default([]),
  tiempo: z.number().optional().default(0),
  codigo: z.string().optional(),
  detalles: z.array(z.object({
    producto_id: z.string(),
    precio: z.number(),
    comision: z.number().optional().default(0),
    cantidad: z.number().min(1),
    sub_total: z.number().optional(),
    hostess_id: z.string().nullable().optional(),
    hostesses: z.array(z.string()).optional()
  })).min(1, 'Al menos un detalle es requerido')
});

export type SaleType = z.infer<typeof SaleSchema>;
