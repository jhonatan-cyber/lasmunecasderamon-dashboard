/**
 * Venta que sale del cobro de una cuenta, armada de forma pura a partir de las
 * filas de la cuenta.
 *
 * El cajero cierra la cuenta y registra la venta de lo que se consumió: eran dos
 * requests que el servidor no ejecutaba atómicamente. Con la cola de intenciones
 * del dispositivo las dos cosas tienen que viajar y confirmar como UNA, así que
 * el payload se arma acá, dentro de la misma transacción que cierra la cuenta,
 * y no desde la app: así lo facturado sale de las mismas filas que lo cobrado y
 * no del carrito guardado en el dispositivo.
 *
 * Reproduce lo que la app mandaba en su segundo paso: `origen: 'cuenta'` (la
 * venta no postula saldos a caja ni descuenta prepago, porque el cobro ya lo
 * hizo) y la propina aparte del total.
 */

/** Métodos que `SaleCreateSchema` acepta para la venta. */
export const METODOS_PAGO_VENTA = [
  'efectivo',
  'tarjeta',
  'transferencia',
  'prepago',
  'mixto'
] as const;

export type MetodoPagoVenta = (typeof METODOS_PAGO_VENTA)[number];

export function esMetodoPagoVenta(valor: string): valor is MetodoPagoVenta {
  return (METODOS_PAGO_VENTA as readonly string[]).includes(valor);
}

export interface CuentaSaleCobro {
  /** Total cobrado por la cuenta, sin propina. */
  montoFinal: number;
  propinaFinal: number;
  metodoPago: MetodoPagoVenta;
  /** Hora del dispositivo en que se hizo el cobro; la usa la venta como fecha. */
  deviceDate?: string | null;
}

export interface CuentaSaleRow {
  codigo?: string | null;
  cliente_id?: string | null;
  pedido_id?: string | null;
  sub_total?: number | null;
  total_comision?: number | null;
}

export interface CuentaSaleDetalleRow {
  producto_id: string | null;
  precio: number;
  cantidad: number;
  sub_total: number;
  comision: number;
  hostess_id?: string | null;
}

export interface CuentaSalePayload {
  origen: 'cuenta';
  skip_client_prepago: true;
  codigo: string;
  cliente_id: string | null;
  pedido_id: string | null;
  metodo_pago: MetodoPagoVenta;
  propina: number;
  sub_total: number;
  total: number;
  total_comision: number;
  device_date?: string;
  detalles: Array<{
    producto_id: string;
    precio: number;
    cantidad: number;
    sub_total: number;
    comision: number;
    hostess_id: string | null;
  }>;
  usuarios: string[];
}

export function buildCuentaSalePayload(input: {
  cuenta: CuentaSaleRow;
  cobro: CuentaSaleCobro;
  detalles: CuentaSaleDetalleRow[];
  usuarios: Array<string | null | undefined>;
}): CuentaSalePayload {
  const { cuenta, cobro, detalles, usuarios } = input;

  return {
    origen: 'cuenta',
    skip_client_prepago: true,
    codigo: String(cuenta.codigo ?? ''),
    cliente_id: cuenta.cliente_id != null ? String(cuenta.cliente_id) : null,
    pedido_id: cuenta.pedido_id != null ? String(cuenta.pedido_id) : null,
    metodo_pago: cobro.metodoPago,
    propina: cobro.propinaFinal,
    // El subtotal es el de la cuenta; lo que paga el cliente es lo cobrado más
    // la propina, igual que lo que postula el cobro a caja.
    sub_total: Number(cuenta.sub_total ?? cobro.montoFinal),
    total: cobro.montoFinal + cobro.propinaFinal,
    total_comision: Number(cuenta.total_comision ?? 0),
    ...(cobro.deviceDate ? { device_date: cobro.deviceDate } : {}),
    detalles: detalles.map(detalle => ({
      producto_id: String(detalle.producto_id),
      precio: Number(detalle.precio ?? 0),
      cantidad: Number(detalle.cantidad ?? 1),
      sub_total: Number(detalle.sub_total ?? 0),
      comision: Number(detalle.comision ?? 0),
      hostess_id: detalle.hostess_id != null ? String(detalle.hostess_id) : null
    })),
    usuarios: usuarios
      .filter((usuario): usuario is string => usuario != null && usuario !== '')
      .map(String)
  };
}
