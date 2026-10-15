import { generateUUID, type TransactionQuery } from '@/lib/database/db';
import { calcularConsumoPrepago } from './reglas';
export async function procesarPrepago(
  trx: TransactionQuery,
  params: {
    clienteId: string;
    total: number;
    prepagoSolicitado: number | null;
    ventaId: string;
    createdBy: string;
    now: string;
    codigo: string;
    concepto: string;
  }
): Promise<number> {
  const { clienteId, total, prepagoSolicitado, ventaId, createdBy, now, codigo, concepto } = params;

  const clients = await trx<{ saldo: number }[]>(
    'SELECT saldo FROM clientes WHERE id_cliente = ? FOR UPDATE',
    [clienteId]
  );
  const saldoDisponible = Number(clients[0]?.saldo || 0);

  const prepagoMonto = calcularConsumoPrepago(saldoDisponible, total, prepagoSolicitado);
  if (prepagoMonto === null) return 0;

  await trx('UPDATE clientes SET saldo = GREATEST(0, saldo - ?) WHERE id_cliente = ?', [
    prepagoMonto,
    clienteId
  ]);

  await trx(
    `INSERT INTO clientes_prepago_movimientos 
     (id_movimiento, cliente_id, tipo, monto, metodo_pago, venta_id, usuario_id, fecha_crea, metadatos)
     VALUES (?, ?, 'CONSUMO', ?, 'prepago', ?, ?, ?, ?)`,
    [
      generateUUID(),
      clienteId,
      prepagoMonto,
      ventaId,
      createdBy,
      now,
      JSON.stringify({ venta_id: ventaId, codigo, concepto })
    ]
  );

  return prepagoMonto;
}
