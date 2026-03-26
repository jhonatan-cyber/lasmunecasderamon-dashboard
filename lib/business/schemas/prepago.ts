import { z } from 'zod';

export const PrepagoMovementSchema = z.object({
  id_movimiento: z.string().optional(),
  cliente_id: z.string().min(1, 'Cliente es requerido'),
  tipo: z.enum(['CARGA', 'CONSUMO', 'DEVOLUCION']),
  monto: z.number().int(),
  metodo_pago: z.string().nullable().optional(),
  venta_id: z.string().nullable().optional(),
  usuario_id: z.string().nullable().optional(),
  fecha_crea: z.string().or(z.date()).optional(),
  metadatos: z.string().nullable().optional(),
});

export type PrepagoMovementType = z.infer<typeof PrepagoMovementSchema>;
