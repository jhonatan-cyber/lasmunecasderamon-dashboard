import { generateUUID } from '@/lib/database/db';
import { type TransactionQuery } from '@/lib/database/db';
import { ValidationError, BusinessError } from '@/lib/errors/errors';

export type MixedPayment = {
  metodo: string;
  monto: number;
};

/**
 * Normaliza y filtra el array de pagos mixtos desde el input del request.
 */
export function parsePagosMixtos(raw: any): MixedPayment[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((pago: any) => ({
      metodo: String(pago?.metodo || ''),
      monto: Number(pago?.monto || 0),
    }))
    .filter((pago) => pago.metodo && pago.monto > 0);
}

/**
 * Valida que un pago mixto sea coherente (mínimo 2 métodos, suma == total).
 * Lanza Error si no es válido.
 */
export function validatePagosMixtos(pagosMixtos: MixedPayment[], total: number): void {
  if (pagosMixtos.length < 2) {
    throw new ValidationError('Pago mixto invalido: se requieren al menos 2 metodos');
  }
  const suma = pagosMixtos.reduce((sum, p) => sum + p.monto, 0);
  if (Math.abs(suma - total) > 1) {
    throw new ValidationError('Pago mixto invalido: la suma debe ser igual al total', { suma, total });
  }
}

/**
 * Calcula los deltas por método de pago para actualizar la caja.
 */
export function calcularDeltasCaja(pagosMixtos: MixedPayment[]) {
  return pagosMixtos.reduce(
    (acc, pago) => {
      if (pago.metodo === 'efectivo') acc.efectivo += pago.monto;
      if (pago.metodo === 'tarjeta') acc.tarjeta += pago.monto;
      if (pago.metodo === 'transferencia') acc.transferencia += pago.monto;
      return acc;
    },
    { efectivo: 0, tarjeta: 0, transferencia: 0 }
  );
}

/**
 * Procesa el descuento de saldo prepago del cliente dentro de una transacción.
 * Retorna el monto efectivamente descontado.
 */
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

  const clients = await trx<any[]>(
    'SELECT saldo FROM clientes WHERE id_cliente = ? FOR UPDATE',
    [clienteId]
  );
  const saldoDisponible = Number(clients[0]?.saldo || 0);

  if (saldoDisponible <= 0 || prepagoSolicitado === 0) return 0;

  const prepagoMonto =
    prepagoSolicitado === null
      ? Math.min(saldoDisponible, total)
      : prepagoSolicitado;

  if (prepagoSolicitado !== null && prepagoSolicitado > saldoDisponible) {
    throw new BusinessError('Saldo insuficiente para el monto de prepago seleccionado', 'SALDO_INSUFICIENTE', { saldoDisponible, prepagoSolicitado });
  }

  await trx('UPDATE clientes SET saldo = GREATEST(0, saldo - ?) WHERE id_cliente = ?', [
    prepagoMonto,
    clienteId,
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
      JSON.stringify({ venta_id: ventaId, codigo, concepto }),
    ]
  );

  return prepagoMonto;
}
