/**
 * Lecturas de solicitudes de anulación de cuentas. Infraestructura privada del
 * módulo: nadie fuera de `modules/operacion` importa este archivo (§5).
 *
 * Este SQL vivía dentro de tres rutas HTTP (`/api/cuentas/anulacion`,
 * `/api/cuentas/solicitud-anulacion` y `/api/cuentas/procesar-anulacion`), que
 * mezclaban adaptación, consulta y validación. Mismo SQL y misma selección que tenían
 * las rutas; el alta y el procesamiento siguen en `AccountService`.
 */
import { query } from '@/lib/database/db';
import type { CuentaParaAnulacion, SolicitudAnulacionCuenta } from '../contracts';

/** La cuenta con su cliente resuelto; la ruta lo usa para el aviso de WhatsApp. */
export async function obtenerCuentaParaAnulacion(
  cuentaId: string
): Promise<CuentaParaAnulacion | null> {
  const rows = await query<CuentaParaAnulacion[]>(
    `SELECT c.codigo, c.total,
            COALESCE(cl.nombre, 'Sin cliente registrado') as cliente_nombre
     FROM cuentas c
     LEFT JOIN clientes cl ON c.cliente_id = cl.id_cliente
     WHERE c.id_cuenta = ?
     LIMIT 1`,
    [cuentaId]
  );
  return rows[0] ?? null;
}

/**
 * Solicitud por identificador, sólo si sigue pendiente.
 *
 * Ojo al nombre del parámetro: estas rutas lo llaman `token` desde el cuerpo, pero
 * contra `cuentas` la columna que se busca es `sac.id`. Se conserva tal cual para no
 * cambiar el contrato HTTP.
 */
export async function obtenerSolicitudAnulacionCuenta(
  solicitudId: string
): Promise<SolicitudAnulacionCuenta[]> {
  return await query<SolicitudAnulacionCuenta[]>(
    `SELECT sac.id, sac.estado, sac.motivo, sac.monto, sac.fecha_crea,
            c.id_cuenta as cuenta_id, c.codigo, c.total,
            COALESCE(cl.nombre, 'Sin cliente registrado') as cliente_nombre
     FROM solicitudes_anulacion_cuentas sac
     INNER JOIN cuentas c ON c.id_cuenta = sac.cuenta_id
     LEFT JOIN clientes cl ON cl.id_cliente = c.cliente_id
     WHERE sac.id = ? AND sac.estado = 'pendiente'
     LIMIT 1`,
    [solicitudId]
  );
}
