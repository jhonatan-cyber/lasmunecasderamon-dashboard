import { query } from '@/lib/database/db';
import { toDateKey } from '@/lib/utils/calendarUtils';

export class CalendarRepository {
  static async getData(startDate: string, endDate: string, type: 'servicios' | 'ventas') {
    if (type === 'servicios') {
      return await query(
        `
        SELECT S.*, H.nombre AS habitacion,
               STRING_AGG(DISTINCT U.nick, ', ' ORDER BY U.nick) AS anfitrionas,
               STRING_AGG(DISTINCT U.id_usuario, ', ') AS "anfitrionaIds",
               (CAST(CL.nombre AS text) || CAST(' ' AS text) || CAST(CL.apellido AS text)) AS cliente,
               SUM(DS.comision) AS comision_total,
               STRING_AGG((CAST(U.nick AS text) || CAST(':' AS text) || CAST(COALESCE(DS.comision, 0) AS text)), '|') AS comision_por_anfitriona
        FROM servicios S
        LEFT JOIN habitaciones H ON H.id_habitacion = S.habitacion_id
        LEFT JOIN clientes CL ON CL.id_cliente = S.cliente_id
        LEFT JOIN detalle_servicios DS ON DS.servicio_id = S.id_servicio
        LEFT JOIN usuarios U ON U.id_usuario = DS.usuario_id
        WHERE DATE(S.fecha_crea) BETWEEN ? AND ?
        GROUP BY S.id_servicio, H.id_habitacion, CL.id_cliente ORDER BY S.fecha_crea ASC
      `,
        [startDate, endDate]
      );
    } else {
      return await query(
        `
        SELECT V.*, H.nombre AS habitacion,
               COALESCE((CAST(CL.nombre AS text) || CAST(' ' AS text) || CAST(CL.apellido AS text)), 'Sin cliente registrado') AS cliente,
               (SELECT STRING_AGG(DISTINCT U.nick, ', ' ORDER BY U.nick)
                FROM ventas_usuarios VU
                LEFT JOIN usuarios U ON U.id_usuario = VU.usuario_id
                WHERE VU.venta_id = V.id_venta) AS anfitrionas,
               (SELECT STRING_AGG(DISTINCT VU.usuario_id, ',')
                FROM ventas_usuarios VU WHERE VU.venta_id = V.id_venta) AS "anfitrionaIds",
               (SELECT COALESCE(SUM(DV.comision), 0) FROM detalle_ventas DV WHERE DV.venta_id = V.id_venta) AS comision_total,
               (SELECT COALESCE(STRING_AGG((CAST(U.nick AS text) || CAST(':' AS text) || CAST(COALESCE(DV.comision, 0) AS text)), '|'), '')
                FROM detalle_ventas DV
                LEFT JOIN usuarios U ON U.id_usuario = DV.hostess_id
                WHERE DV.venta_id = V.id_venta AND DV.hostess_id IS NOT NULL) AS comision_por_anfitriona,
               V.propina AS propina_total,
               (SELECT COALESCE(STRING_AGG((CAST(U.nick AS text) || CAST(':' AS text) || CAST(COALESCE(DP.monto, 0) AS text)), '|'), '')
                FROM detalle_propinas DP
                INNER JOIN propinas P ON P.id_propina = DP.propina_id
                LEFT JOIN usuarios U ON U.id_usuario = DP.usuario_id
                WHERE P.venta_id = V.id_venta AND DP.estado = 1) AS distribucion_propina
        FROM ventas V
        LEFT JOIN clientes CL ON CL.id_cliente = V.cliente_id
        LEFT JOIN habitaciones H ON H.id_habitacion = V.habitacion_id
        WHERE DATE(V.fecha_crea) BETWEEN ? AND ?
        GROUP BY V.id_venta, H.id_habitacion, CL.id_cliente ORDER BY V.fecha_crea ASC
      `,
        [startDate, endDate]
      );
    }
  }

  static async getActions(startDate: string, endDate: string) {
    const all: any[] = [];
    const pushVentas = await query(
      `SELECT 'venta' as tipo, TO_CHAR(fecha_crea, 'YYYY-MM-DD') as fecha, codigo, total, estado FROM ventas WHERE DATE(fecha_crea) BETWEEN ? AND ?`,
      [startDate, endDate]
    );
    all.push(...(pushVentas as any[]));

    const pushServicios = await query(
      `SELECT 'servicio' as tipo, TO_CHAR(fecha_crea, 'YYYY-MM-DD') as fecha, codigo, total, estado FROM servicios WHERE DATE(fecha_crea) BETWEEN ? AND ?`,
      [startDate, endDate]
    );
    all.push(...(pushServicios as any[]));

    const pushAsis = await query(
      `SELECT 'asistencia' as tipo, TO_CHAR(a.fecha, 'YYYY-MM-DD') as fecha, (CAST(u.nombre AS text) || CAST(' ' AS text) || CAST(u.apellido AS text)) as codigo, a.estado FROM asistencias a INNER JOIN usuarios u ON u.id_usuario = a.usuario_id WHERE DATE(a.fecha) BETWEEN ? AND ?`,
      [startDate, endDate]
    );
    all.push(...(pushAsis as any[]));

    const grouped: Record<string, any[]> = {};
    all
      .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())
      .forEach(x => {
        const key = toDateKey(x.fecha);
        if (!grouped[key]) grouped[key] = [];
        grouped[key].push({
          ...x,
          cliente: x.cliente || x.codigo,
          descripcion: `${x.tipo} registrado`
        });
      });
    return grouped;
  }
}
