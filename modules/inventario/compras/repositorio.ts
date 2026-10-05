/**
 * SQL de compras y su detalle. Infraestructura privada del módulo: nadie fuera
 * de `modules/inventario` importa este archivo (§5).
 *
 * Venía de `lib/repositories/PurchaseRepository.ts` y `lib/services/PurchaseService.ts`,
 * los últimos reductos de la compra en la capa heredada. La compra es,inventario:
 * genera las unidades que ingresan al almacén y fija el último costo de cada
 * presentación, así que su escritura ahora es del módulo de punta a punta y no
 * necesita el puente de transacción heredada.
 *
 * Mismo SQL, mismo folio por secuencia y mismos códigos generados que antes:
 * este corte mueve código, no cambia reglas.
 */
import { query, generateUUID, type TransactionQuery } from '@/lib/database/db';
import { getNowInBusinessTimezone } from '@/lib/business/timezoneService';
import { BaseRepository } from '@/lib/repositories/BaseRepository';
import type { PurchaseDetailInput } from '@/types/purchase';

export interface CompraRow {
  id: string;
  folio: string;
  total: number;
  observaciones: string | null;
  usuario_id: string | null;
  fecha_crea: string;
}

/** Crea cabecera + detalle. No genera stock: eso lo hace el servicio del módulo. */
export async function crearCompra(
  trx: TransactionQuery,
  data: {
    total: number;
    proveedor?: string | null;
    telefono?: string | null;
    observaciones?: string | null;
    usuario_id?: string | null;
  },
  detalles: (PurchaseDetailInput & { subtotal: number })[]
): Promise<CompraRow> {
  const id = generateUUID();
  const folioRows = await trx<any[]>(`SELECT nextval('compras_folio_seq') AS seq`, []);
  const folio = `C-${String(Number(folioRows[0]?.seq ?? 0)).padStart(4, '0')}`;
  await BaseRepository.insert(trx, 'compras', {
    id,
    folio,
    total: data.total,
    proveedor: data.proveedor?.trim() ? data.proveedor.trim().slice(0, 120) : null,
    telefono: data.telefono?.trim() ? data.telefono.trim().slice(0, 30) : null,
    observaciones: data.observaciones?.trim() ? data.observaciones.trim() : null,
    usuario_id: data.usuario_id ?? null,
    fecha_crea: getNowInBusinessTimezone()
  });
  if (detalles.length > 0) {
    const columns = [
      'id',
      'compra_id',
      'producto_id',
      'presentacion_id',
      'cantidad',
      'precio_compra',
      'subtotal'
    ];
    const tuples = detalles.map(() => `(${columns.map(() => '?').join(', ')})`).join(', ');
    const values = detalles.flatMap(d => [
      generateUUID(),
      id,
      d.producto_id,
      d.presentacion_id,
      d.cantidad,
      d.precio_compra,
      d.subtotal
    ]);
    await trx(`INSERT INTO detalle_compras (${columns.join(', ')}) VALUES ${tuples}`, values);
  }
  const row = await BaseRepository.findOne<any>(trx, 'compras', 'id', id);
  return {
    id: row.id,
    folio: row.folio,
    total: Number(row.total ?? 0),
    observaciones: row.observaciones ?? null,
    usuario_id: row.usuario_id ?? null,
    fecha_crea: row.fecha_crea
  };
}

export async function listarCompras(limit = 100): Promise<any[]> {
  const compras = await query<any[]>(
    `SELECT c.*, COALESCE(u.nick, 'Sin usuario') AS usuario_nombre
       FROM compras c
       LEFT JOIN usuarios u ON u.id_usuario = c.usuario_id
       ORDER BY c.fecha_crea DESC, c.id DESC LIMIT ?`,
    [limit]
  );
  if (compras.length === 0) return [];
  const ids = compras.map(c => String(c.id));
  const placeholders = ids.map(() => '?').join(',');
  const detalles = await query<any[]>(
    `SELECT d.*, pr.nombre AS producto_nombre, p.nombre AS presentacion_nombre
       FROM detalle_compras d
       LEFT JOIN productos pr ON pr.id_producto = d.producto_id
       LEFT JOIN inventario_presentaciones p ON p.id = d.presentacion_id
       WHERE d.compra_id IN (${placeholders})
       ORDER BY d.id ASC`,
    ids
  );
  const porCompra: Record<string, any[]> = {};
  for (const d of detalles) {
    (porCompra[String(d.compra_id)] ??= []).push({
      ...d,
      cantidad: Number(d.cantidad ?? 0),
      precio_compra: Number(d.precio_compra ?? 0),
      subtotal: Number(d.subtotal ?? 0),
      producto_nombre: d.producto_nombre ?? 'Producto eliminado',
      presentacion_nombre: d.presentacion_nombre ?? 'Presentación eliminada'
    });
  }
  return compras.map(c => ({
    ...c,
    total: Number(c.total ?? 0),
    detalles: porCompra[String(c.id)] ?? []
  }));
}
