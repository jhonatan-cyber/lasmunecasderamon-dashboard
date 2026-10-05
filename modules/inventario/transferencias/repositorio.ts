/**
 * SQL de transferencias entre almacén y bar. Infraestructura privada del módulo:
 * nadie fuera de `modules/inventario` importa este archivo (§5).
 *
 * El traspaso crea el movimiento pendiente y reserva las unidades en tránsito; la
 * aceptación las ingresa al bar y fija precio/comisión en la presentación; el
 * rechazo las devuelve al almacén y recalcula el stock del producto. Mismo SQL,
 * mismos bloqueos `FOR UPDATE` y mismas validaciones que la capa heredada
 * (`TransferQueries`/`BarQueries`): este corte mueve código, no cambia reglas.
 */
import { query, generateUUID, type TransactionQuery } from '@/lib/database/db';
import { getTopeSimple } from '../bar/configuracion';
import { completarOpciones, parseOpcionesVenta, resolverBotella } from '../helpers';
import { ESTADO_UNIDAD_ACTIVA } from '../estados';
import { BusinessError, NotFoundError } from '@/lib/errors/errors';
import { getNowInBusinessTimezone } from '@/lib/business/timezoneService';
import { BaseRepository } from '@/lib/database/base-repository';
import { sincronizarStockTotal } from '../unidades/repositorio';
import type { TraspasoInput, TraspasoResultado } from '../contracts';
import type { TransferRecord } from '@/types/transfer';

export async function traspasarAlBar(
  trx: TransactionQuery,
  input: TraspasoInput
): Promise<TraspasoResultado> {
  // Serializa traspasos del mismo producto, incluso entre distintas presentaciones.
  await trx('SELECT id_producto FROM productos WHERE id_producto = ? FOR UPDATE', [
    input.producto_id
  ]);
  const candidatas = await trx<any[]>(
    `SELECT id FROM inventario_unidades
     WHERE producto_id = ? AND presentacion_id = ?
       AND estado = '${ESTADO_UNIDAD_ACTIVA}' AND ubicacion = 'almacen'
     ORDER BY fecha_crea ASC, codigo ASC
     LIMIT ?
     FOR UPDATE`,
    [input.producto_id, input.presentacion_id, input.cantidad]
  );
  if (candidatas.length < input.cantidad) {
    throw new BusinessError(
      `Stock insuficiente en almacén: hay ${candidatas.length} y se pidieron ${input.cantidad}`
    );
  }
  const ids = candidatas.map(r => String(r.id));
  const placeholders = ids.map(() => '?').join(',');
  if (!input.usuario_id)
    throw new BusinessError('Se requiere el usuario que realiza la transferencia');
  const movimientoId = generateUUID();
  // Si no se envían precio/comisión, reutiliza la configuración guardada de la presentación.
  let opciones = input.opciones_venta;
  let precioVenta = input.precio_venta;
  let comision = input.comision;
  if (!opciones || opciones.length === 0) {
    const presRows = await trx<any[]>(
      'SELECT opciones_venta, precio_venta, comision FROM inventario_presentaciones WHERE id = ? LIMIT 1',
      [input.presentacion_id]
    );
    const guardadas =
      parseOpcionesVenta(presRows[0]?.opciones_venta) ??
      (presRows[0]
        ? [
            {
              tipo: 'botella' as const,
              precio: Number(presRows[0].precio_venta ?? 0),
              comision: Number(presRows[0].comision ?? 0)
            }
          ]
        : undefined);
    if (precioVenta === undefined && comision === undefined) {
      opciones = guardadas;
    } else {
      opciones = [
        {
          tipo: 'botella' as const,
          precio: Number(precioVenta ?? 0),
          comision: Number(comision ?? 0)
        }
      ];
    }
  }
  if (!opciones || opciones.length === 0) {
    throw new BusinessError(
      'La presentación no tiene precio ni comisión configurados: indícalos para la primera transferencia'
    );
  }
  const botella = opciones.find(o => o.tipo === 'botella');
  precioVenta = botella?.precio ?? opciones[0].precio ?? 0;
  comision = botella?.comision ?? opciones[0].comision ?? 0;
  if (
    !Number.isFinite(precioVenta) ||
    precioVenta < 0 ||
    !Number.isFinite(comision) ||
    comision < 0
  ) {
    throw new BusinessError(
      'La presentación no tiene precio ni comisión configurados: indícalos para la primera transferencia'
    );
  }
  const opcionesVenta = JSON.stringify(opciones);
  await BaseRepository.insert(trx, 'inventario_movimientos', {
    id: movimientoId,
    tipo: 'traspaso',
    estado: 'pendiente',
    opciones_venta: opcionesVenta,
    producto_id: input.producto_id,
    presentacion_id: input.presentacion_id,
    cantidad: input.cantidad,
    precio_venta: Math.floor(precioVenta),
    comision: Math.floor(comision),
    usuario_id: input.usuario_id,
    fecha_crea: getNowInBusinessTimezone()
  });
  await trx(
    `UPDATE inventario_unidades SET ubicacion = 'transito', transferencia_id = ? WHERE id IN (${placeholders})`,
    [movimientoId, ...ids]
  );
  await sincronizarStockTotal(trx, input.producto_id);
  const enBar = await trx<any[]>(
    `SELECT COUNT(*) AS total FROM inventario_unidades
     WHERE presentacion_id = ? AND estado = '${ESTADO_UNIDAD_ACTIVA}' AND ubicacion = 'bar'`,
    [input.presentacion_id]
  );
  return { trasladadas: input.cantidad, stock_bar: Number(enBar[0]?.total ?? 0) };
}

