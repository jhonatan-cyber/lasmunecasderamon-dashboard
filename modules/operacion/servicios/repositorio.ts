/**
 * Lecturas y registro de solicitudes de anulación de servicios. Infraestructura
 * privada del módulo: nadie fuera de `modules/operacion` importa este archivo (§5).
 *
 * Este SQL vivía dentro de tres rutas HTTP (`/api/servicios/anulacion`,
 * `/api/servicios/solicitud-anulacion` y `/api/servicios/procesar-anulacion`),
 * que mezclaban adaptación, consulta y validación. Mismo SQL y misma selección que
 * tenían las rutas: la primera casilla de la fase 5 pide sacarlo de ahí, y una ruta
 * autentica, valida el transporte, llama a un caso de uso y traduce la respuesta.
 *
 * El procesamiento (confirmar o rechazar) y la anulación corren en
 * `./anulaciones` con contexto opaco, en una sola unidad junto con caja,
 * prepago, comisiones, habitación y disponibilidad.
 */
import { generateUUID, query } from '@/lib/database/db';
import type { ContextoOperacion } from '@/lib/transaccion/contrato';
import { resolverTransaccion } from '@/lib/transaccion/infraestructura';
import { getNowInBusinessTimezone } from '@/lib/business/timezoneService';
import { BaseRepository } from '@/lib/repositories/BaseRepository';
import type { ServicioParaAnulacion, SolicitudAnulacionServicio } from '../contracts';

/**
 * El servicio con su cliente y habitación. La ruta lo usa para el aviso de
 * WhatsApp; el nombre del cliente ya viene resuelto con `COALESCE` para no
 * repetir el texto de sustitución en tres sitios.
 */
export async function obtenerServicioParaAnulacion(
  servicioId: string | number
): Promise<ServicioParaAnulacion | null> {
  const rows = await query<ServicioParaAnulacion[]>(
    `SELECT s.codigo, s.total, s.tiempo, h.nombre as habitacion_nombre,
            COALESCE(c.nombre, 'Sin cliente registrado') as cliente_nombre
     FROM servicios s
     LEFT JOIN clientes c ON s.cliente_id = c.id_cliente
     LEFT JOIN habitaciones h ON s.habitacion_id = h.id_habitacion
     WHERE s.id_servicio = ?
     LIMIT 1`,
    [servicioId]
  );
  return rows[0] ?? null;
}

/** Solicitud por token, sólo si sigue pendiente: la vista de confirmación. */
export async function obtenerSolicitudAnulacionServicioPorToken(
  token: string
): Promise<SolicitudAnulacionServicio[]> {
  return await query<SolicitudAnulacionServicio[]>(
    `SELECT sas.id, sas.token, sas.estado, sas.motivo, sas.solicitado_por, sas.fecha_solicitud,
            s.id_servicio as servicio_id, s.codigo, s.total, s.tiempo,
            COALESCE(c.nombre, 'Sin cliente registrado') as cliente_nombre,
            COALESCE(h.nombre, 'Sin habitacion') as habitacion_numero
     FROM solicitudes_anulacion_servicios sas
     INNER JOIN servicios s ON s.id_servicio = sas.servicio_id
     LEFT JOIN clientes c ON c.id_cliente = s.cliente_id
     LEFT JOIN habitaciones h ON h.id_habitacion = s.habitacion_id
     WHERE sas.token = ? AND sas.estado = 'pendiente'
     LIMIT 1`,
    [token]
  );
}

/**
 * Alta de la solicitud. `solicitado_por` se guarda como NULL a propósito: esta
 * ruta es pública y no conoce al actor; quien sí lo conoce es `ServiceService`.
 */
export async function registrarSolicitudAnulacionServicio(
  servicioId: string | number,
  motivo: string
): Promise<string> {
  const token = generateUUID();
  const now = getNowInBusinessTimezone();

  await query(
    `INSERT INTO solicitudes_anulacion_servicios (id, token, servicio_id, motivo, solicitado_por, fecha_solicitud, estado)
       VALUES (?, ?, ?, ?, NULL, ?, 'pendiente')`,
    [generateUUID(), token, Number(servicioId), motivo, now]
  );

  return token;
}

