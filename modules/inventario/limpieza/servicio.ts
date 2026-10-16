import { withTransaction, generateUUID, type TransactionQuery } from '@/lib/database/db';
import { AppError, BusinessError, NotFoundError } from '@/lib/errors/errors';
import { sendNotificationToAll } from '@/lib/api/sseService';
import { accesoLimpieza, type OperacionLimpieza } from '@/lib/business/limpieza';
import {
  UBICACIONES_LIMPIEZA,
  type ArticuloLimpieza,
  type MovimientoLimpieza,
  type UbicacionLimpieza
} from '@/types/limpieza';

type Actor = { id: string; role: string };
const prohibido = () => {
  throw new AppError('No tienes acceso a esta operación de limpieza', 'FORBIDDEN', 403);
};

export async function listarLimpieza(actor: Actor) {
  const acceso = accesoLimpieza(actor.role);
  if (!acceso.ubicaciones.length) prohibido();
  return withTransaction(async query => {
    await query('SET TRANSACTION ISOLATION LEVEL REPEATABLE READ, READ ONLY');
    const articulos = await query<
      Array<{ id: string; nombre: string; unidad: string; minimo: number }>
    >('SELECT id, nombre, unidad, minimo FROM limpieza_articulos ORDER BY nombre');
    const stock = await query<
      Array<{ articulo_id: string; ubicacion: UbicacionLimpieza; cantidad: number }>
    >('SELECT * FROM limpieza_stock');
    const transito = await query<Array<{ articulo_id: string; cantidad: number }>>(
      "SELECT articulo_id, SUM(cantidad) AS cantidad FROM limpieza_movimientos WHERE estado = 'pendiente' GROUP BY articulo_id"
    );
    const movimientos = await query<MovimientoLimpieza[]>(
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
      [acceso.gestionar, acceso.ubicaciones, acceso.ubicaciones]
    );
    const items: ArticuloLimpieza[] = articulos.map(a => ({
      ...a,
      stock: Object.fromEntries(
        UBICACIONES_LIMPIEZA.map(u => [
          u,
          Number(stock.find(s => s.articulo_id === a.id && s.ubicacion === u)?.cantidad || 0)
        ])
      ) as ArticuloLimpieza['stock'],
      en_transito: Number(transito.find(t => t.articulo_id === a.id)?.cantidad || 0)
    }));
    return { articulos: items, movimientos, acceso };
  });
}

async function sumar(
  trx: TransactionQuery,
  id: string,
  lugar: UbicacionLimpieza,
  cantidad: number
) {
  await trx(
    `UPDATE limpieza_stock SET cantidad = cantidad + ? WHERE articulo_id = ? AND ubicacion = ?`,
    [cantidad, id, lugar]
  );
}

export async function operarLimpieza(op: OperacionLimpieza, actor: Actor) {
  const acceso = accesoLimpieza(actor.role);
  if (!acceso.ubicaciones.length) prohibido();
  if (['articulo', 'ingreso'].includes(op.tipo) && !acceso.gestionar) prohibido();
  if (op.tipo === 'traspaso') {
    if (op.origen === op.destino) throw new BusinessError('Origen y destino deben ser distintos');
    if (!acceso.gestionar && !(acceso.ubicaciones.includes(op.origen) && op.destino === 'almacen'))
      prohibido();
  }
  if (op.tipo === 'consumo' && !acceso.ubicaciones.includes(op.origen)) prohibido();
  const resultado = await withTransaction(async trx => {
    if (op.tipo === 'articulo') {
      // El índice único también impide duplicados entre peticiones concurrentes.
      const id = generateUUID();
      const inserted = await trx<Array<{ id: string }>>(
        `INSERT INTO limpieza_articulos (id,nombre,unidad,minimo,creado_por) VALUES (?,?,?,?,?) ON CONFLICT DO NOTHING RETURNING id`,
        [id, op.nombre, op.unidad, op.minimo, actor.id]
      );
      if (!inserted.length) throw new BusinessError('Ya existe un artículo con ese nombre');
      for (const lugar of UBICACIONES_LIMPIEZA)
        await trx('INSERT INTO limpieza_stock (articulo_id,ubicacion) VALUES (?,?)', [id, lugar]);
      return { id };
    }
    if (op.tipo === 'resolver') {
      // Bloquear siempre artículo antes que movimiento para evitar interbloqueos.
      const reference = await trx<Array<{ articulo_id: string }>>(
        'SELECT articulo_id FROM limpieza_movimientos WHERE id = ?',
        [op.id]
      );
      if (!reference.length) throw new NotFoundError('Traspaso');
      await trx('SELECT id FROM limpieza_articulos WHERE id = ? FOR UPDATE', [
        reference[0].articulo_id
      ]);
      const rows = await trx<MovimientoLimpieza[]>(
        'SELECT * FROM limpieza_movimientos WHERE id = ? FOR UPDATE',
        [op.id]
      );
      const m = rows[0];
      if (m.tipo !== 'traspaso' || m.estado !== 'pendiente')
        throw new BusinessError('El traspaso ya fue resuelto');
      if (!m.destino || !m.origen) throw new BusinessError('Traspaso inválido');
      if (!acceso.ubicaciones.includes(m.destino)) prohibido();
      const estado = op.accion === 'aceptar' ? 'aceptado' : 'rechazado';
      await sumar(
        trx,
        m.articulo_id,
        op.accion === 'aceptar' ? m.destino : m.origen,
        Number(m.cantidad)
      );
      await trx(
        'UPDATE limpieza_movimientos SET estado = ?, recibido_por = ?, fecha_resolucion = now() WHERE id = ?',
        [estado, actor.id, op.id]
      );
      return { id: op.id, estado };
    }
    const article = await trx<Array<{ id: string; unidad: string }>>(
      'SELECT id,unidad FROM limpieza_articulos WHERE id = ? FOR UPDATE',
      [op.articulo_id]
    );
    if (!article.length) throw new NotFoundError('Artículo');
    if (['unidad', 'paquete'].includes(article[0].unidad) && !Number.isInteger(op.cantidad))
      throw new BusinessError('Unidades y paquetes requieren cantidades enteras');
    if (op.tipo !== 'ingreso') {
      const removed = await trx<Array<{ cantidad: number }>>(
        'UPDATE limpieza_stock SET cantidad = cantidad - ? WHERE articulo_id = ? AND ubicacion = ? AND cantidad >= ? RETURNING cantidad',
        [op.cantidad, op.articulo_id, op.origen, op.cantidad]
      );
      if (!removed.length) throw new BusinessError('Stock insuficiente en el origen');
    } else await sumar(trx, op.articulo_id, 'almacen', op.cantidad);
    const id = generateUUID();
    await trx(
      `INSERT INTO limpieza_movimientos
      (id,articulo_id,tipo,cantidad,origen,destino,estado,nota,proveedor,costo_unitario,creado_por)
      VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
      [
        id,
        op.articulo_id,
        op.tipo,
        op.cantidad,
        op.tipo === 'ingreso' ? null : op.origen,
        op.tipo === 'ingreso' ? 'almacen' : op.tipo === 'traspaso' ? op.destino : null,
        op.tipo === 'traspaso' ? 'pendiente' : 'aceptado',
        op.nota,
        op.tipo === 'ingreso' ? op.proveedor : null,
        op.tipo === 'ingreso' ? op.costo_unitario : null,
        actor.id
      ]
    );
    return { id };
  });
  // El inventario de limpieza cambió: las demás sesiones con la página abierta refrescan.
  sendNotificationToAll('cleaning_updated', { tipo: op.tipo });
  return resultado;
}
