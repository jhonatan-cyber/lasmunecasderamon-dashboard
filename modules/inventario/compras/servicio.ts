/**
 * Casos de uso de compras — API pública de servidor del módulo inventario.
 *
 * Registrar una compra es una operación de inventario: crea la cabecera y el
 * detalle, genera las unidades que ingresan al almacén con su código, fija el
 * último costo de cada presentación y sincroniza el stock del producto. Todo
 * eso ocurre en una sola unidad de trabajo, y ahora dentro del módulo, así que
 * ya no hace falta el puente que adaptaba la transacción heredada.
 *
 * No hay efectos posteriores al commit: quien registra la compra imprime los
 * códigos que devuelve la propia respuesta, y el stock se lee bajo demanda.
 */
import { withTransaction } from '@/lib/database/db';
import { BaseRepository } from '@/lib/repositories/BaseRepository';
import { ValidationError, NotFoundError } from '@/lib/errors/errors';
import { z } from 'zod';
import type { PurchaseCreate, PurchaseGeneratedCode } from '@/types/purchase';
import { generarUnidades, sincronizarStockTotal } from '../unidades/repositorio';
import { listarPresentacionesPorProductos } from '../presentaciones/repositorio';
import { crearCompra, listarCompras, type CompraRow } from './repositorio';
import { productosPorIds } from '../productos/repositorio';

const DetalleSchema = z.object({
  producto_id: z.string().min(1, 'producto_id es requerido'),
  presentacion_id: z.string().min(1, 'presentacion_id es requerida'),
  cantidad: z.preprocess(
    v => Number(v),
    z.number().int().min(1, 'Cantidad debe estar entre 1 y 1000').max(1000)
  ),
  precio_compra: z.preprocess(
    v => (v === undefined || v === null || v === '' ? 0 : Number(v)),
    z.number().int().min(0, 'El precio de compra no puede ser negativo').max(2147483647)
  )
});

const CompraSchema = z.object({
  detalles: z.array(DetalleSchema).min(1, 'Agrega al menos un ítem').max(100),
  proveedor: z.string().max(120).nullish(),
  telefono: z.string().max(30).nullish(),
  observaciones: z.string().max(500).nullish()
});

/**
 * Registra una compra: valida el payload, guarda cabecera y detalle e ingresa
 * las unidades al almacén. O se guarda todo, o no se guarda nada.
 */
export async function registrarCompra(
  input: PurchaseCreate,
  usuarioId?: string | null
): Promise<CompraRow & { codigos_generados: PurchaseGeneratedCode[] }> {
  const parsed = CompraSchema.safeParse(input);
  if (!parsed.success) {
    throw new ValidationError('Compra inválida: revisa cantidades y precios', parsed.error.issues);
  }
  if (!usuarioId) throw new ValidationError('Se requiere el usuario que registra la compra');

  const detalles = parsed.data.detalles.map(d => ({
    ...d,
    subtotal: d.cantidad * d.precio_compra
  }));
  const total = detalles.reduce((acc, d) => acc + d.subtotal, 0);

  let compra!: CompraRow;
  // Códigos generados en esta compra, listos para imprimir (agrupables por producto).
  const codigosGenerados: PurchaseGeneratedCode[] = [];

  await withTransaction(async trx => {
    // Valida pertenencia antes de mover stock (consultas batch por IN).
    const productoIds = [...new Set(detalles.map(d => d.producto_id))];
    const nombresProducto = new Map<string, string>();
    let presentacionesMap: Record<string, { id: string; nombre: string }[]> = {};
    if (productoIds.length > 0) {
      const productoRows = await productosPorIds(trx, productoIds);
      const found = new Set(productoRows.map(r => String(r.id_producto)));
      for (const pid of productoIds) {
        if (!found.has(pid)) throw new NotFoundError('Producto', pid);
      }
      for (const row of productoRows) {
        nombresProducto.set(String(row.id_producto), String(row.nombre ?? ''));
      }
      presentacionesMap = await listarPresentacionesPorProductos(productoIds, trx);
      for (const d of detalles) {
        const validas = new Set((presentacionesMap[d.producto_id] ?? []).map(p => String(p.id)));
        if (!validas.has(String(d.presentacion_id))) {
          throw new ValidationError('La presentación no pertenece a este producto');
        }
      }
    }

    compra = await crearCompra(
      trx,
      {
        total,
        proveedor: parsed.data.proveedor ?? null,
        telefono: parsed.data.telefono ?? null,
        observaciones: parsed.data.observaciones ?? null,
        usuario_id: usuarioId
      },
      detalles
    );

    for (const d of detalles) {
      const generadas = await generarUnidades(
        trx,
        d.producto_id,
        d.cantidad,
        d.presentacion_id,
        compra.id
      );
      const presentacion = (presentacionesMap[d.producto_id] ?? []).find(
        p => String(p.id) === String(d.presentacion_id)
      );
      for (const unidad of generadas) {
        codigosGenerados.push({
          id: unidad.id,
          codigo: unidad.codigo,
          codigo_barras: unidad.codigo_barras,
          producto_id: d.producto_id,
          producto_nombre: nombresProducto.get(d.producto_id) || 'Producto',
          presentacion_id: d.presentacion_id,
          presentacion_nombre: presentacion?.nombre || 'Presentación',
          compra_folio: compra.folio
        });
      }
      // Último costo conocido por presentación (misma transacción).
      await BaseRepository.update(trx, 'inventario_presentaciones', 'id', d.presentacion_id, {
        precio_compra: d.precio_compra
      });
    }
    // Un sync de stock por producto distinto (no por línea de detalle).
    for (const pid of productoIds) {
      await sincronizarStockTotal(trx, pid);
    }
  });

  return { ...compra, codigos_generados: codigosGenerados };
}

export async function listar(limit?: unknown): Promise<any[]> {
  const n = Number(limit);
  return await listarCompras(Number.isFinite(n) && n > 0 ? Math.min(Math.floor(n), 500) : 100);
}