/**
 * Escrituras sobre tablas propias de Operación (`servicios`,
 * `detalle_servicios`, `solicitudes_anulacion_servicios`). Reciben
 * `ContextoOperacion`: la anulación o el cambio de estado confirman o
 * revierten junto con caja, prepago, comisiones, habitación y disponibilidad.
 * Mismo SQL heredado de `ServiceQueries`.
 */

export interface ServicioAnulacion {
  id_servicio: string;
  estado: number;
  habitacion_id: string | null;
  cliente_id: string | null;
  caja_id: string | null;
  metodo_pago: string | null;
  total: number;
  iva: number;
  pagos_mixtos: unknown;
}

export async function leerServicioParaAnular(
  servicioId: string,
  contexto: ContextoOperacion
): Promise<ServicioAnulacion | null> {
  const rows = await resolverTransaccion(contexto)<ServicioAnulacion[]>(
    `SELECT id_servicio, estado, habitacion_id, cliente_id, caja_id, metodo_pago, total, iva, pagos_mixtos
       FROM servicios
      WHERE id_servicio = ?
      LIMIT 1`,
    [servicioId]
  );
  return rows[0] ?? null;
}

export async function leerEstadoServicio(
  servicioId: string,
  contexto: ContextoOperacion
): Promise<{ estado: number; habitacion_id: string | null; paused_at: unknown } | null> {
  const rows = await resolverTransaccion(contexto)<
    { estado: number; habitacion_id: string | null; paused_at: unknown }[]
  >('SELECT estado, habitacion_id, paused_at FROM servicios WHERE id_servicio = ?', [servicioId]);
  return rows[0] ?? null;
}

export async function marcarEstadoServicio(
  servicioId: string,
  estado: number,
  contexto: ContextoOperacion
): Promise<void> {
  await resolverTransaccion(contexto)(
    'UPDATE servicios SET estado = ?, fecha_mod = ? WHERE id_servicio = ?',
    [estado, getNowInBusinessTimezone(), servicioId]
  );
}

export async function marcarPausaServicio(
  servicioId: string,
  contexto: ContextoOperacion
): Promise<void> {
  const now = getNowInBusinessTimezone();
  const trx = resolverTransaccion(contexto);
  await trx('UPDATE servicios SET estado = ?, fecha_mod = ? WHERE id_servicio = ?', [
    3,
    now,
    servicioId
  ]);
  await trx('UPDATE servicios SET estado = ?, paused_at = ? WHERE id_servicio = ?', [
    3,
    now,
    servicioId
  ]);
}

export async function reanudarServicio(
  servicioId: string,
  pausedAt: unknown,
  contexto: ContextoOperacion
): Promise<boolean> {
  if (!pausedAt) return false;
  const now = getNowInBusinessTimezone();
  await resolverTransaccion(contexto)(
    `UPDATE servicios SET fecha_crea = (CAST(fecha_crea AS timestamp) + make_interval(secs => CAST(TRUNC(EXTRACT(EPOCH FROM (CAST(? AS timestamp) - CAST(paused_at AS timestamp))) / 1) AS double precision))), paused_at = NULL WHERE id_servicio = ?`,
    [now, servicioId]
  );
  return true;
}

export async function leerAnfitrionasServicio(
  servicioId: string,
  contexto: ContextoOperacion
): Promise<string[]> {
  const rows = await resolverTransaccion(contexto)<{ usuario_id: string }[]>(
    'SELECT usuario_id FROM detalle_servicios WHERE servicio_id = ?',
    [servicioId]
  );
  return rows.map(row => row.usuario_id);
}

export async function crearSolicitudAnulacionServicio(
  servicioId: string,
  motivo: string,
  solicitadoPor: string,
  contexto: ContextoOperacion
): Promise<string> {
  const idAnul = generateUUID();
  const token = generateUUID();
  await resolverTransaccion(contexto)(
    `INSERT INTO solicitudes_anulacion_servicios (id, servicio_id, token, estado, fecha_solicitud, solicitado_por, motivo)
     VALUES (?, ?, ?, 'pendiente', ?, ?, ?)`,
    [idAnul, servicioId, token, getNowInBusinessTimezone(), solicitadoPor, motivo]
  );
  return token;
}

