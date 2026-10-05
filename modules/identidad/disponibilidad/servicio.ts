import type { ContextoOperacion } from '@/lib/transaccion/contrato';
import { actualizarDisponibilidadAnfitrionas, listarAnfitrionasEnLocal } from './repositorio';
export function actualizarDisponibilidadTrasVenta(
  ids: string[],
  ventaId: string,
  contexto: ContextoOperacion
) {
  return actualizarDisponibilidadAnfitrionas(contexto, ids, undefined, ventaId);
}

export function actualizarDisponibilidad(
  ids: string[],
  contexto: ContextoOperacion,
  servicioId?: string,
  ventaId?: string
) {
  return actualizarDisponibilidadAnfitrionas(contexto, ids, servicioId, ventaId);
}

export function validarAnfitrionasEnLocal(ids: string[], contexto: ContextoOperacion) {
  return listarAnfitrionasEnLocal(ids, contexto);
}
