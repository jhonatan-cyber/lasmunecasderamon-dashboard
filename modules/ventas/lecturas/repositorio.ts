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
import { logger } from '@/lib/utils/logger';
import { DatabaseError } from '@/lib/errors/errors';
import type { SaleType } from '@/lib/business/schemas';
import type {
  VentaRawRow,
  VentaGetByIdRow,
  DetalleVentaWithProductRow,
  VentaUsuarioDetailRow,
  VentaComisionGroupRow,
  VentaPropinaGroupRow,
  CajaIdRow,
  VentaResumenRow,
  VentaCountRow
} from '@/lib/database/rows';
import { mapSaleFromDB, type VentaGetByIdResponse } from '@/modules/ventas/lecturas/mapeo';

export function obtenerVentaParaAlerta(solicitudId: string) {
  return query<{ codigo: string; total: number }[]>(
    `SELECT v.codigo, v.total FROM ventas v
     INNER JOIN solicitudes_anulacion_ventas sav ON sav.venta_id = v.id_venta
     WHERE sav.id = ? LIMIT 1`,
    [solicitudId]
  );
}

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

/**
 * Listado y resumen de ventas. Mismo SQL que `SaleQueries.getAll`: la UI lo
 * consume igual y la paginación no cambia.
 */
export async function listarVentas(params: {
  tipo?: string;
  page?: string;
  limit?: string;
  estado?: string;
  caja_id?: string;
  search?: string;
}): Promise<
  | { resumen_general?: VentaResumenRow }
  | { data: (SaleType & { has_anulacion_solicitada: boolean })[]; total: number }
> {
  try {
    if (params.tipo === 'resumen') {
      const cajaResult = await query<CajaIdRow[]>(
        'SELECT id_caja FROM cajas WHERE estado = 1 ORDER BY fecha_apertura DESC LIMIT 1'
      );
      const cajaId = cajaResult[0]?.id_caja;
      let where = 'WHERE v.estado IN (1, 2, 3)';
      let sqlParams: (string | number)[] = [];
      if (cajaId) {
        where += ' AND v.caja_id = ?';
        sqlParams.push(cajaId);
      }

      const sql = `
          SELECT
            SUM(total - COALESCE(cargo_tarjeta, 0)) as total_ventas,
            SUM(COALESCE(cargo_tarjeta, 0)) as cargo_tarjeta,
            SUM(CASE WHEN metodo_pago = 'efectivo' THEN total ELSE 0 END) as efectivo,
            SUM(CASE WHEN metodo_pago = 'tarjeta' THEN total ELSE 0 END) as tarjeta,
            SUM(CASE WHEN metodo_pago = 'transferencia' THEN total ELSE 0 END) as transferencia,
            SUM(CASE WHEN metodo_pago = 'prepago' THEN total ELSE 0 END) as prepago,
            SUM(propina) as total_propinas
          FROM ventas v
          ${where}
        `;
      const result = await query<VentaResumenRow[]>(sql, sqlParams);
      return { resumen_general: result[0] };
    }

    const pNum = parseInt(params.page || '1');
    const lNum = parseInt(params.limit || '10');
    const offset = (pNum - 1) * lNum;

    let where = 'WHERE 1=1';
    let sqlParams: (string | number)[] = [];
    if (params.estado) {
      where += ' AND v.estado = ?';
      sqlParams.push(params.estado);
    }
    if (params.caja_id) {
      where += ' AND v.caja_id = ?';
      sqlParams.push(params.caja_id);
    }

    const sql = `
        SELECT v.*,
          (CAST(c.nombre AS text) || CAST(' ' AS text) || CAST(c.apellido AS text)) as cliente_nombre,
          u.nick as staff_nick,
          u.nombre as cajero_nombre,
          h.nombre as habitacion_numero,
          EXISTS(
            SELECT 1
            FROM solicitudes_anulacion_ventas sav
            WHERE sav.venta_id = v.id_venta
          ) as has_anulacion_solicitada,
          -- El detalle guarda una fila por anfitriona para repartir la comisión
          -- (filas auxiliares con cantidad 0). Contar filas multiplicaba el
          -- producto por las anfitrionas: se suman las unidades vendidas.
          (SELECT COALESCE(SUM(dv.cantidad), 0) FROM detalle_ventas dv WHERE dv.venta_id = v.id_venta) as item_count,
          (SELECT STRING_AGG(u2.nick, ',')
           FROM ventas_usuarios vu
           JOIN usuarios u2 ON u2.id_usuario = vu.usuario_id
           WHERE vu.venta_id = v.id_venta) as anfitrionas_nicks
        FROM ventas v
        LEFT JOIN clientes c ON v.cliente_id = c.id_cliente
        LEFT JOIN usuarios u ON v.created_by = u.id_usuario
        LEFT JOIN habitaciones h ON h.id_habitacion = v.habitacion_id
        ${where}
        ORDER BY v.fecha_crea DESC
        LIMIT ? OFFSET ?
      `;
    const countSql = `SELECT COUNT(*) as count FROM ventas v ${where}`;
    const data = await query<VentaRawRow[]>(sql, [...sqlParams, lNum, offset]);
    const count = await query<VentaCountRow[]>(countSql, sqlParams);

    return {
      data: data
        .map(row => {
          const sale = mapSaleFromDB(row);
          if (!sale) return null;
          return {
            ...sale,
            has_anulacion_solicitada: Boolean(Number(row.has_anulacion_solicitada || 0))
          };
        })
        .filter((item): item is SaleType & { has_anulacion_solicitada: boolean } => item !== null),
      total: count[0]?.count || 0
    };
  } catch (err) {
    logger.error('[ventas/lecturas] Error en listarVentas:', { params, err });
    throw new DatabaseError('Error al obtener lista de ventas', err);
  }
}

