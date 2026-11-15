import type { ContextoOperacion } from '@/lib/transaction/contract';
import { actualizarDisponibilidadAnfitrionas, listarAnfitrionasEnLocal, verificarAnfitrionaOcupada as verificarOcupada } from './repositorio';
import { comprobarAnfitrionasLibresParaServicio as comprobarLibres } from './repositorio';

export function comprobarAnfitrionasLibresParaServicio(
  ...args: Parameters<typeof comprobarLibres>
) {
  return comprobarLibres(...args);
}
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

export function verificarAnfitrionaOcupada(userId: string) {
  return verificarOcupada(userId);
}
