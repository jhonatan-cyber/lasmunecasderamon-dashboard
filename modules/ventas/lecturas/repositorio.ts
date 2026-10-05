/**
 * Lecturas de venta para otros flujos. Infraestructura privada del módulo: nadie
 * fuera de `modules/ventas` importa este archivo (§5).
 *
 * Este SQL vivía dentro de `/api/orders/check-active-room` y del webhook de
 * WhatsApp, dos rutas que lo pedían sin ser dueñas de `ventas`.
 *
 * Excepción de lectura, explícita y revisable (fase 7): `habitacionNombre` se arma
 * con un JOIN a `habitaciones`, que es de Operación. Es una lectura de una fila para
 * mostrar un nombre; escribir sobre `habitaciones` desde aquí seguiría prohibido.
 */
import { query } from '@/lib/database/db';

/** Habitación que una anfitriona tiene activa, si tiene. */
export async function obtenerHabitacionActivaDeAnfitrionas(anfitrionasIds: unknown[]): Promise<
  {
    habitacionId: string;
    habitacionNombre: string;
    tiempo: number;
    anfitrionaId: string;
  }[]
> {
  return await query<
    { habitacionId: string; habitacionNombre: string; tiempo: number; anfitrionaId: string }[]
  >(
    `
      SELECT v.habitacion_id AS "habitacionId", h.nombre AS "habitacionNombre", v.tiempo, vu.usuario_id AS "anfitrionaId"
      FROM ventas v
      INNER JOIN ventas_usuarios vu ON v.id_venta = vu.venta_id
      INNER JOIN habitaciones h ON v.habitacion_id = h.id_habitacion
      WHERE vu.usuario_id IN (?) AND v.habitacion_id IS NOT NULL AND v.tiempo > 0 AND v.estado = 2
      ORDER BY v.fecha_crea DESC LIMIT 1
    `,
    [anfitrionasIds]
  );
}

/** Ventas en curso, que son las que el administrador puede anular desde WhatsApp. */
export async function listarVentasEnCurso(): Promise<
  {
    id_venta: string;
    codigo: string;
    total: number;
    cliente_nombre: string;
    fecha_mod: string;
  }[]
> {
  return await query<
    { id_venta: string; codigo: string; total: number; cliente_nombre: string; fecha_mod: string }[]
  >(
    `SELECT v.id_venta, v.codigo, v.total, COALESCE((CAST(c.nombre AS text) || CAST(' ' AS text) || CAST(c.apellido AS text)), 'Sin cliente registrado') as cliente_nombre, v.fecha_mod FROM ventas v LEFT JOIN clientes c ON v.cliente_id = c.id_cliente WHERE v.estado = 2 ORDER BY v.fecha_mod DESC`
  );
}
