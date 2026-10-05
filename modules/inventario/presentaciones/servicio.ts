/**
 * Casos de uso de presentaciones — API pública de servidor del módulo
 * inventario.
 *
 * Las lecturas aceptan un `ContextoOperacion` opaco opcional (§6): con
 * contexto leen dentro de la transacción del flujo que lo llamó (consistencia
 * con lo que esa unidad escribió) y sin contexto van por el pool. El alta es
 * la única operación que abre unidad propia cuando no llega contexto, para que
 * la inserción y su lectura de vuelta sean atómicas.
 */
import { query, withTransaction } from '@/lib/database/db';
import { resolverTransaccion } from '@/lib/transaccion/infraestructura';
import type { ContextoOperacion } from '@/lib/transaccion/contrato';
import type { PresentacionRow } from '@/lib/repositories/inventory/inventoryTypes';
import type { NuevaPresentacionInput, PresentacionCamposInput } from '../contracts';
import {
  actualizarFotoPresentacion as actualizarFotoEnRepositorio,
  actualizarPresentacion as actualizarEnRepositorio,
  buscarPresentacionPorCodigo as buscarPorCodigoEnRepositorio,
  crearPresentacion as crearEnRepositorio,
  eliminarPresentacion as eliminarEnRepositorio,
  listarPresentaciones as listarEnRepositorio,
  listarPresentacionesPorProductos as listarPorProductosEnRepositorio,
  obtenerPresentacion as obtenerEnRepositorio
} from './repositorio';

export async function listarPresentaciones(
  productoId: string,
  contexto?: ContextoOperacion
): Promise<PresentacionRow[]> {
  return await listarEnRepositorio(productoId, contexto ? resolverTransaccion(contexto) : query);
}

export async function listarPresentacionesPorProductos(
  productoIds: string[],
  contexto?: ContextoOperacion
): Promise<Record<string, PresentacionRow[]>> {
  return await listarPorProductosEnRepositorio(
    productoIds,
    contexto ? resolverTransaccion(contexto) : query
  );
}

export async function crearPresentacion(
  data: NuevaPresentacionInput,
  contexto?: ContextoOperacion
): Promise<PresentacionRow> {
  if (contexto) return await crearEnRepositorio(resolverTransaccion(contexto), data);
  let creada!: PresentacionRow;
  await withTransaction(async trx => {
    creada = await crearEnRepositorio(trx, data);
  });
  return creada;
}

export async function actualizarPresentacion(
  id: string,
  fields: PresentacionCamposInput
): Promise<void> {
  await actualizarEnRepositorio(id, fields);
}

export async function actualizarFotoPresentacion(id: string, foto: string): Promise<void> {
  await actualizarFotoEnRepositorio(id, foto);
}

export async function eliminarPresentacion(id: string): Promise<void> {
  await eliminarEnRepositorio(id);
}

export async function obtenerPresentacion(id: string): Promise<PresentacionRow | null> {
  return await obtenerEnRepositorio(id);
}

export async function buscarPresentacionPorCodigo(
  codigoBarras: string,
  contexto?: ContextoOperacion
): Promise<PresentacionRow | null> {
  return await buscarPorCodigoEnRepositorio(
    codigoBarras,
    contexto ? resolverTransaccion(contexto) : query
  );
}
