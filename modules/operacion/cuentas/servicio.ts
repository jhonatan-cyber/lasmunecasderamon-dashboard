/**
 * Casos de uso de anulación de cuentas — aplicación del módulo Operación.
 *
 * No toca SQL ni el driver: eso vive en `./repositorio`, que es privado del módulo.
 * El alta y el procesamiento (confirmar o rechazar) siguen en `AccountService`,
 * que abre su propia transacción y toca caja; se moverán cuando ese flujo migre al
 * contexto opaco, en la fase 5.
 */
import type { ContextoOperacion } from '@/lib/transaccion/contrato';
import * as repositorio from './repositorio';

export async function obtenerSolicitudAnulacionCuenta(solicitudId: string) {
  return repositorio.obtenerSolicitudAnulacionCuenta(solicitudId);
}

export async function obtenerCuentaParaAnulacion(cuentaId: string) {
  return repositorio.obtenerCuentaParaAnulacion(cuentaId);
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
