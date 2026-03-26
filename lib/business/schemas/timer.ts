import { z } from 'zod';

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

export type TimerType = z.infer<typeof TimerSchema>;
