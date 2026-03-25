import { z } from 'zod';

/**
 * Esquemas de validación unificados para las respuestas de la API.
 */

export const UserSchema = z.object({
  id: z.string().optional(),
  run: z.string().min(1, 'RUN es requerido'),
  nick: z.string().min(1, 'Nick es requerido'),
  nombre: z.string().min(1, 'Nombre es requerido'),
  apellido: z.string().min(1, 'Apellido es requerido'),
  email: z.string().email('Email inválido').optional(),
  telefono: z.string().min(1, 'Teléfono es requerido'),
  direccion: z.string().optional(),
  estado_civil: z.string().optional(),
  rol_id: z.string().min(1, 'Rol es requerido').or(z.number().min(1, 'Rol es requerido')),
  sueldo: z.number().or(z.string()).optional(),
  aporte: z.number().or(z.string()).optional(),
  descuento: z.number().nullable().optional(),
  foto: z.string().nullable().optional(),
  estado: z.number().optional(),
});

export const UserCreateSchema = UserSchema.omit({ id: true });
export const UserUpdateSchema = UserSchema.partial().extend({ id: z.string().or(z.number()) });

export const RoomSchema = z.object({
  id_habitacion: z.string(),
  numero: z.string(),
  estado: z.number(),
  price: z.number().nullable().optional(),
  time: z.number().nullable().optional(),
  comision_anfitriona: z.number().nullable().optional(),
});

export const TimerSchema = z.object({
  servicioId: z.string(),
  roomId: z.string(),
  roomName: z.string(),
  duration: z.number(),
  startTime: z.string().or(z.date()),
  codigo: z.string(),
  clienteNombre: z.string(),
  isPaused: z.boolean().optional(),
  tipoTransaccion: z.enum(['servicio', 'venta']).optional(),
  anfitrionas: z.string().optional(),
});

export const CashRegisterStatusSchema = z.object({
  hasOpenCaja: z.boolean().nullable(),
  cajaInfo: z.object({
    id_caja: z.string(),
    usuario_id_apertura: z.string(),
    fecha_apertura: z.string(),
  }).nullable(),
});

export type UserType = z.infer<typeof UserSchema>;
export type RoomType = z.infer<typeof RoomSchema>;
export type TimerType = z.infer<typeof TimerSchema>;
export type CashRegisterStatusType = z.infer<typeof CashRegisterStatusSchema>;
export const CommissionCreateSchema = z.object({
  usuario_id: z.string().min(1, 'ID de anfitriona es requerido'),
  venta_id: z.string().nullable().optional(),
  servicio_id: z.string().nullable().optional(),
  monto: z.number().min(0, 'El monto debe ser mayor o igual a 0')
}).refine(data => data.venta_id || data.servicio_id, {
  message: 'Debe especificar al menos una venta o un servicio'
});

export const CommissionUpdateSchema = z.object({
  id: z.string().min(1, 'ID es requerido'),
  status: z.enum(['por_pagar', 'pagado', 'anulado']).optional(),
  monto: z.number().min(0).optional(),
});
export const CajaOpenSchema = z.object({
  usuario_id_apertura: z.string().min(1, 'ID de usuario es requerido'),
  monto_apertura: z.number().min(0, 'El monto de apertura debe ser mayor o igual a 0')
});

export const CajaUpdateSchema = z.object({
  id: z.string().min(1),
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
export const SaleCreateSchema = z.object({
  total: z.number().min(0),
  sub_total: z.number().optional(),
  cliente_id: z.string().nullable().optional(),
  pedido_id: z.string().nullable().optional(),
  habitacion_id: z.string().nullable().optional(),
  metodo_pago: z.enum(['efectivo', 'tarjeta', 'transferencia', 'prepago']).optional().default('efectivo'),
  propina: z.number().optional().default(0),
  usuarios: z.array(z.string()).optional().default([]),
  tiempo: z.number().optional().default(0),
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
export const ServiceCreateSchema = z.object({
  cliente_id: z.string().nullable().optional(),
  habitacion_id: z.string().min(1, 'Habitación es requerida'),
  precio_habitacion: z.number().min(0).optional().default(0),
  precio_servicio: z.number().min(0),
  iva: z.number().optional().default(0),
  sub_total: z.number().min(0),
  total: z.number().min(0),
  tiempo: z.number().min(1, 'Tiempo es requerido'),
  metodo_pago: z.enum(['efectivo', 'tarjeta', 'transferencia', 'prepago']).optional().default('efectivo'),
  usuarios: z.array(z.string()).min(1, 'Al menos una anfitriona es requerida'),
  clientes: z.array(z.string()).optional().default([])
});
export const ProductSchema = z.object({
  code: z.string().min(1, 'Código requerido'),
  name: z.string().min(1, 'Nombre requerido'),
  category_id: z.string().min(1, 'Categoría requerida'),
  price: z.preprocess(v => Number(v), z.number()),
  commission: z.preprocess(v => Number(v), z.number()),
  description: z.string().optional(),
  status: z.preprocess(v => Number(v), z.number()),
  foto: z.string().optional()
});
