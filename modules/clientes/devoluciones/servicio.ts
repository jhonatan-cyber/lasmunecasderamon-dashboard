/**
 * Casos de uso de devoluciones de saldo — aplicación del módulo Clientes.
 *
 * No toca SQL ni el driver: eso vive en `./repositorio`, que es privado del módulo.
 * El envío del recordatorio por WhatsApp es un efecto y ocurre después de que la
 * solicitud quedó en la bandeja, como antes.
 */
import { logger } from '@/lib/utils/logger';
import type { RecordatorioRegistrado, SolicitudDevolucionListada } from '../contracts';
import * as repositorio from './repositorio';

/** Bandeja de solicitudes para la pantalla de aprobación del administrador. */
export async function listarSolicitudes(): Promise<SolicitudDevolucionListada[]> {
  const filas = await repositorio.listarSolicitudes();
  return filas.map(fila => ({
    ...fila,
    monto: Number(fila.monto),
    saldo_actual: Number(fila.saldo_actual || 0),
    nombre: fila.nombre ?? '',
    apellido: fila.apellido ?? ''
  }));
}

/**
 * Cierra la solicitud como rechazada. Aprobar, en cambio, ejecuta la devolución
 * real antes de marcarla: si la devolución falla, la solicitud queda pendiente y se
 * puede reintentar.
 */
export async function rechazarSolicitud(id: string, resueltoPor: string): Promise<void> {
  await repositorio.resolverSolicitud(id, 'rechazada', resueltoPor);
}

/**
 * Marca la solicitud como aprobada. La ejecución del pago la hace la ruta con
 * `ClientService.devolverSaldo`, que es la que hoy ajusta el saldo del cliente: la
 * escribir aquí sería cambiar comportamiento, no sólo dónde vive el SQL.
 */
export async function aprobarSolicitud(id: string, resueltoPor: string): Promise<void> {
  await repositorio.resolverSolicitud(id, 'aprobada', resueltoPor);
}

/** Solicitud por id, o `null`. */
export async function obtenerSolicitud(id: string) {
  const [solicitud] = await repositorio.obtenerSolicitud(id);
  return solicitud ?? null;
}

/**
 * Registra el recordatorio en la bandeja del administrador.
 *
 * Un fallo al guardar no bloquea el recordatorio: la tabla puede no existir en una
 * instalación vieja y el aviso por WhatsApp es lo que el cajero espera. Se registra
 * el error y se sigue, igual que antes.
 */
export async function registrarRecordatorio(entrada: {
  clienteId: string;
  monto: number;
  motivo: string;
  solicitadoPor: string;
}): Promise<RecordatorioRegistrado> {
  try {
    return { solicitud_id: await repositorio.registrarSolicitud(entrada) };
  } catch (dbErr) {
    logger.error('Error guardando solicitud devolucion:', { error: dbErr });
    // Sin bandeja no hay a quién aprobar, pero el cajero ya fue notificado: se avisa
    // igual y se devuelve un id que no existe, igual que antes.
    return { solicitud_id: 'sin-registro' };
  }
}
