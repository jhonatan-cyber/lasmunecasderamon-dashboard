import type { ContextoOperacion } from '@/lib/transaccion/contrato';
import { enUnaUnidad } from '@/lib/transaccion/contrato';
import { descontarSaldoCuenta } from './repositorio';
export function consumirPrepagoCuenta(
  clienteId: string | null,
  monto: number,
  contexto: ContextoOperacion
) {
  return descontarSaldoCuenta(clienteId, monto, contexto);
}

import { descontarSaldoVenta } from './repositorio';
import {
  cargarPrepagoRecarga,
  devolverSaldoConCierre,
  type EntradaRecargaPrepago,
  type EntradaDevolucionSaldo
} from './repositorio';
export function consumirPrepagoVenta(
  entrada: Parameters<typeof descontarSaldoVenta>[0],
  contexto: ContextoOperacion
) {
  return descontarSaldoVenta(entrada, contexto);
}

export type { EntradaRecargaPrepago, EntradaDevolucionSaldo };

export function cargarPrepago(entrada: EntradaRecargaPrepago): Promise<void> {
  return enUnaUnidad(unidad =>
    unidad.ejecutar(contexto => cargarPrepagoRecarga(entrada, contexto))
  );
}

export function devolverSaldo(entrada: EntradaDevolucionSaldo): Promise<void> {
  return enUnaUnidad(unidad =>
    unidad.ejecutar(contexto => devolverSaldoConCierre(entrada, contexto))
  );
}
import { leerConsumoPrepagoVenta, restituirPrepagoAnulacion } from './repositorio';
export function leerPrepagoConsumidoPorVenta(
  clienteId: string,
  ventaId: string,
  contexto: ContextoOperacion
) {
  return leerConsumoPrepagoVenta(clienteId, ventaId, contexto);
}
export function restituirPrepagoPorAnulacion(
  entrada: Parameters<typeof restituirPrepagoAnulacion>[0],
  contexto: ContextoOperacion
) {
  return restituirPrepagoAnulacion(entrada, contexto);
}
