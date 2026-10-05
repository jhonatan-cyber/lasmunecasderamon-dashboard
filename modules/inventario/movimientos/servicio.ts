/**
 * Casos de uso de historial de movimientos — API pública de servidor del
 * módulo inventario. Lecturas puras: no abren unidad de trabajo ni tienen
 * efectos posteriores al commit.
 */
import {
  listarMovimientos as listarEnRepositorio,
  listarMovimientosRecientes as listarRecientesEnRepositorio
} from './repositorio';

/** Movimientos de una presentación, del más reciente al más antiguo. */
export async function listarMovimientos(presentacionId: string, limit = 20): Promise<any[]> {
  return await listarEnRepositorio(presentacionId, limit);
}

/** Últimos movimientos del local, con nombres y opciones de venta resueltas. */
export async function listarMovimientosRecientes(limit = 100): Promise<any[]> {
  return await listarRecientesEnRepositorio(limit);
}
