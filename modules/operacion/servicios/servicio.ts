/**
 * Casos de uso de anulación de servicios — aplicación del módulo Operación.
 *
 * No toca SQL ni el driver: eso vive en `./repositorio`, que es privado del módulo.
 * El alta de la solicitud conserva el `NULL` en `solicitado_por` porque esta vía es
 * pública y no conoce al actor; la ruta autenticada sigue usando `ServiceService`,
 * que sí lo registra.
 */
import type { EntradaSolicitudAnulacionServicio } from '../contracts';
import { enUnaUnidad } from '@/lib/transaccion/contrato';
import * as repositorio from './repositorio';
export const listarSolicitudesAnulacionServiciosPendientes = repositorio.listarSolicitudesAnulacionServiciosPendientes;

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

export async function listarServicios(params: {
  all?: string;
  estado?: string;
  caja_id?: string;
  limit?: string;
  page?: string;
}) {
  return repositorio.listarServicios(params);
}

export async function listarServiciosPorFechas(startDate: string, endDate: string) {
  return repositorio.listarServiciosPorFechas(startDate, endDate);
}

export async function listarServiciosDeUsuario(userId: string) {
  return repositorio.listarServiciosDeUsuario(userId);
}

export async function obtenerServicioDetallado(id: string) {
  return repositorio.obtenerServicioDetallado(id);
}

/** Borrado físico. Sin llamadores en producción; lo usan tests heredados. */
export async function eliminarServicio(servicioId: string): Promise<void> {
  await enUnaUnidad(unidad =>
    unidad.ejecutar(contexto => repositorio.eliminarServicioFisico(servicioId, contexto))
  );
}
import { obtenerServicioParaAlerta as obtenerServicioParaAlertaInterno } from './repositorio';
export function obtenerServicioParaAlerta(id: string) {
  return obtenerServicioParaAlertaInterno(id);
}
