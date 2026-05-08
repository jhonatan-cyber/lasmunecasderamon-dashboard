import { z } from 'zod';

export const StatsGeneralSchema = z.object({
  caja_id: z.string().nullable().optional(),
  balance_total: z.number().default(0),
  total_ventas: z.number().default(0),
  cantidad_ventas: z.number().default(0),
  total_servicios: z.number().default(0),
  cantidad_servicios: z.number().default(0),
  total_efectivo: z.number().default(0),
  total_tarjeta: z.number().default(0),
  total_transferencia: z.number().default(0),
  total_anticipo: z.number().default(0),
  total_devolucion: z.number().default(0),
  total_propina: z.number().default(0),
  total_comision: z.number().default(0),
  total_iva: z.number().default(0),
  total_compras: z.number().default(0),
  monto_apertura: z.number().default(0),
  efectivo_en_caja: z.number().default(0),
  tiempo_abierta_horas: z.number().optional(),
  tiempo_abierta_minutos: z.number().optional(),
  fecha_apertura_raw: z.string().nullable().optional(),
  usuario_id_apertura: z.string().nullable().optional()
});

export type StatsGeneralType = z.infer<typeof StatsGeneralSchema>;

export const MonthlySalesSchema = z.object({
  mes: z.string(),
  total: z.number(),
  cantidad_ventas: z.number()
});

export type MonthlySalesType = z.infer<typeof MonthlySalesSchema>;

export const WeeklySalesSchema = z.object({
  dia_semana: z.string(),
  dia_espanol: z.string(),
  orden: z.number(),
  total: z.number()
});

export type WeeklySalesType = z.infer<typeof WeeklySalesSchema>;
