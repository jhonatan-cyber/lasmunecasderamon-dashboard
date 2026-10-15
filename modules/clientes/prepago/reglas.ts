import type {
  EntradaRecargaPrepago,
  EntradaDevolucionSaldo,
  EntradaRestitucionPrepago
} from './tipos';
import {
  parsePagosMixtos,
  validatePagosMixtos,
  calcularDeltasCaja,
  calcularDeltasPagoSimple
} from '@/lib/business/pagosMixtos';
import { BusinessError, NotFoundError } from '@/lib/errors/errors';

/** null omite la escritura; cero conserva el consumo historico de total cero. */
export function calcularConsumoPrepago(
  saldoDisponible: number,
  total: number,
  prepagoSolicitado: number | null
): number | null {
  if (saldoDisponible <= 0 || prepagoSolicitado === 0) return null;

  const prepagoMonto =
    prepagoSolicitado === null ? Math.min(saldoDisponible, total) : prepagoSolicitado;

  if (prepagoSolicitado !== null && prepagoSolicitado > saldoDisponible) {
    throw new BusinessError(
      'Saldo insuficiente para el monto de prepago seleccionado',
      'SALDO_INSUFICIENTE',
      { saldoDisponible, prepagoSolicitado }
    );
  }

  return prepagoMonto;
}

/** Deltas que una recarga postula a caja según el medio de pago. */
function deltasCajaRecarga(
  monto: number,
  metodoPago?: string,
  pagosMixtos: Array<{ metodo: string; monto: number }> = []
): { efectivo: number; tarjeta: number; transferencia: number; prepago: number } {
  const metodo = String(metodoPago || 'efectivo');
  const pagosCaja =
    metodo === 'mixto' ? calcularDeltasCaja(pagosMixtos) : calcularDeltasPagoSimple(metodo, monto);
  return {
    efectivo: pagosCaja.efectivo || 0,
    tarjeta: pagosCaja.tarjeta || 0,
    transferencia: pagosCaja.transferencia || 0,
    prepago: 0
  };
}

export function prepararRecargaPrepago(data: EntradaRecargaPrepago) {
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

  return { metodoPago, metadatos, deltas: deltasCajaRecarga(data.monto, metodoPago, pagosMixtos) };
}

/** Conserva la validación histórica del cobro: el monto ya viene del caso de uso. */
export function validarConsumoCuenta(saldo: number | undefined, monto: number): void {
  if (saldo === undefined || saldo < monto)
    throw new BusinessError('Saldo insuficiente', 'SALDO_INSUFICIENTE');
}

export function prepararDevolucionSaldo(data: EntradaDevolucionSaldo) {
  const monto = Number(data.monto);
  const motivo = String(data.motivo || 'Devolucion de saldo').trim();
  if (!data.cliente_id || !monto || monto <= 0)
    throw new BusinessError('Monto de devolucion invalido', 'MONTO_INVALIDO');
  return { monto, motivo };
}

export function validarSaldoDevolucion(saldo: number | undefined, monto: number): void {
  if (saldo === undefined) throw new NotFoundError('Cliente no encontrado');
  if (monto > saldo) {
    throw new BusinessError(
      `Saldo insuficiente. Disponible: $${saldo.toLocaleString('es-CL')}`,
      'SALDO_INSUFICIENTE'
    );
  }
}

export function prepararRestitucionPrepago(entrada: EntradaRestitucionPrepago) {
  const monto = Math.max(0, Math.round(Number(entrada.monto || 0)));
  if (!entrada.clienteId || monto <= 0) return null;
  return { ...entrada, monto };
}
