/**
 * Casos de uso de cuentas — aplicación del módulo Operación.
 *
 * No toca SQL ni el driver: eso vive en `./repositorio`, que es privado del módulo.
 */
import type { ContextoOperacion } from '@/lib/transaccion/contrato';
import { enUnaUnidad } from '@/lib/transaccion/contrato';
import { getNowInBusinessTimezone } from '@/lib/business/timezoneService';
import * as repositorio from './repositorio';

export async function obtenerSolicitudAnulacionCuenta(solicitudId: string) {
  return repositorio.obtenerSolicitudAnulacionCuenta(solicitudId);
}

export async function obtenerCuentaParaAnulacion(cuentaId: string) {
  return repositorio.obtenerCuentaParaAnulacion(cuentaId);
}

export function listarCuentas(tipo?: string, estado?: string) {
  return repositorio.listarCuentas(tipo, estado);
}

export function finalizarSesionHabitacion(
  cuentaId: string,
  nowStr?: string,
  contexto?: ContextoOperacion
) {
  return repositorio.finalizarSesionHabitacion(
    cuentaId,
    nowStr ?? getNowInBusinessTimezone(),
    contexto
  );
}

/** Borrado físico. Sin llamadores en producción; lo usan tests heredados. */
export async function eliminarCuenta(cuentaId: string): Promise<void> {
  await enUnaUnidad(unidad =>
    unidad.ejecutar(contexto => repositorio.eliminarCuentaFisica(cuentaId, contexto))
  );
}

export function crearCuentaPrepagoRecarga(
  clienteId: string,
  monto: number,
  usuarioId: string | null,
  contexto: ContextoOperacion
) {
  return repositorio.crearCuentaPrepago(clienteId, monto, usuarioId, contexto);
}

export function cerrarCuentasPrepagoSaldadas(clienteId: string, contexto: ContextoOperacion) {
  return repositorio.cerrarCuentasPrepagoSaldadas(clienteId, contexto);
}

export {
  detenerTemporizadorEnUnidad,
  detenerTemporizadorCuenta,
  solicitarAnulacionCuentaEnUnidad,
  solicitarAnulacionCuenta
} from './temporizadores';
export {
  actualizarCuentaEnUnidad,
  actualizarCuenta,
  type EntradaActualizacionCuenta
} from './actualizacion';
export { crearCuentaEnUnidad, crearCuenta, type EntradaAltaCuenta } from './alta';
