import { query } from '@/lib/database/db';
import { toDateKey } from '@/lib/utils/calendarUtils';

export class CalendarRepository {
  static async getData(startDate: string, endDate: string, type: 'servicios' | 'ventas') {
    if (type === 'servicios') {
      return await query(`
        SELECT S.*, H.nombre AS habitacion, 
               GROUP_CONCAT(DISTINCT U.nick ORDER BY U.nick SEPARATOR ', ') AS anfitrionas,
               GROUP_CONCAT(DISTINCT U.id_usuario SEPARATOR ', ') AS anfitrionaIds,
               CONCAT(CL.nombre, ' ', CL.apellido) AS cliente,
               SUM(DS.comision) AS comision_total,
               GROUP_CONCAT(CONCAT(U.nick, ':', COALESCE(DS.comision, 0)) SEPARATOR '|') AS comision_por_anfitriona
        FROM servicios S
        LEFT JOIN habitaciones H ON H.id_habitacion = S.habitacion_id
        LEFT JOIN clientes CL ON CL.id_cliente = S.cliente_id
        LEFT JOIN detalle_servicios DS ON DS.servicio_id = S.id_servicio
        LEFT JOIN usuarios U ON U.id_usuario = DS.usuario_id
        WHERE DATE(S.fecha_crea) BETWEEN ? AND ?
        GROUP BY S.id_servicio ORDER BY S.fecha_crea ASC
      `, [startDate, endDate]);
    } else {
      return await query(`
        SELECT V.*, H.nombre AS habitacion,
               COALESCE(CONCAT(CL.nombre, ' ', CL.apellido), 'Sin cliente registrado') AS cliente,
               (SELECT GROUP_CONCAT(DISTINCT U.nick ORDER BY U.nick SEPARATOR ', ')
                FROM ventas_usuarios VU
                LEFT JOIN usuarios U ON U.id_usuario = VU.usuario_id
                WHERE VU.venta_id = V.id_venta) AS anfitrionas,
               (SELECT GROUP_CONCAT(DISTINCT VU.usuario_id SEPARATOR ',')
                FROM ventas_usuarios VU WHERE VU.venta_id = V.id_venta) AS anfitrionaIds,
               (SELECT COALESCE(SUM(DV.comision), 0) FROM detalle_ventas DV WHERE DV.venta_id = V.id_venta) AS comision_total,
               (SELECT COALESCE(GROUP_CONCAT(CONCAT(U.nick, ':', COALESCE(DV.comision, 0)) SEPARATOR '|'), '')
                FROM detalle_ventas DV
                LEFT JOIN usuarios U ON U.id_usuario = DV.hostess_id
                WHERE DV.venta_id = V.id_venta AND DV.hostess_id IS NOT NULL) AS comision_por_anfitriona,
               V.propina AS propina_total,
               (SELECT COALESCE(GROUP_CONCAT(CONCAT(U.nick, ':', COALESCE(DP.monto, 0)) SEPARATOR '|'), '')
                FROM detalle_propinas DP
                INNER JOIN propinas P ON P.id_propina = DP.propina_id
                LEFT JOIN usuarios U ON U.id_usuario = DP.usuario_id
                WHERE P.venta_id = V.id_venta AND DP.estado = 1) AS distribucion_propina
        FROM ventas V
        LEFT JOIN clientes CL ON CL.id_cliente = V.cliente_id
        LEFT JOIN habitaciones H ON H.id_habitacion = V.habitacion_id
        WHERE DATE(V.fecha_crea) BETWEEN ? AND ?
        GROUP BY V.id_venta ORDER BY V.fecha_crea ASC
      `, [startDate, endDate]);
    }
  }

  static async getActions(startDate: string, endDate: string) {
    const all: any[] = [];
    const pushVentas = await query(`SELECT 'venta' as tipo, DATE_FORMAT(fecha_crea, '%Y-%m-%d') as fecha, codigo, total, estado FROM ventas WHERE DATE(fecha_crea) BETWEEN ? AND ?`, [startDate, endDate]);
    all.push(...(pushVentas as any[]));

    const pushServicios = await query(`SELECT 'servicio' as tipo, DATE_FORMAT(fecha_crea, '%Y-%m-%d') as fecha, codigo, total, estado FROM servicios WHERE DATE(fecha_crea) BETWEEN ? AND ?`, [startDate, endDate]);
    all.push(...(pushServicios as any[]));

    const pushAsis = await query(`SELECT 'asistencia' as tipo, DATE_FORMAT(a.fecha, '%Y-%m-%d') as fecha, CONCAT(u.nombre, ' ', u.apellido) as codigo, a.estado FROM asistencias a INNER JOIN usuarios u ON u.id_usuario = a.usuario_id WHERE DATE(a.fecha) BETWEEN ? AND ?`, [startDate, endDate]);
    all.push(...(pushAsis as any[]));

    // Formatear y agrupar
    const grouped: Record<string, any[]> = {};
    all.sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())
       .forEach(x => {
         const key = toDateKey(x.fecha);
         if (!grouped[key]) grouped[key] = [];
         grouped[key].push({ ...x, cliente: x.cliente || x.codigo, descripcion: `${x.tipo} registrado` });
       });
    return grouped;
  }
}