/** Venta con detalles, usuarios, comisiones y propinas. Mismo SQL que `SaleQueries.getById`. */
export async function obtenerVenta(id: string): Promise<VentaGetByIdResponse | null> {
  try {
    const res = await query<VentaGetByIdRow[]>(
      `SELECT v.*, (CAST(c.nombre AS text) || CAST(' ' AS text) || CAST(c.apellido AS text)) as cliente_nombre, h.nombre as habitacion_numero,
              u.nick as cajero_nick, u.nombre as cajero_nombre, u.apellido as cajero_apellido,
              (CAST(ug.nombre AS text) || CAST(' ' AS text) || CAST(ug.apellido AS text)) as garzon_nombre,
              (SELECT STRING_AGG(u2.nick, ',')
               FROM ventas_usuarios vu
               JOIN usuarios u2 ON u2.id_usuario = vu.usuario_id
               WHERE vu.venta_id = v.id_venta) as anfitrionas_nicks,
              STRING_AGG((CAST(p.nombre AS text) || CAST(' x' AS text) || CAST(dv.cantidad AS text)), ', ') as productos_detalle
       FROM ventas v
       LEFT JOIN clientes c ON c.id_cliente = v.cliente_id
       LEFT JOIN habitaciones h ON h.id_habitacion = v.habitacion_id
       LEFT JOIN usuarios u ON u.id_usuario = v.created_by
       LEFT JOIN pedidos pe ON pe.id_pedido = v.pedido_id
       LEFT JOIN usuarios ug ON ug.id_usuario = pe.mesero_id
       LEFT JOIN detalle_ventas dv ON dv.venta_id = v.id_venta
       LEFT JOIN productos p ON p.id_producto = dv.producto_id
       WHERE v.id_venta = ?
       GROUP BY v.id_venta, c.id_cliente, h.id_habitacion, u.id_usuario, ug.id_usuario`,
      [id]
    );

    if (res.length === 0) return null;

    const venta = mapSaleFromDB(res[0]);
    if (!venta) return null;

    const [detalles, usuarios, comisiones, propinas] = await Promise.all([
      query<DetalleVentaWithProductRow[]>(
        `SELECT dv.id_detalle_venta as id, dv.venta_id, dv.producto_id, dv.presentacion_id, dv.precio, dv.comision, dv.cantidad, dv.sub_total,
                dv.tipo_venta, dv.shot_anfitriona,
                p.nombre as producto_nombre, p.precio as producto_precio,
                c.nombre as categoria_nombre, ip.nombre as presentacion_nombre,
                p.foto as producto_foto
         FROM detalle_ventas dv
         LEFT JOIN productos p ON p.id_producto = dv.producto_id
         LEFT JOIN categorias c ON c.id_categoria = p.categoria_id
         LEFT JOIN inventario_presentaciones ip ON ip.id = dv.presentacion_id
         WHERE dv.venta_id = ?
         ORDER BY dv.id_detalle_venta ASC`,
        [id]
      ),
      query<VentaUsuarioDetailRow[]>(
        `SELECT vu.usuario_id, u.nick, u.nombre as usuario_nombre
         FROM ventas_usuarios vu
         LEFT JOIN usuarios u ON u.id_usuario = vu.usuario_id
         WHERE vu.venta_id = ?`,
        [id]
      ),
      query<VentaComisionGroupRow[]>(
        `SELECT dv.hostess_id AS usuario_id, u.nick, u.nombre, u.apellido, u.foto, SUM(dv.comision) as monto
         FROM detalle_ventas dv
         JOIN usuarios u ON u.id_usuario = dv.hostess_id
         WHERE dv.venta_id = ? AND dv.comision > 0
         GROUP BY dv.hostess_id, u.nick, u.nombre, u.apellido, u.foto`,
        [id]
      ),
      query<VentaPropinaGroupRow[]>(
        `SELECT dp.usuario_id, u.nick, u.nombre, u.apellido, u.foto, r.nombre AS rol, SUM(dp.monto) as monto
         FROM propinas p
         INNER JOIN detalle_propinas dp ON dp.propina_id = p.id_propina
         LEFT JOIN usuarios u ON u.id_usuario = dp.usuario_id
         LEFT JOIN roles r ON r.id_rol = u.rol_id
         WHERE p.venta_id = ?
         GROUP BY dp.usuario_id, u.nick, u.nombre, u.apellido, u.foto, r.nombre
         ORDER BY monto DESC`,
        [id]
      )
    ]);

    const totalComision = comisiones.reduce((sum, c) => sum + Number(c.monto || 0), 0);

    return {
      ...venta,
      cajero_nick: res[0].cajero_nick,
      cajero_nombre: res[0].cajero_nombre,
      cajero_apellido: res[0].cajero_apellido,
      garzon_nombre: res[0].garzon_nombre,
      habitacion_nombre: res[0].habitacion_nombre,
      total_comision: totalComision,
      comisiones_detalle: comisiones.map(c => ({
        usuario_id: c.usuario_id,
        nombre: c.nombre,
        apellido: c.apellido,
        nick: c.nick,
        foto: c.foto,
        monto: Number(c.monto || 0)
      })),
      propinas_detalle: propinas.map(p => ({
        rol: p.rol,
        usuario_id: p.usuario_id,
        nick: p.nick,
        nombre: p.nombre,
        apellido: p.apellido,
        foto: p.foto,
        monto: Number(p.monto || 0)
      })),
      detalles: detalles.map(d => ({
        id: d.id,
        venta_id: d.venta_id,
        producto_id: d.producto_id,
        presentacion_id: d.presentacion_id,
        tipo_venta: d.tipo_venta,
        shot_anfitriona: d.shot_anfitriona,
        precio: Number(d.precio || 0),
        comision: Number(d.comision || 0),
        cantidad: Number(d.cantidad || 0),
        sub_total: Number(d.sub_total || 0),
        producto_nombre: d.producto_nombre,
        producto_precio: d.producto_precio ? Number(d.producto_precio) : undefined,
        categoria_nombre: d.categoria_nombre,
        presentacion_nombre: d.presentacion_nombre,
        producto_foto: d.producto_foto,
        producto_etiqueta: [d.categoria_nombre, d.producto_nombre, d.presentacion_nombre]
          .map(value => String(value || '').trim())
          .filter(Boolean)
          .join(' - ')
      })),
      usuarios: usuarios.map(u => ({
        id: u.usuario_id,
        usuario_id: u.usuario_id,
        nick: u.nick,
        usuario_nombre: u.usuario_nombre
      }))
    };
  } catch (err) {
    logger.error('[ventas/lecturas] Error en obtenerVenta:', { ventaId: id, err });
    throw new DatabaseError(`Error al obtener venta ${id}`, err);
  }
}
