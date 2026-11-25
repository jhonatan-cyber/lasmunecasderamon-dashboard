import { query } from '@/lib/database/db';
import { getNowInBusinessTimezone } from '@/lib/business/timezoneService';

type OrderNotificationInput = {
  pedidoId: string;
  codigo: string;
  clienteId: string | null | undefined;
  meseroId: string;
  total: number;
};

export type OrderNotificationData = {
  id: string;
  codigo: string;
  cliente: string;
  mesero: string;
  anfitriona: string | null;
  total: number;
  timestamp: string;
  createdBy: string;
};

export async function buildOrderNotificationData({
  pedidoId,
  codigo,
  clienteId,
  meseroId,
  total
}: OrderNotificationInput): Promise<OrderNotificationData> {
  let clienteNombre = 'Sin cliente registrado';
  if (clienteId) {
    const clienteResults = await query<Array<{ nombre: string; apellido: string }>>(
      'SELECT nombre, apellido FROM clientes WHERE id_cliente = ?',
      [clienteId]
    );
    const cliente = clienteResults[0];
    if (cliente) clienteNombre = `${cliente.nombre} ${cliente.apellido} `;
  }

  const meseros = await query<Array<{ nombre: string; apellido?: string | null }>>(
    'SELECT nombre, apellido FROM usuarios WHERE id_usuario = ?',
    [meseroId]
  );
  const mesero = meseros[0];
  const meseroNombre = mesero ? `${mesero.nombre} ${mesero.apellido || ''} `.trim() : 'Garzon';

  const anfitrionas = await query<Array<{ anfitrionas: string | null }>>(
    `SELECT STRING_AGG(u.nick, ', ') AS anfitrionas
       FROM pedidos_usuarios pu
       INNER JOIN usuarios u ON pu.usuario_id = u.id_usuario
      WHERE pu.pedido_id = ?`,
    [pedidoId]
  );

  return {
    id: pedidoId,
    codigo,
    cliente: clienteNombre,
    mesero: meseroNombre,
    anfitriona: anfitrionas[0]?.anfitrionas || null,
    total,
    timestamp: getNowInBusinessTimezone(),
    createdBy: meseroId
  };
}
