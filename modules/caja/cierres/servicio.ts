/**
 * Casos de uso de cierres de caja — aplicación del módulo Caja.
 *
 * No toca SQL ni el driver: eso vive en `./repositorio`, que es privado del módulo.
 * El procesamiento del cierre (que descuenta saldos de clientes y cierra la caja)
 * sigue en `CashRegisterService`: moverlo aquí sería cambiar el orden de los
 * efectos, no sólo dónde vive el SQL.
 */
import type { SolicitudCierrePendiente } from '../contracts';
import * as repositorio from './repositorio';

export async function listarSolicitudesCierrePendientes(): Promise<SolicitudCierrePendiente[]> {
  return repositorio.listarSolicitudesCierrePendientes();
}
