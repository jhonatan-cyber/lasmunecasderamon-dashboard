import { z } from 'zod';

export const CashRegisterStatusSchema = z.object({
  hasOpenCaja: z.boolean().nullable(),
  cajaInfo: z.object({
    id_caja: z.string().or(z.number()),
    usuario_id_apertura: z.string().or(z.number()).nullable(),
    fecha_apertura: z.string().nullable(),
    efectivo_en_caja: z.number().optional().default(0),
  }).nullable(),
});

export type CashRegisterStatusType = z.infer<typeof CashRegisterStatusSchema>;

export const CajaSchema = z.object({
  id_caja: z.string().or(z.number()).optional(),
  fecha_apertura: z.string().or(z.date()).optional(),
  usuario_id_apertura: z.string().optional(),
  monto_apertura: z.number().optional().default(0),
  estado: z.number().optional().default(1),
  fecha_cierre: z.string().or(z.date()).nullable().optional(),
  usuario_id_cierre: z.string().nullable().optional(),
  monto_cierre: z.number().nullable().optional(),
  ventas: z.number().optional().default(0),
  efectivo: z.number().optional().default(0),
  tarjeta: z.number().optional().default(0),
  transferencia: z.number().optional().default(0),
  servicios: z.number().optional().default(0),
  devoluciones: z.number().optional().default(0),
  prepago: z.number().optional().default(0),
  propina: z.number().optional().default(0),
  cuenta: z.number().optional().default(0),
  anticipo: z.number().optional().default(0),
  egreso: z.number().optional().default(0),
  iva: z.number().optional().default(0),
  comision: z.number().optional().default(0),
  usuario_apertura: z.string().optional(),
  cajero_nombre: z.string().optional(),
});

export type CajaType = z.infer<typeof CajaSchema>;

export const CajaOpenSchema = z.object({
  usuario_id_apertura: z.string().min(1, 'ID de usuario es requerido'),
  monto_apertura: z.number().min(0, 'El monto de apertura debe ser mayor o igual a 0')
});

export const CajaUpdateSchema = z.object({
  id_caja: z.string().or(z.number()).optional(),
  ventas: z.number().optional(),
  efectivo: z.number().optional(),
  tarjeta: z.number().optional(),
  transferencia: z.number().optional(),
  servicios: z.number().optional(),
  devoluciones: z.number().optional(),
});

export const CajaCloseSchema = z.object({
  id_caja: z.string().min(1, 'ID de caja es requerido'),
  monto_cierre: z.number().min(0).optional(),
  usuario_id_cierre: z.string().min(1, 'ID de usuario es requerido')
});
