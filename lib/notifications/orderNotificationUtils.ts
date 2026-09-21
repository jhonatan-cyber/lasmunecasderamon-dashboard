import { query } from '@/lib/database/db';
import { getNowInBusinessTimezone } from '@/lib/business/timezoneService';

type OrderNotificationInput = {
  pedidoId: string;
  codigo: string;
  clienteId: string | null | undefined;
  meseroId: string;
  total: number;
};

type OrderNotificationData = {
  id: string;
  codigo: string;
  cliente: string;
  mesero: string;
  anfitriona: string | null;
  total: number;
  timestamp: string;
  createdBy: string;
};

type OrderDeletionNotificationData = {
  id: string;
  meseroId: string | null;
  timestamp: string;
};

export async function buildOrderNotificationData({
  pedidoId,
  codigo,
  clienteId,
  meseroId,
  total,
}: OrderNotificationInput): Promise<OrderNotificationData> {
  let clienteNombre = 'Sin cliente registrado';
  if (clienteId) {
    const clienteResults = (await query(
      'SELECT nombre, apellido FROM clientes WHERE id_cliente = ?',
      [clienteId]
    )) as Array<{ nombre: string; apellido: string }>;
    const clienteResult = clienteResults[0];
    if (clienteResult) {
      clienteNombre = `${clienteResult.nombre} ${clienteResult.apellido} `;
    }
  }

  const meseroResults = (await query(
    'SELECT nombre, apellido FROM usuarios WHERE id_usuario = ?',
    [meseroId]
  )) as Array<{ nombre: string; apellido?: string | null }>;
  const meseroResult = meseroResults[0];
  const meseroNombre = meseroResult
    ? `${meseroResult.nombre} ${meseroResult.apellido || ''} `.trim()
    : 'Garzon';

  const anfitrionasResults = (await query(
    `
      SELECT STRING_AGG(u.nick, ', ') as anfitrionas
      FROM pedidos_usuarios pu
      INNER JOIN usuarios u ON pu.usuario_id = u.id_usuario
      WHERE pu.pedido_id = ?
  `,
    [pedidoId]
  )) as Array<{ anfitrionas: string | null }>;

  const anfitrionasNombre = anfitrionasResults[0]?.anfitrionas || null;

  return {
    id: pedidoId,
    codigo,
    cliente: clienteNombre,
    mesero: meseroNombre,
    anfitriona: anfitrionasNombre,
    total,
    timestamp: getNowInBusinessTimezone(),
    createdBy: meseroId,
  };
}

export function buildOrderDeletionNotificationData(
  pedidoId: string,
  meseroId: string | null | undefined
): OrderDeletionNotificationData {
  return {
    id: pedidoId,
    meseroId: meseroId ?? null,
    timestamp: getNowInBusinessTimezone(),
  };
}
