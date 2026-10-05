/**
 * Casos de uso de anulación de servicios — aplicación del módulo Operación.
 *
 * No toca SQL ni el driver: eso vive en `./repositorio`, que es privado del módulo.
 * El alta de la solicitud conserva el `NULL` en `solicitado_por` porque esta vía es
 * pública y no conoce al actor; la ruta autenticada sigue usando `ServiceService`,
 * que sí lo registra.
 */
import type { EntradaSolicitudAnulacionServicio } from '../contracts';
import * as repositorio from './repositorio';

export async function obtenerSolicitudAnulacionServicioPorToken(token: string) {
  return repositorio.obtenerSolicitudAnulacionServicioPorToken(token);
}

export async function obtenerServicioParaAnulacion(servicioId: string | number) {
  return repositorio.obtenerServicioParaAnulacion(servicioId);
}

export async function registrarSolicitudAnulacionServicio(
  entrada: EntradaSolicitudAnulacionServicio
): Promise<string> {
  return repositorio.registrarSolicitudAnulacionServicio(entrada.servicioId, entrada.motivo);
}
