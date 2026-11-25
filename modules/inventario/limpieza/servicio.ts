import { withTransaction, generateUUID } from '@/lib/database/db';
import { AppError, BusinessError, NotFoundError } from '@/lib/errors/errors';
import { sendNotificationToAll } from '@/lib/api/sseService';
import { accesoLimpieza, type OperacionLimpieza } from '@/lib/business/limpieza';
import {
  bloquearArticulo,
  buscarArticuloDeMovimiento,
  crearArticulo,
  crearMovimiento,
  descontarStock,
  inicializarStockArticulo,
  listarArticulos,
  listarMovimientos,
  listarStock,
  listarTransito,
  obtenerArticuloParaOperar,
  obtenerMovimientoParaResolver,
  prepararLectura,
  resolverMovimiento,
  sumarStock
} from './repositorio';
import {
  UBICACIONES_LIMPIEZA,
  type ArticuloLimpieza,
  type UbicacionLimpieza
} from '@/types/limpieza';

type Actor = { id: string; role: string };
const prohibido = () => {
  throw new AppError('No tienes acceso a esta operación de limpieza', 'FORBIDDEN', 403);
};

export async function listarLimpieza(actor: Actor) {
  const acceso = accesoLimpieza(actor.role);
  if (!acceso.ubicaciones.length) prohibido();
  return withTransaction(async trx => {
    await prepararLectura(trx);
    const articulos = await listarArticulos(trx);
    const stock = await listarStock(trx);
    const transito = await listarTransito(trx);
    const movimientos = await listarMovimientos(trx, acceso.gestionar, acceso.ubicaciones);
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
      const inserted = await crearArticulo(trx, {
        id,
        nombre: op.nombre,
        unidad: op.unidad,
        minimo: op.minimo,
        creadoPor: actor.id
      });
      if (!inserted.length) throw new BusinessError('Ya existe un artículo con ese nombre');
      await inicializarStockArticulo(trx, id, UBICACIONES_LIMPIEZA);
      return { id };
    }
    if (op.tipo === 'resolver') {
      // Bloquear siempre artículo antes que movimiento para evitar interbloqueos.
      const reference = await buscarArticuloDeMovimiento(trx, op.id);
      if (!reference.length) throw new NotFoundError('Traspaso');
      await bloquearArticulo(trx, reference[0].articulo_id);
      const rows = await obtenerMovimientoParaResolver(trx, op.id);
      const m = rows[0];
      if (m.tipo !== 'traspaso' || m.estado !== 'pendiente')
        throw new BusinessError('El traspaso ya fue resuelto');
      if (!m.destino || !m.origen) throw new BusinessError('Traspaso inválido');
      if (!acceso.ubicaciones.includes(m.destino)) prohibido();
      const estado = op.accion === 'aceptar' ? 'aceptado' : 'rechazado';
      await sumarStock(
        trx,
        m.articulo_id,
        op.accion === 'aceptar' ? m.destino : m.origen,
        Number(m.cantidad)
      );
      await resolverMovimiento(trx, op.id, estado, actor.id);
      return { id: op.id, estado };
    }
    const article = await obtenerArticuloParaOperar(trx, op.articulo_id);
    if (!article.length) throw new NotFoundError('Artículo');
    if (['unidad', 'paquete'].includes(article[0].unidad) && !Number.isInteger(op.cantidad))
      throw new BusinessError('Unidades y paquetes requieren cantidades enteras');
    if (op.tipo !== 'ingreso') {
      const removed = await descontarStock(trx, op.articulo_id, op.origen, op.cantidad);
      if (!removed.length) throw new BusinessError('Stock insuficiente en el origen');
    } else await sumarStock(trx, op.articulo_id, 'almacen', op.cantidad);
    const id = generateUUID();
    await crearMovimiento(trx, [
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
    ]);
    return { id };
  });
  // El inventario de limpieza cambió: las demás sesiones con la página abierta refrescan.
  sendNotificationToAll('cleaning_updated', { tipo: op.tipo });
  return resultado;
}
