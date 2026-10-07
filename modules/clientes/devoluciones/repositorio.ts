/**
 * Infraestructura del módulo Clientes para las solicitudes de devolución de
 * saldo. SQL privado: nadie fuera de `modules/clientes` importa este archivo (§5).
 *
 * Estas consultas vivían dentro de `/api/clients/devolucion/*`, que mezclaban
 * adaptación, consulta y el envío del recordatorio.
 */
import { generateUUID, query } from '@/lib/database/db';
import { getNowInBusinessTimezone } from '@/lib/business/timezoneService';
import type { SolicitudDevolucionSaldo } from '../contracts';
import type { ContextoOperacion } from '@/lib/transaccion/contrato';
import { resolverTransaccion } from '@/lib/transaccion/infraestructura';

/** Bandeja: pendientes primero y, dentro de cada grupo, lo más reciente. */
export async function listarSolicitudes(limite: number | null = 50): Promise<SolicitudDevolucionSaldo[]> {
  return await query<SolicitudDevolucionSaldo[]>(
    `SELECT s.id, s.cliente_id, s.monto, s.motivo, s.estado, s.fecha_crea, s.fecha_resolucion,
                c.nombre, c.apellido, c.run, c.telefono, c.saldo as saldo_actual,
                u_solic.nick as solicitado_por_nick, u_res.nick as resuelto_por_nick
         FROM solicitudes_devolucion_saldo s
         LEFT JOIN clientes c ON c.id_cliente = s.cliente_id
         LEFT JOIN usuarios u_solic ON u_solic.id_usuario = s.solicitado_por
         LEFT JOIN usuarios u_res ON u_res.id_usuario = s.resuelto_por
         ORDER BY
           CASE WHEN s.estado='pendiente' THEN 0 ELSE 1 END,
           s.fecha_crea DESC
         ${limite === null ? '' : 'LIMIT ?'}`, limite === null ? [] : [limite]
  );
}

export async function bloquearSolicitud(id: string, contexto: ContextoOperacion) {
  const filas = await resolverTransaccion(contexto)<Array<{id: string; cliente_id: string; monto: number; motivo: string | null; estado: string}>>(
    'SELECT id, cliente_id, monto, motivo, estado FROM solicitudes_devolucion_saldo WHERE id = ? FOR UPDATE', [id]
  );
  return filas[0] ?? null;
}

export async function resolverSolicitudEnUnidad(id: string, estado: 'aprobada' | 'rechazada', adminId: string, contexto: ContextoOperacion) {
  await resolverTransaccion(contexto)(
    "UPDATE solicitudes_devolucion_saldo SET estado = ?, fecha_resolucion = ?, resuelto_por = ? WHERE id = ? AND estado = 'pendiente'",
    [estado, getNowInBusinessTimezone(), adminId, id]
  );
}

/** Solicitud por id, para decidir si se aprueba o se rechaza. */
export async function obtenerSolicitud(id: string): Promise<
  {
    id: string;
    cliente_id: string;
    monto: number | string;
    motivo: string | null;
    estado: string;
  }[]
> {
  return await query<
    {
      id: string;
      cliente_id: string;
      monto: number | string;
      motivo: string | null;
      estado: string;
    }[]
  >(`SELECT id, cliente_id, monto, motivo, estado FROM solicitudes_devolucion_saldo WHERE id = ?`, [
    id
  ]);
}

/** Cierra la solicitud con el estado resuelto y quién la resolvió. */
export async function resolverSolicitud(
  id: string,
  estado: 'aprobada' | 'rechazada',
  resueltoPor: string
): Promise<void> {
  await query(
    `UPDATE solicitudes_devolucion_saldo SET estado=?, fecha_resolucion=?, resuelto_por=? WHERE id=?`,
    [estado, getNowInBusinessTimezone(), resueltoPor, id]
  );
}

/**
 * Deja la solicitud en la bandeja del administrador para que la apruebe. El
 * `metodo_pago` queda fijo en transferencia porque es el único que el administrador
 * ejecuta después.
 */
export async function registrarSolicitud(entrada: {
  clienteId: string;
  monto: number;
  motivo: string;
  solicitadoPor: string | null;
}): Promise<string> {
  const solicitudId = generateUUID();
  await query(
    `INSERT INTO solicitudes_devolucion_saldo (id, cliente_id, monto, motivo, solicitado_por, estado, fecha_crea, metodo_pago) VALUES (?, ?, ?, ?, ?, 'pendiente', ?, 'transferencia')`,
    [
      solicitudId,
      entrada.clienteId,
      entrada.monto,
      entrada.motivo,
      entrada.solicitadoPor || null,
      getNowInBusinessTimezone()
    ]
  );
  return solicitudId;
}
