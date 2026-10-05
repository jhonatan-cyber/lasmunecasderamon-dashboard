/**
 * Lecturas de solicitudes de anulación de ventas. Infraestructura privada del
 * módulo: nadie fuera de `modules/ventas` importa este archivo (§5).
 *
 * Este SQL vivía dentro de tres rutas HTTP (`/api/ventas/anulacion`,
 * `/api/ventas/solicitud-anulacion` y `/api/ventas/procesar-anulacion`), que
 * mezclaban adaptación, consulta y validación. La primera casilla de la fase 5
 * pide sacarlo de ahí: una ruta autenticada, valida el transporte, llama a un
 * caso de uso y traduce la respuesta.
 *
 * Mismo SQL y misma selección que tenían las rutas. La escritura de la
 * solicitud (crear y procesar) ya estaba en `SaleQueries`, que se migrará más
 * adelante en la fase.
 */
import { query } from '@/lib/database/db';
import type { SolicitudAnulacion, VentaParaAnulacion } from '../contracts';

/**
 * La venta y su cliente con el nombre ya resuelto. Se usa para validar el monto
 * solicitado contra el total y para el aviso de WhatsApp.
 */
export async function obtenerVentaParaAnulacion(
  ventaId: string
): Promise<VentaParaAnulacion | null> {
  const rows = await query<VentaParaAnulacion[]>(
    `SELECT v.codigo, v.total,
            COALESCE((CAST(c.nombre AS text) || CAST(' ' AS text) || CAST(c.apellido AS text)), 'Sin cliente registrado') as cliente_nombre
     FROM ventas v
     LEFT JOIN clientes c ON v.cliente_id = c.id_cliente
     WHERE v.id_venta = ?
     LIMIT 1`,
    [ventaId]
  );
  return rows[0] ?? null;
}

/** Una venta no admite dos solicitudes: la segunda debe rechazarse. */
export async function existeSolicitudAnulacion(ventaId: string): Promise<boolean> {
  const rows = await query<{ id: string }[]>(
    `SELECT id
     FROM solicitudes_anulacion_ventas
     WHERE venta_id = ?
     LIMIT 1`,
    [ventaId]
  );
  return rows.length > 0;
}

const SELECCION_SOLICITUD = `SELECT sav.id, sav.token, sav.estado, sav.motivo, sav.monto, sav.solicitado_por, sav.fecha_solicitud,
              v.id_venta as venta_id, v.codigo, v.total,
              COALESCE((CAST(c.nombre AS text) || CAST(' ' AS text) || CAST(c.apellido AS text)), 'Sin cliente registrado') as cliente_nombre
       FROM solicitudes_anulacion_ventas sav
       INNER JOIN ventas v ON v.id_venta = sav.venta_id
       LEFT JOIN clientes c ON c.id_cliente = v.cliente_id`;

/** Bandeja de solicitudes pendientes: la primera ruta, o la caja sin token. */
export async function listarSolicitudesPendientes(): Promise<SolicitudAnulacion[]> {
  return await query<SolicitudAnulacion[]>(
    `${SELECCION_SOLICITUD}
       WHERE sav.estado = 'pendiente'
       ORDER BY sav.fecha_solicitud DESC`
  );
}

/** Solicitud por token, sin filtro de estado: la vista de confirmación. */
export async function obtenerSolicitudPorToken(token: string): Promise<SolicitudAnulacion[]> {
  return await query<SolicitudAnulacion[]>(
    `${SELECCION_SOLICITUD}
     WHERE sav.token = ? AND sav.estado = 'pendiente'
     LIMIT 1`,
    [token]
  );
}
