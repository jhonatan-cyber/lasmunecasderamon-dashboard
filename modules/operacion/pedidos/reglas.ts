import { BusinessError } from '@/lib/errors/errors';
import { orderLineToSaleDetail } from '@/lib/sales/orderSale';

/** Métodos con los que se puede cobrar un pedido en caja. */
const METODOS_COBRO_PEDIDO = ['efectivo', 'tarjeta', 'transferencia', 'prepago', 'mixto'];

/**
 * Instantánea del pedido tal como se registró: productos, precios, comisiones,
 * anfitrionas y habitación. El pago es un valor por defecto; quien cobra puede
 * reemplazarlo con `aplicarCobroAPedido`.
 */
export function ventaDesdePedido(pedido: any, detalles: any[], tiempo: number = 0) {
  if (!pedido || Number(pedido.estado) !== 1 || !detalles.length)
    throw new BusinessError('El pedido no existe o ya fue procesado', 'ORDER_ALREADY_PROCESSED');
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

/**
 * Cobra el pedido con el pago que eligió el cajero. La instantánea manda sobre
 * lo que se vendió (el cliente no puede cambiar productos, precios ni
 * comisiones); el cobro manda sobre el pago: método, prepago y propina. El
 * total se recalcula con la propina final, así el importe no viaja del cliente.
 *
 * El método es obligatorio: un pedido antiguo sin `metodo_pago` se puede cobrar
 * igual si el cajero lo elige al cobrarlo.
 */
export function aplicarCobroAPedido<T extends Record<string, any>>(
  venta: T,
  cobro: Record<string, any>
): T {
  const metodo = cobro.metodo_pago ?? venta.metodo_pago;
  if (!METODOS_COBRO_PEDIDO.includes(metodo))
    throw new BusinessError(
      'Selecciona el metodo de pago al cobrar el pedido',
      'ORDER_PAYMENT_REQUIRED'
    );

  const propina = cobro.propina === undefined ? Number(venta.propina || 0) : Number(cobro.propina);
  if (!Number.isFinite(propina) || propina < 0)
    throw new BusinessError('La propina del pedido no es valida', 'INVALID_ORDER_TIP');

  const resultado: Record<string, any> = {
    ...venta,
    metodo_pago: metodo,
    propina,
    total: Number(venta.sub_total || 0) + propina
  };

  // El cliente decide de quién es el saldo prepago. Si la caja elige uno, manda;
  // si no, se conserva el del pedido.
  if (cobro.cliente_id !== undefined && cobro.cliente_id !== null)
    resultado.cliente_id = cobro.cliente_id;

  // Solo viajan los repartos que el cajero mandó: si cobra simple, el prepago
  // se descuenta con el saldo del cliente y no se inventa un pago mixto.
  for (const campo of [
    'metodo_pago_adicional',
    'monto_prepago',
    'monto_adicional',
    'pagos_mixtos',
    'prepago_destinos'
  ] as const) {
    if (cobro[campo] !== undefined) resultado[campo] = cobro[campo];
  }

  return resultado as T;
}
