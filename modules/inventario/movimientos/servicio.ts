/**
 * Casos de uso de historial de movimientos — API pública de servidor del
 * módulo inventario. Lecturas puras: no abren unidad de trabajo ni tienen
 * efectos posteriores al commit.
 */
import {
  buscarMovimientosRecientes as buscarEnRepositorio,
  listarMovimientos as listarEnRepositorio,
  listarMovimientosRecientes as listarRecientesEnRepositorio,
  normalizarLimite,
  normalizarPagina,
  type FiltroHistorialMovimientos
} from './repositorio';

/** Movimientos de una presentación, del más reciente al más antiguo. */
export async function listarMovimientos(presentacionId: string, limit = 20): Promise<any[]> {
  return await listarEnRepositorio(presentacionId, limit);
}

/** Página del historial con el total del mismo filtro, para paginar. */
export interface HistorialPaginado {
  movimientos: any[];
  /** Movimientos que cumplen el filtro, no los de esta página. */
  total: number;
  pagina: number;
  /** Páginas disponibles; al menos 1, aunque no haya movimientos. */
  paginas: number;
  limite: number;
}

export async function buscarMovimientosRecientes(
  filtro: FiltroHistorialMovimientos = {}
): Promise<HistorialPaginado> {
  const limite = normalizarLimite(filtro.limit);
  const pagina = normalizarPagina(filtro.page);
  const resultado = await buscarEnRepositorio({ ...filtro, limit: limite, page: pagina });
  return {
    movimientos: resultado.movimientos,
    total: resultado.total,
    pagina: resultado.pagina,
    paginas: Math.max(1, Math.ceil(resultado.total / limite)),
    limite: resultado.limite
  };
}

/** Últimos movimientos del local, con nombres y opciones de venta resueltas. */
export async function listarMovimientosRecientes(limit = 100): Promise<any[]> {
  return await listarRecientesEnRepositorio(limit);
}
