import type { ContextoOperacion } from '@/lib/transaccion/contrato';
import type { CuentaCobrarBody } from '../contracts';
import { cerrarCuenta, prepararVentaCuenta } from './repositorio';
import { leerCuentaCobrada } from './lecturaRepositorio';
export async function cobrarYPrepararVenta(
  id: string,
  body: CuentaCobrarBody,
  usuarioId: string,
  contexto: ContextoOperacion,
  aplazar: (tarea: () => void | Promise<void>) => void
) {
  await cerrarCuenta(contexto, id, body, usuarioId, aplazar);
  return prepararVentaCuenta(contexto, id, body);
}
export function consultarCuentaCobrada(id: string, contexto: ContextoOperacion) {
  return leerCuentaCobrada(id, contexto);
}

export function cobrarCuenta(
  id: string,
  body: CuentaCobrarBody,
  usuarioId: string,
  contexto: ContextoOperacion,
  aplazar: (tarea: () => void | Promise<void>) => void
) {
  return cerrarCuenta(contexto, id, body, usuarioId, aplazar);
}
