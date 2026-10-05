import type { ContextoOperacion } from '@/lib/transaccion/contrato';
import { resolverTransaccion } from '@/lib/transaccion/infraestructura';
import { generateUUID } from '@/lib/database/db';
import { getNowInBusinessTimezone } from '@/lib/business/timezoneService';
import { BaseRepository } from '@/lib/database/base-repository';
import { BusinessError, NotFoundError } from '@/lib/errors/errors';
import {
  parsePagosMixtos,
  validatePagosMixtos,
  calcularDeltasCaja
} from '@/lib/business/pagosMixtos';
export async function descontarSaldoCuenta(
  clienteId: string | null,
  monto: number,
  contexto: ContextoOperacion
) {
  const trx = resolverTransaccion(contexto);
  const clientes = await trx<{ saldo: number }[]>(
    'SELECT saldo FROM clientes WHERE id_cliente = ? FOR UPDATE',
    [clienteId]
  );
  if (!clientes.length || Number(clientes[0].saldo ?? 0) < monto)
    throw new BusinessError('Saldo insuficiente', 'SALDO_INSUFICIENTE');
  await trx('UPDATE clientes SET saldo = saldo - ? WHERE id_cliente = ?', [monto, clienteId]);
}

import { procesarPrepago } from './consumoRepositorio';
export async function saldoClienteAgotado(clienteId: string, contexto: ContextoOperacion) {
  const [fila] = await resolverTransaccion(contexto)<{ saldo: number }[]>(
    'SELECT saldo FROM clientes WHERE id_cliente = ?',
    [clienteId]
  );
  return Number(fila?.saldo || 0) === 0;
}
export function descontarSaldoVenta(
  entrada: Parameters<typeof procesarPrepago>[1],
  contexto: ContextoOperacion
) {
  return procesarPrepago(resolverTransaccion(contexto), entrada);
}

export async function leerConsumoPrepagoVenta(
  clienteId: string,
  ventaId: string,
  contexto: ContextoOperacion
): Promise<number> {
  const trx = resolverTransaccion(contexto);
  const rows = await trx<{ total_prepago: number }[]>(
    `SELECT COALESCE(SUM(monto), 0) as total_prepago
       FROM clientes_prepago_movimientos
      WHERE cliente_id = ?
        AND UPPER(tipo) = 'CONSUMO'
        AND (venta_id = ? OR (metadatos::jsonb ->> 'venta_id') = ?)`,
    [clienteId, ventaId, ventaId]
  );
  return Math.max(0, Math.round(Number(rows[0]?.total_prepago || 0)));
}

export async function restituirPrepagoAnulacion(
  entrada: {
    clienteId: string;
    ventaId: string;
    monto: number;
    usuarioId?: string | null;
    concepto: string;
  },
  contexto: ContextoOperacion
): Promise<void> {
  const monto = Math.max(0, Math.round(Number(entrada.monto || 0)));
  if (!entrada.clienteId || monto <= 0) return;
  const trx = resolverTransaccion(contexto);
  await trx('UPDATE clientes SET saldo = saldo + ? WHERE id_cliente = ?', [
    monto,
    entrada.clienteId
  ]);
  await trx(
    `INSERT INTO clientes_prepago_movimientos
       (id_movimiento, cliente_id, tipo, monto, metodo_pago, venta_id, usuario_id, fecha_crea, metadatos)
     VALUES (?, ?, 'DEVOLUCION', ?, 'prepago', ?, ?, ?, ?)`,
    [
      generateUUID(),
      entrada.clienteId,
      monto,
      entrada.ventaId,
      entrada.usuarioId || null,
      getNowInBusinessTimezone(),
      JSON.stringify({ concepto: entrada.concepto })
    ]
  );
}

/** Deltas que una recarga postula a caja según el medio de pago. */
function deltasCajaRecarga(
  monto: number,
  metodoPago?: string,
  pagosMixtos: Array<{ metodo: string; monto: number }> = []
): { efectivo: number; tarjeta: number; transferencia: number; prepago: number } {
  const metodo = String(metodoPago || 'efectivo');
  const pagosCaja =
    metodo === 'mixto'
      ? calcularDeltasCaja(pagosMixtos)
      : {
          efectivo: metodo === 'efectivo' ? monto : 0,
          tarjeta: metodo === 'tarjeta' ? monto : 0,
          transferencia: metodo === 'transferencia' ? monto : 0
        };
  return {
    efectivo: pagosCaja.efectivo || 0,
    tarjeta: pagosCaja.tarjeta || 0,
    transferencia: pagosCaja.transferencia || 0,
    prepago: 0
  };
}

