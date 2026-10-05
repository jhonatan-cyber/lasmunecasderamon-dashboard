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
 * El procesamiento (confirmar o rechazar) sigue en `ServiceService`, que hoy abre su
 * propia transacción; se moverá cuando ese flujo migre al contexto opaco.
 */
import { generateUUID, query } from '@/lib/database/db';
import { getNowInBusinessTimezone } from '@/lib/business/timezoneService';
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
