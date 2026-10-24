import type {
  EntradaRecargaPrepago,
  EntradaDevolucionSaldo,
  EntradaRestitucionPrepago
} from './tipos';
import type { prepararRecargaPrepago, prepararDevolucionSaldo } from './reglas';
import type { ContextoOperacion } from '@/lib/transaction/contract';
import { resolverTransaccion } from '@/lib/transaction/infrastructure';
import { generateUUID } from '@/lib/database/db';
import { getNowInBusinessTimezone } from '@/lib/business/timezoneService';
import { BaseRepository } from '@/lib/database/base-repository';

/** El bloqueo se mantiene hasta que la unidad confirma o revierte. */
export async function leerSaldoParaActualizar(
  clienteId: string | null,
  contexto: ContextoOperacion
): Promise<{ saldo: number | null } | undefined> {
  const clientes = await resolverTransaccion(contexto)<{ saldo: number | null }[]>(
    'SELECT saldo FROM clientes WHERE id_cliente = ? FOR UPDATE',
    [clienteId]
  );
  return clientes?.[0];
}

export async function guardarConsumoCuenta(
  clienteId: string | null,
  monto: number,
  contexto: ContextoOperacion,
  referencia?: { cuentaId: string; ventaId?: string; usuarioId: string }
): Promise<void> {
  await resolverTransaccion(contexto)(
    'UPDATE clientes SET saldo = saldo - ? WHERE id_cliente = ?',
    [monto, clienteId]
  );
  await BaseRepository.insert(resolverTransaccion(contexto), 'clientes_prepago_movimientos', {
    id_movimiento: generateUUID(),
    cliente_id: clienteId,
    tipo: 'CONSUMO',
    monto,
    metodo_pago: 'prepago',
    venta_id: referencia?.ventaId ?? null,
    usuario_id: referencia?.usuarioId ?? null,
    fecha_crea: getNowInBusinessTimezone(),
    metadatos: JSON.stringify({ cuenta_id: referencia?.cuentaId, concepto: 'Pago de cuenta' })
  });
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
    `SELECT COALESCE(SUM(CASE WHEN UPPER(tipo) = 'CONSUMO' THEN monto ELSE -monto END), 0) as total_prepago
       FROM clientes_prepago_movimientos
      WHERE cliente_id = ?
        AND (UPPER(tipo) = 'CONSUMO' OR (UPPER(tipo) = 'DEVOLUCION' AND metodo_pago = 'prepago'))
        AND (venta_id = ? OR (metadatos::jsonb ->> 'venta_id') = ?)`,
    [clienteId, ventaId, ventaId]
  );
  return Math.max(0, Math.round(Number(rows[0]?.total_prepago || 0)));
}

/**
 * Consumo prepago vivo de una venta, por cliente. Incluye el reparto entre
 * dos clientes y descuenta las devoluciones ya hechas, para que una anulación
 * posterior no devuelva dos veces.
 */
export async function listarConsumosPrepagoVenta(
  ventaId: string,
  contexto: ContextoOperacion
): Promise<{ cliente_id: string; monto: number }[]> {
  const rows = await resolverTransaccion(contexto)<{ cliente_id: string; total: number }[]>(
    `SELECT cliente_id,
            COALESCE(SUM(CASE WHEN UPPER(tipo) = 'CONSUMO' THEN monto ELSE -monto END), 0) as total
       FROM clientes_prepago_movimientos
      WHERE (venta_id = ? OR (metadatos::jsonb ->> 'venta_id') = ?)
        AND (UPPER(tipo) = 'CONSUMO' OR (UPPER(tipo) = 'DEVOLUCION' AND metodo_pago = 'prepago'))
      GROUP BY cliente_id
     HAVING COALESCE(SUM(CASE WHEN UPPER(tipo) = 'CONSUMO' THEN monto ELSE -monto END), 0) > 0`,
    [ventaId, ventaId]
  );

  return rows.map(row => ({
    cliente_id: String(row.cliente_id),
    monto: Math.round(Number(row.total || 0))
  }));
}

export async function guardarRestitucionPrepago(
  entrada: EntradaRestitucionPrepago,
  contexto: ContextoOperacion
): Promise<void> {
  const { monto } = entrada;
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

/** Persiste una recarga ya validada: movimiento CARGA y saldo, en la misma unidad. */
export async function guardarRecargaPrepago(
  data: EntradaRecargaPrepago,
  preparada: ReturnType<typeof prepararRecargaPrepago>,
  contexto: ContextoOperacion
): Promise<void> {
  const moveId = generateUUID();
  const now = getNowInBusinessTimezone();
  const { metodoPago, metadatos } = preparada;

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
}

/** Persiste la devolución validada sin modificar caja ni cerrar cuentas. */
export async function guardarDevolucionSaldo(
  data: EntradaDevolucionSaldo,
  preparada: ReturnType<typeof prepararDevolucionSaldo>,
  contexto: ContextoOperacion
): Promise<void> {
  const { monto, motivo } = preparada;
  const trx = resolverTransaccion(contexto);
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
}
