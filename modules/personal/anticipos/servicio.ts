/**
 * Casos de uso de anticipos — aplicación del módulo Personal.
 *
 * Valida la entrada y orquesta la infraestructura propia. No toca SQL ni el
 * driver: eso vive en `./repositorio`, que es privado del módulo.
 *
 * Otorgar y entregar abren su propia unidad con `ContextoOperacion` y
 * coordinan con Caja por su API pública; los avisos salen después del commit.
 * Que participen de una unidad ajena —el workflow que coordine cobro y
 * caja— es trabajo de la Fase 5/6; el patrón para hacerlo ya quedó probado
 * con horas extras.
 */
import { AnticipoRequestSchema } from '@/lib/business/schemas';
import { ValidationError } from '@/lib/errors/errors';
import { enUnaUnidad } from '@/lib/transaccion/contrato';
import { ejecutarEfectosConfirmados } from '@/lib/transaccion/efectos';
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
  const tareas: Array<() => void | Promise<void>> = [];
  const resultado = await enUnaUnidad(unidad =>
    unidad.ejecutar(contexto =>
      repositorio.grantAnticipo(usuarioId, monto, motivo, deviceDate, adminId, contexto, tarea =>
        tareas.push(tarea)
      )
    )
  );
  await ejecutarEfectosConfirmados(tareas);
  return resultado;
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

/** ¿El usuario tiene una solicitud de anticipo en estado pendiente? */
export async function tieneSolicitudPendiente(usuarioId: string): Promise<boolean> {
  return repositorio.tieneSolicitudPendiente(usuarioId);
}

/** Anticipos solicitados y sin resolver, para el comando de WhatsApp. */
export async function listarAnticiposPendientes() {
  return repositorio.listarAnticiposPendientes();
}

/** Solicitud de anticipo por identificador, para la vista pública de confirmación. */
export async function obtenerSolicitudAnticipoPorId(idAnticipo: string) {
  return repositorio.obtenerSolicitudAnticipoPorId(idAnticipo);
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
  const tareas: Array<() => void | Promise<void>> = [];
  const resultado = await enUnaUnidad(unidad =>
    unidad.ejecutar(contexto =>
      repositorio.deliverAnticipo(id, entregadoPor, contexto, tarea => tareas.push(tarea))
    )
  );
  await ejecutarEfectosConfirmados(tareas);
  return resultado;
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
