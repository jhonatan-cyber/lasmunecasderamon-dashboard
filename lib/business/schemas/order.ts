import { z } from 'zod';

export const OrderSchema = z.object({
  id: z.string().optional(),
  codigo: z.string().optional(),
  mesero_id: z.string().optional(),
  cliente_id: z.string().nullable().optional(),
  subtotal: z.number().optional().default(0),
  total: z.number().min(0),
  total_comision: z.number().optional().default(0),
  propina: z.number().optional().default(0),
  estado: z.number().optional().default(1),
  fecha_crea: z.string().or(z.date()).optional(),
  cliente_nombre: z.string().optional(),
  mesero_nombre: z.string().optional(),
  nicks: z.string().optional(),
});

export type OrderType = z.infer<typeof OrderSchema>;

export const OrderCreateSchema = z.object({
  codigo: z.string().min(1, 'Código es requerido'),
  meseroId: z.string().min(1, 'Mesero es requerido'),
  clienteId: z.string().nullable().optional(),
  subtotal: z.number().min(0),
  total: z.number().min(0),
  totalComision: z.number().optional().default(0),
  propina: z.number().optional().default(0),
  device_date: z.string().optional(),
  detalles: z.array(z.object({
    productoId: z.string().min(1),
    precio: z.number().min(0),
    comision: z.number().optional().default(0),
    generaComision: z.number().optional().default(1),
    cantidad: z.number().min(1),
    subtotal: z.number().min(0),
    hostessId: z.string().nullable().optional(),
    roomId: z.string().nullable().optional(),
    selectedHostesses: z.array(z.string()).optional().default([])
  })).min(1, 'Al menos un detalle es requerido'),
  usuarios: z.array(z.object({
    usuarioId: z.string()
  })).optional().default([])
});

export type OrderCreateType = z.infer<typeof OrderCreateSchema>;
