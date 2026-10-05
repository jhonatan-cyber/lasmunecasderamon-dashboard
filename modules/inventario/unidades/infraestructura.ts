/**
 * Casos de uso de unidades de catálogo — API pública de servidor del módulo
 * inventario.
 *
 * Cada operación acepta un `ContextoOperacion` opaco (§6): con contexto
 * escribe en la transacción que abrió el flujo que lo llamó (creación de
 * producto, compra); sin contexto abre su propia unidad y ejecuta el caso de
 * uso completo de forma atómica (alta de unidades = generación + recálculo de
 * stock en la misma unidad).
 */
import { withTransaction } from '@/lib/database/db';
import { resolverTransaccion } from '@/lib/transaccion/infraestructura';
import type { ContextoOperacion } from '@/lib/transaccion/contrato';
import type { UnidadRow } from '../tipos';
import type { UnidadesGenerarInput } from '../contracts';
import {
  cambiarEstadoUnidades as cambiarEstadoEnRepositorio,
  generarUnidades as generarEnRepositorio,
  listarUnidades as listarEnRepositorio,
  marcarImpresas as marcarEnRepositorio,
  sincronizarStockTotal as sincronizarEnRepositorio
} from './repositorio';

/**
 * Genera unidades nuevas sin tocar `productos.stock_almacen`: los flujos que
 * ya sincronizan al final (creación de producto, compras) la llaman dentro de
 * su transacción y después mandan su propio sync.
 */
export async function generarUnidades(
  input: UnidadesGenerarInput,
  contexto?: ContextoOperacion
): Promise<{ id: string; codigo: string; codigo_barras: string }[]> {
  const ejecutar = async (trx: Parameters<typeof generarEnRepositorio>[0]) =>
    await generarEnRepositorio(
      trx,
      input.producto_id,
      input.cantidad,
      input.presentacion_id,
      input.compra_id
    );
  if (contexto) return await ejecutar(resolverTransaccion(contexto));
  let generadas: { id: string; codigo: string; codigo_barras: string }[] = [];
  await withTransaction(async trx => {
    generadas = await ejecutar(trx);
  });
  return generadas;
}

/**
 * Alta de unidades desde el catálogo: genera y recalcula el stock del
 * producto en la misma unidad (atómico sin contexto).
 */
export async function registrarUnidades(
  input: UnidadesGenerarInput,
  contexto?: ContextoOperacion
): Promise<{ id: string; codigo: string; codigo_barras: string }[]> {
  if (contexto) {
    const trx = resolverTransaccion(contexto);
    const generadas = await generarEnRepositorio(
      trx,
      input.producto_id,
      input.cantidad,
      input.presentacion_id,
      input.compra_id
    );
    await sincronizarEnRepositorio(trx, input.producto_id);
    return generadas;
  }
  let generadas: { id: string; codigo: string; codigo_barras: string }[] = [];
  await withTransaction(async trx => {
    generadas = await generarEnRepositorio(
      trx,
      input.producto_id,
      input.cantidad,
      input.presentacion_id,
      input.compra_id
    );
    await sincronizarEnRepositorio(trx, input.producto_id);
  });
  return generadas;
}

export async function sincronizarStockTotal(
  productoId: string,
  contexto?: ContextoOperacion
): Promise<number> {
  if (contexto) return await sincronizarEnRepositorio(resolverTransaccion(contexto), productoId);
  let total = 0;
  await withTransaction(async trx => {
    total = await sincronizarEnRepositorio(trx, productoId);
  });
  return total;
}

/**
 * Cambia el estado de unidades seleccionadas y recalcula el stock del
 * producto en la misma unidad.
 */
export async function cambiarEstadoUnidades(
  productoId: string,
  unidadIds: string[],
  estado: string,
  contexto?: ContextoOperacion
): Promise<number> {
  const ejecutar = async (trx: Parameters<typeof cambiarEstadoEnRepositorio>[0]) => {
    await cambiarEstadoEnRepositorio(trx, unidadIds, estado);
    return await sincronizarEnRepositorio(trx, productoId);
  };
  if (contexto) return await ejecutar(resolverTransaccion(contexto));
  let total = 0;
  await withTransaction(async trx => {
    total = await ejecutar(trx);
  });
  return total;
}

export async function listarUnidades(
  productoId: string,
  limit?: number,
  ubicacion?: string,
  presentacionId?: string
): Promise<{ total: number; inactivas: number; unidades: UnidadRow[] }> {
  return await listarEnRepositorio(productoId, limit, ubicacion, presentacionId);
}

/** Marca códigos como impresos (lectura bloqueante + update en una unidad). */
export async function marcarUnidadesImpresas(
  ids: string[]
): Promise<{ id: string; fecha_impresion: string }[]> {
  let marcadas: { id: string; fecha_impresion: string }[] = [];
  await withTransaction(async trx => {
    marcadas = await marcarEnRepositorio(trx, ids);
  });
  return marcadas;
}