export async function aceptarTransferencia(
  trx: TransactionQuery,
  id: string,
  usuarioId: string
): Promise<void> {
  const receivers = await trx<any[]>(
    `SELECT u.id_usuario FROM usuarios u INNER JOIN roles r ON r.id_rol = u.rol_id
     WHERE u.id_usuario = ? AND u.estado = 1 AND r.estado = 1 AND LOWER(r.nombre) = 'barman'`,
    [usuarioId]
  );
  if (!receivers.length)
    throw new BusinessError('Solo el encargado del bar (Barman) puede aceptar la transferencia');
  const lookup = await trx<any[]>(
    "SELECT producto_id FROM inventario_movimientos WHERE id = ? AND tipo = 'traspaso'",
    [id]
  );
  if (!lookup.length) throw new NotFoundError('Transferencia', id);
  await trx('SELECT id_producto FROM productos WHERE id_producto = ? FOR UPDATE', [
    lookup[0].producto_id
  ]);
  const movements = await trx<any[]>(
    "SELECT * FROM inventario_movimientos WHERE id = ? AND tipo = 'traspaso' FOR UPDATE",
    [id]
  );
  const movement = movements[0];
  if (!movement || movement.estado !== 'pendiente')
    throw new BusinessError('La transferencia ya fue procesada o no está pendiente');
  if (movement.usuario_id === usuarioId)
    throw new BusinessError('La recepción debe confirmarla una persona distinta de quien envió');
  const units = await trx<any[]>(
    `SELECT id FROM inventario_unidades WHERE transferencia_id = ? AND ubicacion = 'transito'
     AND estado = '${ESTADO_UNIDAD_ACTIVA}' AND producto_id = ? AND presentacion_id = ? FOR UPDATE`,
    [id, movement.producto_id, movement.presentacion_id]
  );
  if (units.length !== Number(movement.cantidad))
    throw new BusinessError('Las unidades reservadas no coinciden con la cantidad enviada');
  await trx(
    "UPDATE inventario_unidades SET ubicacion = 'bar', transferencia_id = NULL WHERE transferencia_id = ?",
    [id]
  );
  await BaseRepository.update(trx, 'inventario_presentaciones', 'id', movement.presentacion_id, {
    opciones_venta: JSON.stringify(movement.opciones_venta),
    precio_venta: movement.precio_venta,
    comision: movement.comision
  });
  await BaseRepository.update(trx, 'inventario_movimientos', 'id', id, {
    estado: 'aceptada',
    aceptado_por: usuarioId,
    fecha_aceptacion: getNowInBusinessTimezone()
  });
}

