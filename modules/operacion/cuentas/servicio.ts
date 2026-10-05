/**
 * Casos de uso de anulación de cuentas — aplicación del módulo Operación.
 *
 * No toca SQL ni el driver: eso vive en `./repositorio`, que es privado del módulo.
 * El alta y el procesamiento (confirmar o rechazar) siguen en `AccountService`,
 * que abre su propia transacción y toca caja; se moverán cuando ese flujo migre al
 * contexto opaco, en la fase 5.
 */
import * as repositorio from './repositorio';

export async function obtenerSolicitudAnulacionCuenta(solicitudId: string) {
  return repositorio.obtenerSolicitudAnulacionCuenta(solicitudId);
}

export async function obtenerCuentaParaAnulacion(cuentaId: string) {
  return repositorio.obtenerCuentaParaAnulacion(cuentaId);
}
