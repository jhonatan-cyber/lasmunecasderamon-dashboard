import { query } from '@/lib/database/db';

export interface RangoInforme {
  clause: string;
  params: string[];
}

export async function listarCajasInforme(rango: RangoInforme): Promise<any[]> {
  return query<any[]>(
    `SELECT
      c.id_caja,
      c.fecha_apertura,
      c.fecha_cierre,
      c.monto_apertura,
      c.monto_cierre,
      c.estado,
      c.venta,
      c.servicio,
      c.efectivo,
      c.tarjeta,
      c.transferencia,
      c.propina,
      c.comision,
      c.iva,
      c.devolucion AS devoluciones,
      CASE
        WHEN EXTRACT(HOUR FROM c.fecha_apertura) BETWEEN 6 AND 17 THEN 'Dia'
        ELSE 'Noche'
      END AS turno,
      COALESCE(
        c.monto_cierre - (
          COALESCE(c.monto_apertura, 0) +
          COALESCE(c.efectivo, 0) +
          COALESCE(c.tarjeta, 0) +
          COALESCE(c.transferencia, 0) -
          COALESCE(c.devolucion, 0)
        ),
        0
      ) AS diferencia
    FROM cajas c
    WHERE c.estado IN (0, 1)
      AND ${rango.clause}
    ORDER BY c.fecha_apertura DESC`,
    rango.params
  );
}

export async function obtenerResumenVentasInforme(rango: RangoInforme): Promise<any[]> {
  return query<any[]>(
    `SELECT
        COALESCE(SUM(v.total - COALESCE(v.cargo_tarjeta, 0)), 0) AS "totalVentas",
        COALESCE(SUM(v.cargo_tarjeta), 0) AS "cargoTarjeta",
        COUNT(*) AS "cantidadVentas",
        COALESCE(AVG(v.total - COALESCE(v.cargo_tarjeta, 0)), 0) AS "promedioVenta",
        COALESCE(SUM(v.propina), 0) AS "totalPropinas",
        COALESCE(SUM(CASE WHEN LOWER(v.metodo_pago) = 'efectivo' THEN v.total ELSE 0 END), 0) AS efectivo,
        COALESCE(SUM(CASE WHEN LOWER(v.metodo_pago) = 'tarjeta' THEN v.total ELSE 0 END), 0) AS tarjeta,
        COALESCE(SUM(CASE WHEN LOWER(v.metodo_pago) = 'transferencia' THEN v.total ELSE 0 END), 0) AS transferencia
      FROM ventas v
      WHERE v.estado IN (1, 2)
        AND ${rango.clause}`,
    rango.params
  );
}

export async function listarVentasDiariasInforme(rango: RangoInforme): Promise<any[]> {
  return query<any[]>(
    `SELECT
        DATE(v.fecha_crea) AS fecha,
        COALESCE(SUM(v.total - COALESCE(v.cargo_tarjeta, 0)), 0) AS ventas,
        COALESCE(SUM(v.cargo_tarjeta), 0) AS "cargoTarjeta",
        COUNT(*) AS cantidad,
        COALESCE(SUM(v.propina), 0) AS propinas
      FROM ventas v
      WHERE v.estado IN (1, 2)
        AND ${rango.clause}
      GROUP BY DATE(v.fecha_crea)
      ORDER BY DATE(v.fecha_crea) ASC`,
    rango.params
  );
}

export async function listarShotsVentasInforme(rango: RangoInforme): Promise<any[]> {
  return query<any[]>(
    `SELECT
        COALESCE(SUM(CASE WHEN NOT dv.shot_anfitriona THEN dv.sub_total ELSE 0 END), 0) AS "montoCliente",
        COALESCE(SUM(CASE WHEN NOT dv.shot_anfitriona THEN dv.cantidad ELSE 0 END), 0) AS "cantidadCliente",
        COALESCE(SUM(CASE WHEN dv.shot_anfitriona THEN dv.sub_total ELSE 0 END), 0) AS "montoAnfitriona",
        COALESCE(SUM(CASE WHEN dv.shot_anfitriona THEN dv.cantidad ELSE 0 END), 0) AS "cantidadAnfitriona"
      FROM detalle_ventas dv
      INNER JOIN ventas v ON v.id_venta = dv.venta_id
      WHERE v.estado IN (1, 2)
        AND dv.tipo_venta = 'shot'
        AND ${rango.clause}`,
    rango.params
  );
}

