import { query, generateUUID, withTransaction, type TransactionQuery } from '@/lib/database/db';
import { getNowInBusinessTimezone } from '@/lib/business/timezoneService';
import { BaseRepository } from './BaseRepository';
import type { PurchaseDetailInput } from '@/types/purchase';

type Queryable = TransactionQuery | typeof query;

export interface CompraRow {
  id: string;
  folio: string;
  total: number;
  observaciones: string | null;
  usuario_id: string | null;
  fecha_crea: string;
}

export class PurchaseRepository {
  /** Crea cabecera + detalle. No genera stock (lo hace el servicio). */
  static async create(
    trx: Queryable,
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
    for (const d of detalles) {
      await BaseRepository.insert(trx, 'detalle_compras', {
        id: generateUUID(),
        compra_id: id,
        producto_id: d.producto_id,
        presentacion_id: d.presentacion_id,
        cantidad: d.cantidad,
        precio_compra: d.precio_compra,
        subtotal: d.subtotal
      });
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

  static async createStandalone(
    data: {
      total: number;
      proveedor?: string | null;
      telefono?: string | null;
      observaciones?: string | null;
      usuario_id?: string | null;
    },
    detalles: (PurchaseDetailInput & { subtotal: number })[]
  ): Promise<CompraRow> {
    let creada!: CompraRow;
    await withTransaction(async trx => {
      creada = await this.create(trx, data, detalles);
    });
    return creada;
  }

  static async list(limit = 100): Promise<any[]> {
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
}
