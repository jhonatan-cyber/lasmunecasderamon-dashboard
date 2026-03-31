import { z } from 'zod';

export const ServiceSchema = z.object({
  id: z.string().optional(),
  cliente_id: z.string().nullable().optional(),
  habitacion_id: z.string().optional(),
  precio_habitacion: z.number().optional().default(0),
  precio_servicio: z.number().optional().default(0),
  iva: z.number().optional().default(0),
  sub_total: z.number().optional().default(0),
  total: z.number().min(0),
  tiempo: z.number().min(0).optional(),
  metodo_pago: z.enum(['efectivo', 'tarjeta', 'transferencia', 'prepago', 'mixto']).optional().default('efectivo'),
  created_by: z.string().nullable().optional(),
  estado: z.number().optional().default(1),
  fecha_crea: z.string().or(z.date()).nullable().optional(),
  fecha_mod: z.string().or(z.date()).nullable().optional(),
  habitacion_nombre: z.string().optional(),
  anfitrionas_nombres: z.string().optional(),
  anfitrionas_ids: z.string().optional(),
  creator_nick: z.string().nullable().optional(),
  creator_nombre: z.string().nullable().optional(),
  creator_apellido: z.string().nullable().optional(),
  creator_foto: z.string().nullable().optional(),
  waiter_name: z.string().nullable().optional(),
  waiter_foto: z.string().nullable().optional(),
  pagos_mixtos: z.any().optional(),
  habitacion_comision: z.number().nullable().optional(),
});

export const ServiceCreateSchema = z.object({
  cliente_id: z.string().nullable().optional(),
  habitacion_id: z.string().min(1, 'Habitación es requerida'),
  precio_habitacion: z.number().min(0).optional().default(0),
  precio_servicio: z.number().min(0),
  iva: z.number().optional().default(0),
  sub_total: z.number().min(0),
  total: z.number().min(0),
  tiempo: z.number().min(1, 'Tiempo es requerido'),
  metodo_pago: z.enum(['efectivo', 'tarjeta', 'transferencia', 'prepago', 'mixto']).optional().default('efectivo'),
  usuarios: z.array(z.string()).min(1, 'Al menos una anfitriona es requerida'),
  clientes: z.array(z.string()).optional().default([]),
  device_date: z.string().optional(),
  pagos_mixtos: z.any().optional()
});

export type ServiceType = z.infer<typeof ServiceSchema>;
