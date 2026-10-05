/**
 * Casos de uso de catálogo — API pública de servidor del módulo inventario.
 * Lectura pura: no abre unidad de trabajo ni tiene efectos posteriores al
 * commit.
 */
import { listarParaVenta as listarEnRepositorio, type FiltrosParaVenta } from './repositorio';

export type { FiltrosParaVenta };

/** Presentaciones con stock activo en el bar, con el precio ya resuelto. */
export async function listarParaVenta(filters?: FiltrosParaVenta): Promise<any[]> {
  return await listarEnRepositorio(filters);
}
