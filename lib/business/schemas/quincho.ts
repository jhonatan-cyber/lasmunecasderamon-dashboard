import { z } from 'zod';
import { esFechaISO } from '@/lib/business/vencimiento';
import { MAX_TOTAL_RESERVA } from '@/lib/business/quinchos';

/**
 * Datos que se capturan al reservar un quincho. El total no se recibe: lo
 * calcula el servidor con personas × monto por persona (misma regla que usa el
 * formulario), así el monto que se acredita al prepago no puede desviarse de lo
 * que se vio en pantalla.
 */
export const ReservaQuinchoSchema = z
  .object({
    cliente_id: z.string().trim().min(1, 'Selecciona o crea un cliente'),
    fecha_reserva: z.string().refine(esFechaISO, 'Fecha de reserva inválida'),
    cantidad_personas: z.preprocess(
      v => (v === undefined || v === null || v === '' ? undefined : Number(v)),
      z
        .number()
        .int('La cantidad de personas debe ser un número entero')
        .min(1, 'Debe haber al menos 1 persona')
        .max(500, 'Máximo 500 personas por reserva')
    ),
    monto_por_persona: z.preprocess(
      v => (v === undefined || v === null || v === '' ? undefined : Number(v)),
      z
        .number()
        .int('El monto por persona debe ser un número entero')
        .min(1, 'El monto por persona debe ser mayor a 0')
        .max(MAX_TOTAL_RESERVA, 'Monto por persona demasiado alto')
    ),
    metodo_pago: z.enum(['efectivo', 'tarjeta', 'transferencia']).default('efectivo'),
    observaciones: z.string().trim().max(500, 'Máximo 500 caracteres').optional()
  })
  .refine(
    datos =>
      !datos.cantidad_personas ||
      !datos.monto_por_persona ||
      datos.cantidad_personas * datos.monto_por_persona <= MAX_TOTAL_RESERVA,
    { message: 'El total de la reserva supera el máximo permitido', path: ['monto_por_persona'] }
  );

export type ReservaQuinchoInput = z.infer<typeof ReservaQuinchoSchema>;
