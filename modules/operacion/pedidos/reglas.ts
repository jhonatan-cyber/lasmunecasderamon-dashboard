import { BusinessError } from '@/lib/errors/errors';
import { orderLineToSaleDetail } from '@/lib/sales/orderSale';

/** La venta conserva la instantanea del pedido; solo admite ajustar su duracion. */
export function ventaDesdePedido(pedido: any, detalles: any[], tiempo: number = 0) {
  if (!pedido || Number(pedido.estado) !== 1 || !detalles.length)
    throw new BusinessError('El pedido no existe o ya fue procesado', 'ORDER_ALREADY_PROCESSED');
  if (!['efectivo', 'tarjeta', 'transferencia'].includes(pedido.metodo_pago))
    throw new BusinessError('El pedido no tiene un metodo de pago valido; debe generarse completo');
  const rooms = [...new Set(detalles.map(d => d.habitacion_id).filter(Boolean))];
  if (rooms.length > 1) throw new BusinessError('El pedido debe tener una sola habitacion');
  if (rooms.length && (!Number.isInteger(tiempo) || tiempo <= 0 || tiempo > 1440))
    throw new BusinessError('Selecciona un tiempo entre 1 y 1440 minutos');
  const lines = detalles.map(orderLineToSaleDetail);
  if (
    lines.some(
      (line, i) =>
        Number(detalles[i].comision || 0) > 0 && (!line.hostesses.length || !line.comision)
    )
  )
    throw new BusinessError(
      'El pedido no tiene anfitrionas para sus comisiones; debe generarse completo'
    );
  const subtotal = lines.reduce((sum, d) => sum + d.sub_total, 0);
  const propina = Number(pedido.propina || 0);
  return {
    pedido_id: String(pedido.id_pedido),
    cliente_id: pedido.cliente_id || null,
    metodo_pago: pedido.metodo_pago,
    propina,
    sub_total: subtotal,
    total: subtotal + propina,
    total_comision: lines.reduce((sum, d) => sum + d.comision, 0),
    detalles: lines,
    usuarios: [...new Set(lines.flatMap(d => d.hostesses))],
    habitacion_id: rooms[0] ? String(rooms[0]) : null,
    tiempo: rooms.length ? tiempo : 0
  };
}
