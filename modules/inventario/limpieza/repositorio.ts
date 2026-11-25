import type { TransactionQuery } from '@/lib/database/db';
import type { MovimientoLimpieza, UbicacionLimpieza } from '@/types/limpieza';

export interface ArticuloLimpiezaRow {
  id: string;
  nombre: string;
  unidad: string;
  minimo: number;
}

export interface StockLimpiezaRow {
  articulo_id: string;
  ubicacion: UbicacionLimpieza;
  cantidad: number;
}

export interface TransitoLimpiezaRow {
  articulo_id: string;
  cantidad: number;
}

export async function prepararLectura(trx: TransactionQuery): Promise<void> {
  await trx('SET TRANSACTION ISOLATION LEVEL REPEATABLE READ, READ ONLY');
}

export async function listarArticulos(trx: TransactionQuery): Promise<ArticuloLimpiezaRow[]> {
  return trx('SELECT id, nombre, unidad, minimo FROM limpieza_articulos ORDER BY nombre');
}

export async function listarStock(trx: TransactionQuery): Promise<StockLimpiezaRow[]> {
  return trx('SELECT * FROM limpieza_stock');
}

export async function listarTransito(trx: TransactionQuery): Promise<TransitoLimpiezaRow[]> {
  return trx(
    "SELECT articulo_id, SUM(cantidad) AS cantidad FROM limpieza_movimientos WHERE estado = 'pendiente' GROUP BY articulo_id"
  );
}

export async function listarMovimientos(
  trx: TransactionQuery,
  gestionar: boolean,
  ubicaciones: readonly UbicacionLimpieza[]
): Promise<MovimientoLimpieza[]> {
  return trx(
    `WITH visibles AS (
       SELECT * FROM limpieza_movimientos WHERE ? OR origen IN (?) OR destino IN (?)
     ), seleccion AS (
       SELECT * FROM visibles WHERE estado = 'pendiente'
       UNION ALL
       (SELECT * FROM visibles WHERE estado <> 'pendiente' ORDER BY fecha DESC LIMIT 500)
     )
     SELECT m.*, a.nombre AS articulo, a.unidad,
       COALESCE(NULLIF(concat_ws(' ', u.nombre, u.apellido), ''), m.creado_por) AS creador_nombre,
       COALESCE(NULLIF(concat_ws(' ', r.nombre, r.apellido), ''), m.recibido_por) AS receptor_nombre
     FROM seleccion m
     JOIN limpieza_articulos a ON a.id = m.articulo_id
     LEFT JOIN usuarios u ON u.id_usuario::text = m.creado_por
     LEFT JOIN usuarios r ON r.id_usuario::text = m.recibido_por
     ORDER BY (m.estado = 'pendiente') DESC, m.fecha DESC`,
    [gestionar, ubicaciones, ubicaciones]
  );
}

export async function crearArticulo(
  trx: TransactionQuery,
  data: { id: string; nombre: string; unidad: string; minimo: number; creadoPor: string }
): Promise<Array<{ id: string }>> {
  return trx(
    'INSERT INTO limpieza_articulos (id,nombre,unidad,minimo,creado_por) VALUES (?,?,?,?,?) ON CONFLICT DO NOTHING RETURNING id',
    [data.id, data.nombre, data.unidad, data.minimo, data.creadoPor]
  );
}

export async function inicializarStockArticulo(
  trx: TransactionQuery,
  articuloId: string,
  ubicaciones: readonly UbicacionLimpieza[]
): Promise<void> {
  for (const ubicacion of ubicaciones) {
    await trx('INSERT INTO limpieza_stock (articulo_id,ubicacion) VALUES (?,?)', [
      articuloId,
      ubicacion
    ]);
  }
}

export async function buscarArticuloDeMovimiento(
  trx: TransactionQuery,
  movimientoId: string
): Promise<Array<{ articulo_id: string }>> {
  return trx('SELECT articulo_id FROM limpieza_movimientos WHERE id = ?', [movimientoId]);
}

export async function bloquearArticulo(trx: TransactionQuery, articuloId: string): Promise<void> {
  await trx('SELECT id FROM limpieza_articulos WHERE id = ? FOR UPDATE', [articuloId]);
}

export async function obtenerMovimientoParaResolver(
  trx: TransactionQuery,
  movimientoId: string
): Promise<MovimientoLimpieza[]> {
  return trx('SELECT * FROM limpieza_movimientos WHERE id = ? FOR UPDATE', [movimientoId]);
}

export async function resolverMovimiento(
  trx: TransactionQuery,
  movimientoId: string,
  estado: 'aceptado' | 'rechazado',
  recibidoPor: string
): Promise<void> {
  await trx(
    'UPDATE limpieza_movimientos SET estado = ?, recibido_por = ?, fecha_resolucion = now() WHERE id = ?',
    [estado, recibidoPor, movimientoId]
  );
}

export async function obtenerArticuloParaOperar(
  trx: TransactionQuery,
  articuloId: string
): Promise<Array<{ id: string; unidad: string }>> {
  return trx('SELECT id,unidad FROM limpieza_articulos WHERE id = ? FOR UPDATE', [articuloId]);
}

export async function sumarStock(
  trx: TransactionQuery,
  articuloId: string,
  ubicacion: UbicacionLimpieza,
  cantidad: number
): Promise<void> {
  await trx(
    'UPDATE limpieza_stock SET cantidad = cantidad + ? WHERE articulo_id = ? AND ubicacion = ?',
    [cantidad, articuloId, ubicacion]
  );
}

export async function descontarStock(
  trx: TransactionQuery,
  articuloId: string,
  ubicacion: UbicacionLimpieza,
  cantidad: number
): Promise<Array<{ cantidad: number }>> {
  return trx(
    'UPDATE limpieza_stock SET cantidad = cantidad - ? WHERE articulo_id = ? AND ubicacion = ? AND cantidad >= ? RETURNING cantidad',
    [cantidad, articuloId, ubicacion, cantidad]
  );
}

export async function crearMovimiento(
  trx: TransactionQuery,
  values: [
    string,
    string,
    OperacionTipoLimpieza,
    number,
    UbicacionLimpieza | null,
    UbicacionLimpieza | null,
    'pendiente' | 'aceptado',
    string | null,
    string | null,
    number | null,
    string
  ]
): Promise<void> {
  await trx(
    `INSERT INTO limpieza_movimientos
      (id,articulo_id,tipo,cantidad,origen,destino,estado,nota,proveedor,costo_unitario,creado_por)
      VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
    values
  );
}

type OperacionTipoLimpieza = 'articulo' | 'ingreso' | 'traspaso' | 'consumo' | 'resolver';
