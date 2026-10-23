import type { ContextoOperacion } from '@/lib/transaction/contract';
import { ValidationError } from '@/lib/errors/errors';
import { ReservaQuinchoSchema } from '@/lib/business/schemas';
import { calcularTotalReserva } from '@/lib/business/quinchos';
import type { ReservaQuincho } from '@/types/quincho';
import {
  insertarReservaQuincho,
  listarReservasQuincho,
  marcarReservaAnulada,
  reclamarReservaParaAnular
} from './repositorio';

/** Listado completo de reservas con el cliente ya resuelto. */
export function listarReservas(): Promise<ReservaQuincho[]> {
  return listarReservasQuincho();
}

/**
 * Valida y guarda la reserva dentro de una unidad de trabajo ajena. El total no
 * viene del cliente: se recalcula acá con personas × monto por persona, la
 * misma regla que muestra el formulario. El movimiento de dinero lo coordina el
 * workflow (`reservarQuincho`).
 */
export async function crearReservaEnUnidad(
  entrada: unknown,
  usuarioId: string | null,
  contexto: ContextoOperacion
): Promise<ReservaQuincho> {
  const parsed = ReservaQuinchoSchema.safeParse(entrada);
  if (!parsed.success) {
    throw new ValidationError(
      'Reserva inválida: revisa la fecha, las personas y los montos',
      parsed.error.issues
    );
  }

  const datos = parsed.data;
  const total = calcularTotalReserva(datos.cantidad_personas, datos.monto_por_persona);
  if (total <= 0) throw new ValidationError('El total de la reserva debe ser mayor a 0');

  return insertarReservaQuincho(
    {
      cliente_id: datos.cliente_id,
      fecha_reserva: datos.fecha_reserva,
      cantidad_personas: datos.cantidad_personas,
      monto_por_persona: datos.monto_por_persona,
      total,
      metodo_pago: datos.metodo_pago,
      observaciones: datos.observaciones?.trim() || null
    },
    usuarioId,
    contexto
  );
}

/** Reserva bloqueada y verificada activa para anularla en esta unidad. */
export function reclamarReserva(id: string, contexto: ContextoOperacion): Promise<ReservaQuincho> {
  return reclamarReservaParaAnular(id, contexto);
}

export function marcarAnuladaEnUnidad(
  id: string,
  usuarioId: string | null,
  contexto: ContextoOperacion
): Promise<ReservaQuincho> {
  return marcarReservaAnulada(id, usuarioId, contexto);
}
