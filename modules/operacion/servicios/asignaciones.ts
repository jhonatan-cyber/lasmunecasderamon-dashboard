import { enUnaUnidad, type ContextoOperacion } from '@/lib/transaccion/contrato';
import { bloquearServicioActivo, guardarAsignaciones } from './asignacionesRepositorio';
import {
  validarAnfitrionasEnLocal,
  actualizarDisponibilidad,
  ocuparAnfitrionasServicio
} from '@/modules/identidad';
import { BusinessError } from '@/lib/errors/errors';
import { getNowInBusinessTimezone } from '@/lib/business/timezoneService';
import { sendNotificationToAll } from '@/lib/api/sseService';
import { pausarConflictosServicio } from '../facturacion/servicio';

export async function obtenerServicioParaConsumo(id: string, contexto: ContextoOperacion) {
  return bloquearServicioActivo(id, contexto);
}

export async function cambiarAnfitrionasServicioEnUnidad(
  id: string,
  solicitadas: string[],
  contexto: ContextoOperacion
) {
  const ids = [...new Set(solicitadas)];
  const servicio = await bloquearServicioActivo(id, contexto);
  const validas = await validarAnfitrionasEnLocal(ids, contexto);
  if (validas.length !== ids.length)
    throw new BusinessError('Selecciona anfitrionas conectadas en el local');
  const { retiradas, nuevas } = await guardarAsignaciones(
    id,
    ids,
    getNowInBusinessTimezone(),
    contexto
  );
  if (servicio.estado === 2) {
    await pausarConflictosServicio(nuevas, id, contexto);
    await ocuparAnfitrionasServicio(ids, contexto);
  }
  await actualizarDisponibilidad(retiradas, contexto);
  if (
    Number(servicio.es_temporal) === 1 &&
    servicio.servicio_original_id &&
    servicio.servicio_original_id !== id
  ) {
    await cambiarAnfitrionasServicioEnUnidad(servicio.servicio_original_id, ids, contexto);
  }
}

export async function cambiarAnfitrionasServicio(id: string, solicitadas: string[]) {
  await enUnaUnidad(unidad =>
    unidad.ejecutar(contexto => cambiarAnfitrionasServicioEnUnidad(id, solicitadas, contexto))
  );
  sendNotificationToAll('service_changed', { action: 'hostesses', id });
  sendNotificationToAll('timers_updated', { action: 'hostesses', id });
}
