/**
 * Casos de uso de productos — API pública de servidor del módulo inventario.
 *
 * El alta y la edición de un producto escriben tres cosas que son del mismo
 * dominio: la fila de `productos`, sus presentaciones y las unidades que se
 * generen. Por eso la unidad de trabajo se abre aquí, dentro del módulo: antes
 * la abría `ProductRepository` en la capa heredada y el módulo tenía que
 * engancharse a esa transacción con el puente de contexto opaco. Ahora la operación no
 * sale del módulo en ningún momento.
 *
 * Las lecturas no abren unidad ni emiten efectos, por eso el servicio las
 * reexporta de la infraestructura.
 */
import { withTransaction } from '@/lib/database/db';
import type { ProductType } from '@/lib/business/schemas';
import {
  actualizarProducto as actualizarEnRepositorio,
  buscarProductos,
  crearProducto as crearEnRepositorio,
  eliminarProducto,
  guardarNivelesChampagne as guardarNivelesEnRepositorio,
  listarProductos,
  obtenerNivelesChampagne,
  obtenerProductoPorCodigoONombre,
  obtenerProductoPorId,
  reordenarProductos,
  type CodigoGenerado,
  type NuevaPresentacionProducto
} from './repositorio';

export type { CodigoGenerado, NuevaPresentacionProducto };

export {
  buscarProductos,
  eliminarProducto,
  listarProductos,
  obtenerNivelesChampagne,
  obtenerProductoPorCodigoONombre,
  obtenerProductoPorId,
  reordenarProductos
};

/** Alta de producto: devuelve el producto ya creado con sus códigos generados. */
export async function crearProducto(
  data: Partial<ProductType>,
  foto: string,
  presentaciones: NuevaPresentacionProducto[] = []
): Promise<(ProductType & { codigos_generados?: CodigoGenerado[] }) | null> {
  let id!: string;
  let codigos: CodigoGenerado[] = [];
  await withTransaction(async trx => {
    const creada = await crearEnRepositorio(trx, data, foto, presentaciones);
    id = creada.id;
    codigos = creada.codigos;
  });

  const created = await obtenerProductoPorId(id);
  return created ? { ...created, codigos_generados: codigos } : null;
}

/** Edición de producto: sólo se tocan los campos enviados. */
export async function actualizarProducto(
  id: string,
  data: Partial<ProductType>,
  foto?: string,
  presentacionesNuevas: NuevaPresentacionProducto[] = []
): Promise<ProductType | null> {
  await withTransaction(async trx => {
    await actualizarEnRepositorio(trx, id, data, foto, presentacionesNuevas);
  });
  return await obtenerProductoPorId(id);
}

/** Reemplaza los niveles de champán del producto: se borran y se escriben nuevos. */
export async function guardarNivelesChampagne(
  productoId: string,
  tiers: { anfitrionas: number; precio: number; comision: number }[]
): Promise<void> {
  await withTransaction(async trx => {
    await guardarNivelesEnRepositorio(trx, productoId, tiers);
  });
}