export async function actualizarEstadoSolicitudServicio(
  requestId: string,
  status: string,
  contexto: ContextoOperacion
): Promise<'confirmada' | 'rechazada'> {
  const normalized = String(status || '').toLowerCase();
  const nextStatus =
    normalized === 'confirmar' || normalized === 'aprobado' || normalized === 'confirmada'
      ? 'confirmada'
      : 'rechazada';
  await resolverTransaccion(contexto)(
    'UPDATE solicitudes_anulacion_servicios SET estado = ? WHERE id = ?',
    [nextStatus, requestId]
  );
  return nextStatus;
}

export async function leerServicioDeSolicitud(
  requestId: string,
  contexto: ContextoOperacion
): Promise<string | null> {
  const rows = await resolverTransaccion(contexto)<{ servicio_id: string }[]>(
    'SELECT servicio_id FROM solicitudes_anulacion_servicios WHERE id = ?',
    [requestId]
  );
  return rows[0]?.servicio_id ?? null;
}

/**
 * Alta y edición de servicios. Mismo SQL que `ServiceService.createService` y
 * `updateServicio`: la unidad la abre el caso de uso.
 */

export async function leerHabitacionParaServicio(
  habitacionId: string,
  contexto: ContextoOperacion
): Promise<{ precio: number; comision_anfitriona: number } | null> {
  const rows = await resolverTransaccion(contexto)<
    { precio: number; comision_anfitriona: number }[]
  >('SELECT precio, comision_anfitriona FROM habitaciones WHERE id_habitacion = ?', [habitacionId]);
  return rows[0] ?? null;
}

export async function insertarServicio(
  data: Record<string, unknown>,
  contexto: ContextoOperacion
): Promise<void> {
  await BaseRepository.insert(resolverTransaccion(contexto), 'servicios', data);
}

export interface DetalleServicioFila {
  id_detalle_servicio: string;
  usuario_id: string;
  servicio_id: string;
  comision: number;
  fecha_crea: string;
}

export async function insertarDetallesServicio(
  filas: DetalleServicioFila[],
  contexto: ContextoOperacion
): Promise<void> {
  if (filas.length === 0) return;
  const trx = resolverTransaccion(contexto);
  const columns = ['id_detalle_servicio', 'usuario_id', 'servicio_id', 'comision', 'fecha_crea'];
  const placeholders = filas.map(() => `(${columns.map(() => '?').join(', ')})`).join(', ');
  const values = filas.flatMap(row => columns.map(col => row[col as keyof DetalleServicioFila]));
  await trx(`INSERT INTO detalle_servicios (${columns.join(', ')}) VALUES ${placeholders}`, values);
}

export async function reemplazarDetallesServicio(
  servicioId: string,
  usuarioIds: string[],
  contexto: ContextoOperacion
): Promise<void> {
  const trx = resolverTransaccion(contexto);
  const now = getNowInBusinessTimezone();
  await trx('DELETE FROM detalle_servicios WHERE servicio_id = ?', [servicioId]);
  await insertarDetallesServicio(
    usuarioIds.map(uId => ({
      id_detalle_servicio: generateUUID(),
      usuario_id: uId,
      servicio_id: servicioId,
      comision: 0,
      fecha_crea: now
    })),
    contexto
  );
}

export async function insertarClientesServicio(
  servicioId: string,
  clienteIds: string[],
  contexto: ContextoOperacion
): Promise<void> {
  const filas = clienteIds
    .filter(Boolean)
    .map(clienteId => [generateUUID(), servicioId, clienteId]);
  if (filas.length === 0) return;
  const placeholders = filas.map(() => '(?, ?, ?)').join(', ');
  await resolverTransaccion(contexto)(
    `INSERT INTO detalle_servicios_clientes (id, servicio_id, cliente_id) VALUES ${placeholders}`,
    filas.flat()
  );
}

export async function actualizarCamposServicio(
  servicioId: string,
  campos: Record<string, unknown>,
  contexto: ContextoOperacion
): Promise<void> {
  await BaseRepository.update(
    resolverTransaccion(contexto),
    'servicios',
    'id_servicio',
    servicioId,
    campos
  );
}

export async function leerIvaServicio(
  servicioId: string,
  contexto: ContextoOperacion
): Promise<number> {
  const rows = await resolverTransaccion(contexto)<{ iva: number }[]>(
    'SELECT iva FROM servicios WHERE id_servicio = ?',
    [servicioId]
  );
  return Number(rows[0]?.iva || 0);
}
