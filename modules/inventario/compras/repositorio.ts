/**
 * SQL de compras y su detalle. Infraestructura privada del módulo: nadie fuera
 * de `modules/inventario` importa este archivo (§5).
 *
 * Venía de `lib/repositories/PurchaseRepository.ts` y `lib/services/PurchaseService.ts`,
 * los últimos reductos de la compra en la capa heredada. La compra es,inventario:
 * genera las unidades que ingresan a la bodega y fija el último costo de cada
 * presentación, así que su escritura ahora es del módulo de punta a punta y no
 * necesita el puente de transacción heredada.
 *
 * El folio de compra es un código aleatorio de 8 caracteres en mayúsculas:
 * letras y dígitos, con al menos una letra y un número. Antes de insertar se
 * comprueba contra los folios existentes; el UNIQUE de `compras.folio` sigue
 * siendo la garantía final.
 */
import { randomInt } from 'node:crypto';
import { query, generateUUID, type TransactionQuery } from '@/lib/database/db';
import { getNowInBusinessTimezone } from '@/lib/business/timezoneService';
import { BaseRepository } from '@/lib/database/base-repository';
import type { PurchaseDetailInput, PurchaseGeneratedCode } from '@/types/purchase';

const FOLIO_LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const FOLIO_DIGITS = '0123456789';
const FOLIO_ALPHABET = `${FOLIO_LETTERS}${FOLIO_DIGITS}`;
const FOLIO_LENGTH = 8;
const FOLIO_ATTEMPTS = 5;

function generarFolioCompra(): string {
  const chars = [
    FOLIO_LETTERS[randomInt(FOLIO_LETTERS.length)],
    FOLIO_DIGITS[randomInt(FOLIO_DIGITS.length)],
    ...Array.from(
      { length: FOLIO_LENGTH - 2 },
      () => FOLIO_ALPHABET[randomInt(FOLIO_ALPHABET.length)]
    )
  ];
  for (let i = chars.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join('');
}

async function generarFolioCompraUnico(trx: TransactionQuery): Promise<string> {
  for (let intento = 0; intento < FOLIO_ATTEMPTS; intento += 1) {
    const folio = generarFolioCompra();
    const existentes = await trx<any[]>('SELECT 1 FROM compras WHERE folio = ? LIMIT 1', [folio]);
    if (existentes.length === 0) return folio;
  }
  throw new Error('No se pudo generar un folio de compra único');
}

export interface CompraRow {
  id: string;
  folio: string;
  total: number;
  observaciones: string | null;
  metodo_pago: 'efectivo' | 'tarjeta' | 'transferencia';
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
    metodo_pago?: 'efectivo' | 'tarjeta' | 'transferencia';
    usuario_id?: string | null;
  },
  detalles: (PurchaseDetailInput & { subtotal: number })[]
): Promise<CompraRow> {
  const id = generateUUID();
  const folio = await generarFolioCompraUnico(trx);
  await BaseRepository.insert(trx, 'compras', {
    id,
    folio,
    total: data.total,
    proveedor: data.proveedor?.trim() ? data.proveedor.trim().slice(0, 120) : null,
    telefono: data.telefono?.trim() ? data.telefono.trim().slice(0, 30) : null,
    observaciones: data.observaciones?.trim() ? data.observaciones.trim() : null,
    metodo_pago: data.metodo_pago ?? 'efectivo',
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
      'subtotal',
      // Fechas de lote de la línea: el vencimiento llega ya resuelto.
      'fecha_elaboracion',
      'duracion_meses',
      'fecha_vencimiento'
    ];
    const tuples = detalles.map(() => `(${columns.map(() => '?').join(', ')})`).join(', ');
    const values = detalles.flatMap(d => [
      generateUUID(),
      id,
      d.producto_id,
      d.presentacion_id,
      d.cantidad,
      d.precio_compra,
      d.subtotal,
      d.fecha_elaboracion ?? null,
      d.duracion_meses ?? null,
      d.fecha_vencimiento ?? null
    ]);
    await trx(`INSERT INTO detalle_compras (${columns.join(', ')}) VALUES ${tuples}`, values);
  }
  const row = await BaseRepository.findOne<any>(trx, 'compras', 'id', id);
  return {
    id: row.id,
    folio: row.folio,
    total: Number(row.total ?? 0),
    observaciones: row.observaciones ?? null,
    metodo_pago: row.metodo_pago ?? 'efectivo',
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
    `SELECT d.*, pr.foto AS producto_foto, p.foto AS presentacion_foto,
            pr.nombre AS producto_nombre, p.nombre AS presentacion_nombre
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
      presentacion_nombre: d.presentacion_nombre ?? 'Presentación eliminada',
      producto_foto: d.producto_foto ?? null,
      presentacion_foto: d.presentacion_foto ?? null
    });
  }
  return compras.map(c => ({
    ...c,
    total: Number(c.total ?? 0),
    detalles: porCompra[String(c.id)] ?? []
  }));
}

/** Códigos de las unidades que ingresaron con una compra, agrupables por presentación. */
export async function listarCodigosDeCompra(compraId: string): Promise<PurchaseGeneratedCode[]> {
  const rows = await query<any[]>(
    `SELECT u.id, u.codigo, u.codigo_barras, u.producto_id, u.presentacion_id,
            pr.nombre AS producto_nombre, p.nombre AS presentacion_nombre,
            c.folio AS compra_folio
       FROM inventario_unidades u
       JOIN compras c ON c.id = u.compra_id
       LEFT JOIN productos pr ON pr.id_producto = u.producto_id
       LEFT JOIN inventario_presentaciones p ON p.id = u.presentacion_id
       WHERE u.compra_id = ?
       ORDER BY u.codigo ASC`,
    [compraId]
  );
  return rows.map(row => ({
    id: String(row.id),
    codigo: String(row.codigo ?? ''),
    codigo_barras: String(row.codigo_barras ?? ''),
    producto_id: String(row.producto_id ?? ''),
    producto_nombre: row.producto_nombre ?? 'Producto eliminado',
    presentacion_id: String(row.presentacion_id ?? ''),
    presentacion_nombre: row.presentacion_nombre ?? 'Presentación eliminada',
    compra_folio: String(row.compra_folio ?? '')
  }));
}