export async function rechazarTransferencia(
  trx: TransactionQuery,
  id: string,
  usuarioId: string
): Promise<void> {
  const resolvers = await trx<any[]>(
    `SELECT u.id_usuario FROM usuarios u INNER JOIN roles r ON r.id_rol = u.rol_id
     WHERE u.id_usuario = ? AND u.estado = 1 AND r.estado = 1 AND LOWER(r.nombre) = 'barman'`,
    [usuarioId]
  );
  if (!resolvers.length)
    throw new BusinessError('Solo el encargado del bar (Barman) puede rechazar la transferencia');
  const lookup = await trx<any[]>(
    "SELECT producto_id FROM inventario_movimientos WHERE id = ? AND tipo = 'traspaso'",
    [id]
  );
  if (!lookup.length) throw new NotFoundError('Transferencia', id);
  await trx('SELECT id_producto FROM productos WHERE id_producto = ? FOR UPDATE', [
    lookup[0].producto_id
  ]);
  const movements = await trx<any[]>(
    "SELECT * FROM inventario_movimientos WHERE id = ? AND tipo = 'traspaso' FOR UPDATE",
    [id]
  );
  const movement = movements[0];
  if (!movement) throw new NotFoundError('Transferencia', id);
  if (movement.estado !== 'pendiente')
    throw new BusinessError('La transferencia ya fue procesada o no está pendiente');
  await trx(
    "UPDATE inventario_unidades SET ubicacion = 'almacen', transferencia_id = NULL WHERE transferencia_id = ?",
    [id]
  );
  await BaseRepository.update(trx, 'inventario_movimientos', 'id', id, {
    estado: 'rechazada',
    aceptado_por: usuarioId,
    fecha_aceptacion: getNowInBusinessTimezone()
  });
  await sincronizarStockTotal(trx, movement.producto_id);
}

/**
 * Historial de transferencias (o sólo las pendientes), con las opciones de venta
 * completadas desde presentación y producto. Lectura: va por el pool.
 */
export async function listarTransferencias(pendientesOnly = false): Promise<TransferRecord[]> {
  const rows = await query<any[]>(
    `SELECT m.id, m.producto_id, m.cantidad, m.fecha_crea, m.precio_venta, m.comision, m.opciones_venta, m.estado, m.usuario_id, m.aceptado_por, m.fecha_aceptacion,
      COALESCE(p.nombre, 'Producto eliminado') AS producto_nombre,
      COALESCE(pr.nombre, 'Presentación eliminada') AS presentacion_nombre,
      COALESCE(u.nick, 'Sin usuario') AS usuario_nombre,
      receptor.nick AS aceptado_nombre,
      c.nombre AS categoria_nombre,
      pr.precio_venta AS pres_precio, pr.comision AS pres_comision,
      p.precio AS producto_precio, p.comision AS producto_comision, p.ml_shot,
      p.ml_shot_anfitriona
     FROM inventario_movimientos m
     LEFT JOIN productos p ON p.id_producto = m.producto_id
     LEFT JOIN inventario_presentaciones pr ON pr.id = m.presentacion_id
     LEFT JOIN categorias c ON c.id_categoria = p.categoria_id
     LEFT JOIN usuarios u ON u.id_usuario = m.usuario_id
     LEFT JOIN usuarios receptor ON receptor.id_usuario = m.aceptado_por
      WHERE m.tipo = 'traspaso' ${pendientesOnly ? "AND m.estado = 'pendiente'" : ''}
      ORDER BY (m.estado = 'pendiente') DESC, m.fecha_crea DESC, m.id DESC ${pendientesOnly ? '' : 'LIMIT 100'}`,
    []
  );
  const topeSimple = await getTopeSimple();
  return rows.map(row => ({
    ...row,
    opciones_venta:
      completarOpciones(
        row.opciones_venta,
        [
          { precio: Number(row.precio_venta ?? 0), comision: Number(row.comision ?? 0) },
          { precio: Number(row.pres_precio ?? 0), comision: Number(row.pres_comision ?? 0) },
          {
            precio: Number(row.producto_precio ?? 0),
            comision: Number(row.producto_comision ?? 0)
          }
        ],
        topeSimple
      ) ??
      (row.precio_venta !== null && row.precio_venta !== undefined
        ? [
            resolverBotella(
              { precio: 0, comision: 0 },
              [
                {
                  precio: Number(row.precio_venta ?? 0),
                  comision: Number(row.comision ?? 0)
                }
              ],
              topeSimple
            )
          ]
        : undefined)
  })) as TransferRecord[];
}
