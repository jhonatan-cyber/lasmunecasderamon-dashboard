import type {
  EntradaRecargaPrepago,
  EntradaDevolucionSaldo,
  EntradaRestitucionPrepago
} from './tipos';
import {
  prepararRecargaPrepago,
  validarConsumoCuenta,
  prepararDevolucionSaldo,
  validarSaldoDevolucion,
  prepararRestitucionPrepago
} from './reglas';
import type { ContextoOperacion } from '@/lib/transaction/contract';
import {
  saldoClienteAgotado,
  leerSaldoParaActualizar,
  guardarConsumoCuenta,
  descontarSaldoVenta,
  guardarRecargaPrepago,
  guardarDevolucionSaldo,
  leerConsumoPrepagoVenta,
  listarConsumosPrepagoVenta,
  guardarRestitucionPrepago
} from './repositorio';

export function saldoPrepagoAgotado(clienteId: string, contexto: ContextoOperacion) {
  return saldoClienteAgotado(clienteId, contexto);
}
export async function consumirPrepagoCuenta(
  clienteId: string | null,
  monto: number,
  contexto: ContextoOperacion,
  referencia?: { cuentaId: string; ventaId?: string; usuarioId: string }
) {
  const cliente = await leerSaldoParaActualizar(clienteId, contexto);
  validarConsumoCuenta(cliente ? Number(cliente.saldo ?? 0) : undefined, monto);
  await guardarConsumoCuenta(clienteId, monto, contexto, referencia);
}

export function consumirPrepagoVenta(
  entrada: Parameters<typeof descontarSaldoVenta>[0],
  contexto: ContextoOperacion
) {
  return descontarSaldoVenta(entrada, contexto);
}

export type { EntradaRecargaPrepago, EntradaDevolucionSaldo, EntradaRestitucionPrepago };

export async function registrarRecargaEnUnidad(
  entrada: EntradaRecargaPrepago,
  contexto: ContextoOperacion
) {
  const preparada = prepararRecargaPrepago(entrada);
  await guardarRecargaPrepago(entrada, preparada, contexto);
  return preparada.deltas;
}

export async function devolverSaldoEnUnidad(
  entrada: EntradaDevolucionSaldo,
  contexto: ContextoOperacion
) {
  const preparada = prepararDevolucionSaldo(entrada);
  const cliente = await leerSaldoParaActualizar(entrada.cliente_id, contexto);
  validarSaldoDevolucion(cliente ? Number(cliente.saldo || 0) : undefined, preparada.monto);
  await guardarDevolucionSaldo(entrada, preparada, contexto);
  return saldoClienteAgotado(entrada.cliente_id, contexto);
}
/** Consumo prepago de la venta repartido por cliente (uno o dos). */
export function listarPrepagoConsumidoPorVenta(
  ventaId: string,
  contexto: ContextoOperacion
): Promise<{ cliente_id: string; monto: number }[]> {
  return listarConsumosPrepagoVenta(ventaId, contexto);
}

export function leerPrepagoConsumidoPorVenta(
  clienteId: string,
  ventaId: string,
  contexto: ContextoOperacion
) {
  return leerConsumoPrepagoVenta(clienteId, ventaId, contexto);
}
export async function restituirPrepagoPorAnulacion(
  entrada: EntradaRestitucionPrepago,
  contexto: ContextoOperacion
) {
  const preparada = prepararRestitucionPrepago(entrada);
  if (preparada === null) return;
  await guardarRestitucionPrepago(preparada, contexto);
}
