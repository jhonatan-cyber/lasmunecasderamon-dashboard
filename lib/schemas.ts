import { z } from 'zod';

/**
 * Esquemas de validación unificados para las respuestas de la API.
 */

export const UserSchema = z.object({
  id: z.string(),
  name: z.string(),
  nick: z.string(),
  role: z.string(),
  status: z.number().optional(),
  qr_token: z.string().nullable().optional(),
  email: z.string().email().nullable().optional(),
});

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
