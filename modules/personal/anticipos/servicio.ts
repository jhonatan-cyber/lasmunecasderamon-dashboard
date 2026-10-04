/**
 * Casos de uso de anticipos — aplicación del módulo Personal.
 *
 * Valida la entrada y orquesta la infraestructura propia. No toca SQL ni el
 * driver: eso vive en `./repositorio`, que es privado del módulo.
 *
 * A diferencia de horas extras, estas operaciones no reciben `ContextoOperacion`:
 * otorgar, procesar y entregar abren hoy su propia transacción (y tocan caja),
 * así que su atomicidad es interna. Que participen de una unidad ajena —el
 * workflow que coordine cobro y caja— es trabajo de la Fase 5/6; el patrón para
 * hacerlo ya quedó probado con horas extras.
 */
import { AnticipoRequestSchema } from '@/lib/business/schemas';
import { ValidationError } from '@/lib/errors/errors';
import type {
  AnticipoListado,
  AnticipoRegistrado,
  EntradaSolicitudAnticipo,
  FiltrosAnticipos,
  PendienteAnticipo,
  ResultadoComando,
  ResultadoProceso,
  SolicitudAnticipoListado,
  SolicitudAnticipoRegistrada
} from '../contracts';
import * as repositorio from './repositorio';

export async function solicitarAnticipo(
  usuarioId: string,
  entrada: EntradaSolicitudAnticipo
): Promise<SolicitudAnticipoRegistrada> {
  const validated = AnticipoRequestSchema.parse(entrada);
  return repositorio.requestAnticipo(
    usuarioId,
    validated.monto,
    validated.motivo,
    validated.device_date
  );
}

export async function solicitarAnticipoSimple(
  usuarioId: string,
  monto: number,
  motivo: string
): Promise<SolicitudAnticipoRegistrada> {
  return repositorio.requestAnticipo(usuarioId, monto, motivo);
}

export async function otorgarAnticipo(
  usuarioId: string,
  monto: number,
  motivo?: string,
  deviceDate?: string,
  adminId?: string | number
): Promise<AnticipoRegistrado | null> {
  if (monto <= 0) throw new ValidationError('El monto debe ser positivo', { monto });
  return repositorio.grantAnticipo(usuarioId, monto, motivo, deviceDate, adminId);
}

export async function listarAnticipos(
  filtros?: FiltrosAnticipos
): Promise<{ data: AnticipoListado[]; total: number }> {
  const { data, total } = await repositorio.getAllAnticipos(filtros);
  return { data: data as AnticipoListado[], total };
}

export async function listarAnticiposPorFechas(
  usuarioId: string,
  fechas: string[]
): Promise<AnticipoListado[]> {
  return (await repositorio.getAnticiposByDates(usuarioId, fechas)) as AnticipoListado[];
}

export async function listarAnticiposDeUsuario(
  usuarioId: string,
  startDate?: string,
  endDate?: string
): Promise<AnticipoListado[]> {
  return (await repositorio.getAnticiposByUser(usuarioId, startDate, endDate)) as AnticipoListado[];
}

export async function listarSolicitudesDeUsuario(
  usuarioId: string
): Promise<SolicitudAnticipoListado[]> {
  return (await repositorio.listarSolicitudesDeUsuario(usuarioId)) as SolicitudAnticipoListado[];
}

export async function procesarSolicitud(
  id: string,
  accion: 'approve' | 'reject',
  adminId?: string
): Promise<ResultadoProceso> {
  return repositorio.processSolicitudAnticipo(id, accion, adminId);
}

export async function procesarSolicitudDeTexto(
  id: string,
  accion: string,
  adminId?: string
): Promise<ResultadoProceso> {
  return repositorio.processSolicitudAnticipo(id, accion as 'approve' | 'reject', adminId);
}

export async function entregarAnticipo(
  id: string,
  entregadoPor: string
): Promise<ResultadoProceso> {
  return repositorio.deliverAnticipo(id, entregadoPor);
}

export async function actualizarEstadoAnticipo(
  id: string,
  estado: number,
  adminId?: string
): Promise<AnticipoRegistrado | null> {
  return repositorio.updateAnticipoStatus(id, estado, adminId);
}

export async function procesarAnticipoDesdeComando(
  anticiposPendientes: PendienteAnticipo[],
  anticipoId: string,
  shouldApprove: boolean,
  adminWhatsApp: string
): Promise<ResultadoComando> {
  const anticipo = anticiposPendientes.find(a => a.id === anticipoId);

  if (!anticipo) {
    return { ok: false, message: 'Solicitud no encontrada en los pendientes actuales.' };
  }

  try {
    await repositorio.processSolicitudAnticipo(anticipoId, shouldApprove ? 'approve' : 'reject');
    return {
      ok: true,
      message: `Anticipo de ${anticipo.empleado_nombre} ${shouldApprove ? 'APROBADO' : 'RECHAZADO'} correctamente.`
    };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Error desconocido';
    return { ok: false, message: `Error al procesar: ${msg}` };
  }
}
