import { query, type TransactionQuery } from '@/lib/database/db';
import { logger } from '@/lib/utils/logger';
import { DatabaseError } from '@/lib/errors/errors';
export class SaldosCaja {
  static async getCurrentCajaId(trx?: TransactionQuery): Promise<string | null> {
    try {
      const qFunc = trx || query;
      const res = await qFunc<any[]>(
        'SELECT id_caja FROM cajas WHERE estado = 1 ORDER BY fecha_apertura DESC LIMIT 1'
      );
      return res[0]?.id_caja || null;
    } catch (err) {
      logger.error('[CashRegisterRepository] Error en getCurrentCajaId:', { err });
      throw new DatabaseError('Error al obtener caja activa', err);
    }
  }
  static async updateBalances(
    trx: TransactionQuery,
    id_caja: string,
    deltas: {
      venta?: number;
      cargo_tarjeta?: number;
      servicio?: number;
      efectivo?: number;
      tarjeta?: number;
      transferencia?: number;
      prepago?: number;
      anticipo?: number;
      egreso?: number;
      iva?: number;
      comision?: number;
      propina?: number;
      cuenta?: number;
      devolucion?: number;
    }
  ): Promise<void> {
    const entries = Object.entries(deltas).filter(([_, v]) => v !== 0 && v !== undefined);
    if (entries.length === 0) return;

    const columnMap: Record<string, string> = {
      venta: 'venta',
      cargo_tarjeta: 'cargo_tarjeta',
      servicio: 'servicio',
      efectivo: 'efectivo',
      tarjeta: 'tarjeta',
      transferencia: 'transferencia',
      prepago: 'prepago',
      anticipo: 'anticipo',
      iva: 'iva',
      comision: 'comision',
      propina: 'propina',

      cuenta: 'venta',
      devolucion: 'devolucion'
    };

    const knownEntries = entries.filter(([k]) => k in columnMap);
    if (knownEntries.length === 0) return;

    const colTotals: Record<string, number> = {};
    for (const [k, v] of knownEntries) {
      const col = columnMap[k];
      colTotals[col] = (colTotals[col] ?? 0) + (v as number);
    }

    const dedupedEntries = Object.entries(colTotals).filter(([_, v]) => v !== 0);
    if (dedupedEntries.length === 0) return;

    const setClause = dedupedEntries.map(([col]) => `${col} = ${col} + ?`).join(', ');
    const values = dedupedEntries.map(([_, v]) => v);

    logger.debug('[CashRegisterRepository] updateBalances:', { id_caja, setClause, values });
    try {
      await trx(`UPDATE cajas SET ${setClause} WHERE id_caja = ? AND estado = 1`, [
        ...values,
        id_caja
      ]);
    } catch (err) {
      logger.error('[CashRegisterRepository] Error en updateBalances:', { id_caja, err });
      throw new DatabaseError(`Error al actualizar balances de caja ${id_caja}`, err);
    }
  }
}

import type { ContextoOperacion } from '@/lib/transaccion/contrato';
import { resolverTransaccion } from '@/lib/transaccion/infraestructura';
import type { MovimientoCobro } from '../contracts';
export function obtenerCajaActiva(contexto?: ContextoOperacion) {
  return SaldosCaja.getCurrentCajaId(contexto ? resolverTransaccion(contexto) : undefined);
}
export function registrarMovimientoCobro(
  cajaId: string,
  movimiento: MovimientoCobro,
  contexto: ContextoOperacion
) {
  return SaldosCaja.updateBalances(resolverTransaccion(contexto), cajaId, movimiento);
}

/**
 * Ajuste del IVA por edición de un servicio. Conserva el `GREATEST(0, …)`
 * heredado: el IVA de la caja nunca baja de cero aunque el delta sea mayor.
 */
export async function ajustarIvaCaja(ivaDelta: number, contexto: ContextoOperacion): Promise<void> {
  if (ivaDelta === 0) return;
  const trx = resolverTransaccion(contexto);
  const caja = await trx<{ id_caja: string }[]>(
    'SELECT id_caja FROM cajas WHERE estado = 1 ORDER BY fecha_apertura DESC LIMIT 1'
  );
  if (caja.length > 0) {
    await trx('UPDATE cajas SET iva = GREATEST(0, iva + ?) WHERE id_caja = ?', [
      ivaDelta,
      caja[0].id_caja
    ]);
  }
}

/**
 * Fondo disponible de la caja para egresos (apertura + efectivo). Lo que
 * `grantAnticipo`/`deliverAnticipo` leían vía `CashRegisterRepository.getById`
 * para validar que el efectivo alcanza.
 */
export async function leerFondoCaja(
  cajaId: string,
  contexto: ContextoOperacion
): Promise<{ monto_apertura: number; efectivo: number } | null> {
  const rows = await resolverTransaccion(contexto)<{ monto_apertura: number; efectivo: number }[]>(
    'SELECT monto_apertura, efectivo FROM cajas WHERE id_caja = ?',
    [cajaId]
  );
  return rows[0] ?? null;
}
