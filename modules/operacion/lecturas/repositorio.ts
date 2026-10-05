/**
 * Lecturas de operación para otros flujos. Infraestructura privada del módulo:
 * nadie fuera de `modules/operacion` importa este archivo (§5).
 *
 * Este SQL vivía dentro de `/api/solicitudes-servicios/pending-count` y del webhook
 * de WhatsApp, rutas que lo pedían sin ser dueñas de `servicios`, `cuentas` ni
 * `pedidos`.
 *
 * Excepción de lectura, explícita y revisable (fase 7): `cliente_nombre` se arma con
 * un JOIN a `clientes`, que es de Clientes, para poder mostrar a quién pertenece la
 * operación. Es lectura; escribir sobre `clientes` desde aquí seguiría prohibido.
 */
import { query } from '@/lib/database/db';

/** Servicios en curso, que son los que el administrador puede anular desde WhatsApp. */
export async function listarServiciosEnCurso(): Promise<
  {
    id_servicio: string;
    codigo: string;
    total: number;
    cliente_nombre: string;
    fecha_mod: string;
  }[]
> {
  return await query<
    {
      id_servicio: string;
      codigo: string;
      total: number;
      cliente_nombre: string;
      fecha_mod: string;
    }[]
  >(
    `SELECT s.id_servicio, s.codigo, s.total, COALESCE(c.nombre, 'Sin cliente registrado') as cliente_nombre, s.fecha_mod FROM servicios s LEFT JOIN clientes c ON s.cliente_id = c.id_cliente WHERE s.estado = 2 ORDER BY s.fecha_mod DESC`
  );
}

/** Solicitudes de anulación de cuenta pendientes, ordenadas por fecha. */
export async function listarSolicitudesCuentasPendientes(): Promise<
  {
    solicitud_id: string;
    id_cuenta: string;
    monto: number | string;
    codigo: string;
    total: number;
    cliente_nombre: string;
    fecha_mod: string;
  }[]
> {
  return await query<
    {
      solicitud_id: string;
      id_cuenta: string;
      monto: number | string;
      codigo: string;
      total: number;
      cliente_nombre: string;
      fecha_mod: string;
    }[]
  >(
    `SELECT sac.id as solicitud_id, sac.cuenta_id as id_cuenta, sac.monto, c.codigo, c.total,
                COALESCE(cl.nombre, 'Sin cliente registrado') as cliente_nombre,
                COALESCE(sac.fecha_mod, sac.fecha_crea) as fecha_mod
     FROM solicitudes_anulacion_cuentas sac
     INNER JOIN cuentas c ON c.id_cuenta = sac.cuenta_id
     LEFT JOIN clientes cl ON c.cliente_id = cl.id_cliente
     WHERE sac.estado = 'pendiente'
     ORDER BY COALESCE(sac.fecha_mod, sac.fecha_crea) DESC`
  );
}

/** Pedidos en cola o en curso: los que la pantalla de cocina espera. */
export async function contarPedidosPendientes(): Promise<number> {
  const rows = await query<{ count: number | string }[]>(
    'SELECT COUNT(*) as count FROM pedidos WHERE estado IN (1, 2)'
  );
  return Number(rows[0]?.count || 0);
}
