import type { ContextoOperacion } from '@/lib/transaction/contract';
import { ValidationError } from '@/lib/errors/errors';
import { ReservaQuinchoSchema } from '@/lib/business/schemas';
import { calcularTotalReserva } from '@/lib/business/quinchos';
import type { ReservaQuincho } from '@/types/quincho';
import {
  insertarReservaQuincho,
  listarReservasQuincho,
  marcarReservaAnulada,
  marcarReservaUsado,
  marcarTodasLasPasadasComoUsado,
  reclamarReservaParaAnular
} from './repositorio';

/**
 * Listado completo de reservas con el cliente ya resuelto. Antes de devolver,
 * marca automáticamente como "usado" las reservas activas cuya fecha ya pasó,
 * para que no se puedan anular. Si el proceso de marcado falla (por ejemplo,
 * la migración de fecha_uso no se ha ejecutado), se registra la advertencia
 * pero sigue devolviendo el listado.
 */
export async function listarReservas(): Promise<ReservaQuincho[]> {
  try {
    await marcarTodasLasPasadasComoUsado();
  } catch (error) {
    // Si la columna fecha_uso no existe (migración pendiente) u otro error
    // de BD, se registra pero no se bloquea el listado.
    console.warn(
      '[Quinchos] No se pudieron marcar reservas pasadas como usadas:',
      error instanceof Error ? error.message : error
    );
  }
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

/** Marca una reserva activa como usada (su fecha ya pasó). */
export function marcarUsadoEnUnidad(
  id: string,
  contexto: ContextoOperacion
): Promise<ReservaQuincho> {
  return marcarReservaUsado(id, contexto);
}