export async function listarComisionesInforme(rango: RangoInforme): Promise<any[]> {
  return query<any[]>(
    `SELECT
      u.id_usuario,
      u.nombre,
      u.apellido,
      (CAST(u.nombre AS text) || CAST(' ' AS text) || CAST(u.apellido AS text)) AS nombre_completo,
      COUNT(DISTINCT CASE WHEN c.venta_id IS NOT NULL AND c.venta_id <> '' THEN c.venta_id END) AS total_ventas,
      COUNT(DISTINCT CASE WHEN c.servicio_id IS NOT NULL AND c.servicio_id <> '' THEN c.servicio_id END) AS total_servicios,
      COALESCE(SUM(CASE WHEN c.venta_id IS NOT NULL AND c.venta_id <> '' THEN v.total ELSE 0 END), 0) AS total_ventas_monto,
      COALESCE(SUM(CASE WHEN c.servicio_id IS NOT NULL AND c.servicio_id <> '' THEN s.total ELSE 0 END), 0) AS total_servicios_monto,
      COALESCE(SUM(dc.comision), 0) AS total_comisiones,
      COALESCE(AVG(CASE WHEN c.venta_id IS NOT NULL AND c.venta_id <> '' THEN dc.comision END), 0) AS promedio_por_venta,
      COALESCE(AVG(CASE WHEN c.servicio_id IS NOT NULL AND c.servicio_id <> '' THEN dc.comision END), 0) AS promedio_por_servicio,
      COUNT(DISTINCT DATE(c.fecha_crea)) AS dias_trabajados,
      COALESCE(SUM(dc.comision)::numeric / NULLIF(COUNT(DISTINCT DATE(c.fecha_crea)), 0), 0) AS promedio_diario
    FROM detalle_comisiones dc
    INNER JOIN comisiones c ON c.id_comision = dc.comision_id
    INNER JOIN usuarios u ON u.id_usuario = dc.usuario_id
    INNER JOIN roles r ON r.id_rol = u.rol_id
    LEFT JOIN ventas v ON v.id_venta = c.venta_id
    LEFT JOIN servicios s ON s.id_servicio = c.servicio_id
    WHERE c.estado IN (1, 2)
      AND dc.estado IN (0, 1, 2)
      AND LOWER(r.nombre) = 'anfitriona'
      AND ${rango.clause}
    GROUP BY u.id_usuario, u.nombre, u.apellido
    ORDER BY total_comisiones DESC, nombre_completo ASC`,
    rango.params
  );
}

export async function listarComisionesDiariasInforme(rango: RangoInforme): Promise<any[]> {
  return query<any[]>(
    `SELECT
      TO_CHAR(c.fecha_crea, 'FMDay') AS dia_semana,
      CASE (EXTRACT(DOW FROM c.fecha_crea)::integer + 1)
        WHEN 1 THEN 'Domingo'
        WHEN 2 THEN 'Lunes'
        WHEN 3 THEN 'Martes'
        WHEN 4 THEN 'Miercoles'
        WHEN 5 THEN 'Jueves'
        WHEN 6 THEN 'Viernes'
        WHEN 7 THEN 'Sabado'
      END AS dia_espanol,
      COALESCE(SUM(CASE WHEN c.venta_id IS NOT NULL AND c.venta_id <> '' THEN 1 ELSE 0 END), 0) AS total_ventas,
      COALESCE(SUM(CASE WHEN c.servicio_id IS NOT NULL AND c.servicio_id <> '' THEN 1 ELSE 0 END), 0) AS total_servicios,
      COALESCE(SUM(CASE WHEN c.venta_id IS NOT NULL AND c.venta_id <> '' THEN v.total ELSE 0 END), 0) AS total_ventas_monto,
      COALESCE(SUM(CASE WHEN c.servicio_id IS NOT NULL AND c.servicio_id <> '' THEN s.total ELSE 0 END), 0) AS total_servicios_monto,
      COALESCE(SUM(dc.comision), 0) AS total_comisiones,
      COALESCE(AVG(dc.comision), 0) AS promedio_comision,
      (EXTRACT(DOW FROM c.fecha_crea)::integer + 1) AS orden
    FROM detalle_comisiones dc
    INNER JOIN comisiones c ON c.id_comision = dc.comision_id
    INNER JOIN usuarios u ON u.id_usuario = dc.usuario_id
    INNER JOIN roles r ON r.id_rol = u.rol_id
    LEFT JOIN ventas v ON v.id_venta = c.venta_id
    LEFT JOIN servicios s ON s.id_servicio = c.servicio_id
    WHERE c.estado IN (1, 2)
      AND dc.estado IN (0, 1, 2)
      AND LOWER(r.nombre) = 'anfitriona'
      AND ${rango.clause}
    GROUP BY (EXTRACT(DOW FROM c.fecha_crea)::integer + 1), TO_CHAR(c.fecha_crea, 'FMDay')
    ORDER BY orden ASC`,
    rango.params
  );
}