export interface EntradaRecargaPrepago {
  cliente_id: string;
  monto: number;
  metodo_pago?: string;
  pagos_mixtos?: Array<{ metodo: string; monto: number }>;
  usuario_id?: string;
  metadatos?: Record<string, unknown>;
}

/**
 * Recarga de prepago. Mismo orden que `ClientRepository.addPrepago`: caja
 * activa, movimiento CARGA, saldo y postulación a caja; la cuenta PREP-*
 * la crea Operación y no bloquea la recarga si falla.
 */
export async function cargarPrepagoRecarga(
  data: EntradaRecargaPrepago,
  contexto: ContextoOperacion
): Promise<{ efectivo: number; tarjeta: number; transferencia: number; prepago: number }> {
  const moveId = generateUUID();
  const now = getNowInBusinessTimezone();
  const metodoPago = String(data.metodo_pago || 'efectivo');
  const pagosMixtos = parsePagosMixtos(data.pagos_mixtos);

  if (metodoPago === 'mixto') {
    validatePagosMixtos(pagosMixtos, Number(data.monto || 0));
  }

  const metadatos =
    data.metadatos || metodoPago === 'mixto'
      ? JSON.stringify({
          ...(data.metadatos || {}),
          ...(metodoPago === 'mixto' ? { pagos_mixtos: pagosMixtos } : {})
        })
      : null;

  const trx = resolverTransaccion(contexto);
  await BaseRepository.insert(trx, 'clientes_prepago_movimientos', {
    id_movimiento: moveId,
    cliente_id: data.cliente_id,
    tipo: 'CARGA',
    monto: data.monto,
    metodo_pago: metodoPago,
    usuario_id: data.usuario_id || null,
    fecha_crea: now,
    metadatos
  });

  await trx('UPDATE clientes SET saldo = saldo + ? WHERE id_cliente = ?', [
    data.monto,
    data.cliente_id
  ]);

  return deltasCajaRecarga(data.monto, metodoPago, pagosMixtos);
}

export interface EntradaDevolucionSaldo {
  cliente_id: string;
  monto: number;
  motivo?: string;
  usuario_id?: string;
}

/**
 * Devolución de saldo por transferencia: no toca caja (el pendiente de
 * clientes se calcula como SUM y se refleja solo). Si el saldo llega a 0,
 * Operación auto-cierra las cuentas PREP-*. Mismo SQL que
 * `ClientRepository.devolverSaldo`.
 */
export async function devolverSaldoConCierre(
  data: EntradaDevolucionSaldo,
  contexto: ContextoOperacion
): Promise<boolean> {
  const monto = Number(data.monto);
  const motivo = String(data.motivo || 'Devolucion de saldo').trim();

  if (!data.cliente_id || !monto || monto <= 0) {
    throw new BusinessError('Monto de devolucion invalido', 'MONTO_INVALIDO');
  }

  const trx = resolverTransaccion(contexto);
  const clienteRows = await trx<{ saldo: number }[]>(
    'SELECT saldo FROM clientes WHERE id_cliente = ? FOR UPDATE',
    [data.cliente_id]
  );
  if (!clienteRows || clienteRows.length === 0) {
    throw new NotFoundError('Cliente no encontrado');
  }
  const saldoActual = Number(clienteRows[0].saldo || 0);
  if (monto > saldoActual) {
    throw new BusinessError(
      `Saldo insuficiente. Disponible: $${saldoActual.toLocaleString('es-CL')}`,
      'SALDO_INSUFICIENTE'
    );
  }

  const now = getNowInBusinessTimezone();
  await BaseRepository.insert(trx, 'clientes_prepago_movimientos', {
    id_movimiento: generateUUID(),
    cliente_id: data.cliente_id,
    tipo: 'DEVOLUCION',
    monto,
    metodo_pago: 'transferencia',
    usuario_id: data.usuario_id || null,
    fecha_crea: now,
    metadatos: JSON.stringify({ motivo, metodo_devolucion: 'transferencia' })
  });

  await trx('UPDATE clientes SET saldo = GREATEST(0, saldo - ?) WHERE id_cliente = ?', [
    monto,
    data.cliente_id
  ]);

  const [saldoRow] = await trx<{ saldo: number }[]>(
    'SELECT saldo FROM clientes WHERE id_cliente = ?',
    [data.cliente_id]
  );
  return Number(saldoRow?.saldo || 0) === 0;
}
