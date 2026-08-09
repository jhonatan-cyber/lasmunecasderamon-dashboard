import { z } from 'zod';

export const SaleSchema = z.object({
  id: z.string().optional(),
  codigo: z.string().nullable().optional(),
  cliente_id: z.string().nullable().optional(),
  pedido_id: z.string().nullable().optional(),
  habitacion_id: z.string().nullable().optional(),
  metodo_pago: z
    .enum(['efectivo', 'tarjeta', 'transferencia', 'prepago', 'mixto'])
    .optional()
    .default('efectivo'),
  metodologia_pago: z.string().nullable().optional(),
  monto_prepago: z.number().optional().default(0),
  monto_adicional: z.number().optional().default(0),
  propina: z.number().optional().default(0),
  sub_total: z.number().optional().default(0),
  total: z.number().min(0),
  tiempo: z.number().optional().default(0),
  caja_id: z.string().nullable().optional(),
  created_by: z.string().nullable().optional(),
  cajero_nick: z.string().nullable().optional(),
  cajero_nombre: z.string().nullable().optional(),
  estado: z.number().optional().default(1),
  fecha_crea: z.string().or(z.date()).nullable().optional(),
  fecha_mod: z.string().or(z.date()).nullable().optional(),
  cliente_nombre: z.string().nullable().optional(),
  habitacion_numero: z.string().nullable().optional(),
  habitacion_nombre: z.string().nullable().optional(),
  item_count: z.number().optional().default(0),
  anfitrionas_nicks: z.string().nullable().optional(),
  pagos_mixtos: z.any().optional()
});

export const SaleCreateSchema = z.object({
  total: z.number().min(0),
  sub_total: z.number().optional(),
  total_comision: z.number().optional().default(0),
  cliente_id: z.string().nullable().optional(),
  pedido_id: z.string().nullable().optional(),
  habitacion_id: z.string().nullable().optional(),
  metodo_pago: z
    .enum(['efectivo', 'tarjeta', 'transferencia', 'prepago', 'mixto'])
    .optional()
    .default('efectivo'),
  metodo_pago_adicional: z
    .enum(['efectivo', 'tarjeta', 'transferencia', 'prepago', 'mixto'])
    .nullable()
    .optional(),
  monto_prepago: z.number().optional().default(0),
  monto_adicional: z.number().optional().default(0),
  pagos_mixtos: z.any().optional(),
  propina: z.number().optional().default(0),
  cargo_tarjeta: z.number().optional().default(0),
  usuarios: z.array(z.string()).optional().default([]),
  tiempo: z.number().optional().default(0),
  codigo: z.string().optional(),
  device_date: z.string().optional(),
  detalles: z
    .array(
      z.object({
        producto_id: z.string(),
        precio: z.number(),
        comision: z.number().optional().default(0),
        cantidad: z.number().min(1),
        sub_total: z.number().optional(),
        hostess_id: z.string().nullable().optional(),
        hostesses: z.array(z.string()).optional(),
        isChampagne: z.boolean().optional()
      })
    )
    .min(1, 'Al menos un detalle es requerido')
});

export type SaleType = z.infer<typeof SaleSchema>;
