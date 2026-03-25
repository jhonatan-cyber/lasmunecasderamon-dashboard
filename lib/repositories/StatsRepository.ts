import { query } from '@/lib/db';

export class StatsRepository {
  /**
   * Obtiene las estadísticas de habitaciones y distribuye las comisiones
   * de venta proporcionalmente según la cantidad de servicios.
   */
  static async getHabitacionesStats(cajaId: string) {
    const habitacionesStats = (await query(`
      SELECT 
        h.id_habitacion as habitacion_id,
        h.nombre as habitacion_nombre,
        COUNT(s.id_servicio) as total_servicios,
        COALESCE(SUM(s.precio_servicio), 0) as monto_servicios,
        COALESCE(SUM(s.precio_habitacion), 0) as monto_habitacion,
        COALESCE(SUM(s.iva), 0) as monto_iva,
        COALESCE(SUM(h.comision_anfitriona), 0) as comisiones_habitacion,
        COALESCE(SUM(s.precio_servicio + s.precio_habitacion + s.iva), 0) as total_generado
      FROM habitaciones h
      LEFT JOIN servicios s ON h.id_habitacion = s.habitacion_id 
        AND s.caja_id = ?
      GROUP BY h.id_habitacion, h.nombre, h.comision_anfitriona
      HAVING total_servicios > 0
      ORDER BY total_generado DESC, h.nombre ASC
    `, [cajaId])) as any[];

    const comisionesVentas = await query(`
      SELECT 
        COALESCE(SUM(dv.comision), 0) as total_comisiones_venta
      FROM ventas v
      INNER JOIN detalle_ventas dv ON v.id_venta = dv.venta_id
      WHERE v.caja_id = ?
    `, [cajaId]);

    const totalComisionesVenta = (comisionesVentas as any)[0]?.total_comisiones_venta || 0;
    const totalServicios = habitacionesStats.reduce((sum: number, h: any) => sum + h.total_servicios, 0);
    
    return habitacionesStats.map((habitacion: any) => ({
      ...habitacion,
      comisiones_venta: totalServicios > 0 
        ? Math.round((habitacion.total_servicios / totalServicios) * totalComisionesVenta)
        : 0
    }));
  }

  /**
   * Obtiene estadísticas generales de la caja abierta actualmente.
   */
  static async getCajaGeneralStats() {
    // 1. Obtener la caja abierta primero
    const cajaAbierta = (await query(`
      SELECT id_caja, fecha_apertura, usuario_id_apertura, monto_apertura, efectivo,
        tarjeta, transferencia, comision, propina, iva, anticipo, devolucion,
        TIMESTAMPDIFF(HOUR, fecha_apertura, NOW()) as horas_abierta,
        TIMESTAMPDIFF(MINUTE, fecha_apertura, NOW()) % 60 as minutos_abierta
      FROM cajas
      WHERE estado = 1
      ORDER BY fecha_apertura DESC
      LIMIT 1
    `)) as any[];

    const cajaRow = cajaAbierta[0] || null;

    // 2. Ejecutar queries en paralelo
    const [cajasStats, ventasStats, serviciosStats, balanceStats] = await Promise.all([
      query(`
        SELECT 
          COUNT(CASE WHEN estado = 1 THEN 1 END) as cajas_abiertas,
          COUNT(CASE WHEN estado = 0 THEN 1 END) as cajas_cerradas,
          COUNT(*) as total_cajas
        FROM cajas
      `) as Promise<any[]>,

      cajaRow?.id_caja
        ? query(`
            SELECT 
              COALESCE(SUM(total), 0) as total_ventas,
              COALESCE(COUNT(*), 0) as cantidad_ventas,
              COALESCE(AVG(total), 0) as promedio_venta,
              COALESCE(SUM(CASE WHEN metodo_pago = 'efectivo' THEN total ELSE 0 END), 0) as total_efectivo,
              COALESCE(SUM(CASE WHEN metodo_pago = 'tarjeta' THEN total ELSE 0 END), 0) as total_tarjeta,
              COALESCE(SUM(CASE WHEN metodo_pago = 'transferencia' THEN total ELSE 0 END), 0) as total_transferencia
            FROM ventas
            WHERE caja_id = ? AND estado IN (1, 2)
          `, [cajaRow.id_caja]) as Promise<any[]>
        : Promise.resolve([{ total_ventas: 0, cantidad_ventas: 0, promedio_venta: 0, total_efectivo: 0, total_tarjeta: 0, total_transferencia: 0 }] as any[]),

      cajaRow?.id_caja
        ? query(`
            SELECT 
              COALESCE(SUM(total), 0) as total_servicios,
              COALESCE(COUNT(*), 0) as cantidad_servicios,
              COALESCE(AVG(total), 0) as promedio_servicio
            FROM servicios
            WHERE caja_id = ? AND estado IN (1, 2)
          `, [cajaRow.id_caja]) as Promise<any[]>
        : Promise.resolve([{ total_servicios: 0, cantidad_servicios: 0, promedio_servicio: 0 }] as any[]),

      query(`
        SELECT 
          COALESCE(SUM(monto_apertura + efectivo + tarjeta + transferencia - COALESCE(anticipo, 0) - COALESCE(devolucion, 0)), 0) as balance_total
        FROM cajas
        WHERE estado = 1
      `) as Promise<any[]>
    ]);

    return {
      // Caja info
      caja_id: cajaRow?.id_caja,
      monto_apertura: parseFloat(cajaRow?.monto_apertura || 0),
      efectivo_en_caja: parseFloat(cajaRow?.monto_apertura || 0) + parseFloat(cajaRow?.efectivo || 0),
      total_efectivo: parseFloat(cajaRow?.efectivo || 0),
      total_tarjeta: parseFloat(cajaRow?.tarjeta || 0),
      total_transferencia: parseFloat(cajaRow?.transferencia || 0),
      total_anticipo: parseFloat(cajaRow?.anticipo || 0),
      total_devolucion: parseFloat(cajaRow?.devolucion || 0),
      total_comision: parseFloat(cajaRow?.comision || 0),
      total_propina: parseFloat(cajaRow?.propina || 0),
      total_iva: parseFloat(cajaRow?.iva || 0),
      
      // Estadísticas de cajas
      cajas_abiertas: cajasStats[0]?.cajas_abiertas || 0,
      cajas_cerradas: cajasStats[0]?.cajas_cerradas || 0,
      total_cajas: cajasStats[0]?.total_cajas || 0,

      // Estadísticas de ventas
      total_ventas: parseFloat(ventasStats[0]?.total_ventas || 0),
      cantidad_ventas: parseInt(ventasStats[0]?.cantidad_ventas || 0),
      total_efectivo_ventas: parseFloat(ventasStats[0]?.total_efectivo || 0),

      // Estadísticas de servicios
      total_servicios: parseFloat(serviciosStats[0]?.total_servicios || 0),
      cantidad_servicios: parseInt(serviciosStats[0]?.cantidad_servicios || 0),

      // Balance total
      balance_total: parseFloat(balanceStats[0]?.balance_total || 0),
      total_ingresos: parseFloat(balanceStats[0]?.balance_total || 0),

      // Información de tiempo
      tiempo_abierta_horas: cajaRow?.horas_abierta || 0,
      tiempo_abierta_minutos: cajaRow?.minutos_abierta || 0,
      fecha_apertura_raw: cajaRow?.fecha_apertura || null,
      usuario_id_apertura: cajaRow?.usuario_id_apertura || null
    };
  }

  static async getLoggedUsers() {
    const loggedUsers = (await query(`
      SELECT u.id_usuario, u.nick, r.nombre as rol
      FROM logins l
      INNER JOIN usuarios u ON l.usuario_id = u.id_usuario
      INNER JOIN roles r ON u.rol_id = r.id_rol
      WHERE l.estado = 1
    `)) as any[];

    const totalUsers = (await query(`
      SELECT r.nombre as rol, COUNT(*) as total
      FROM usuarios u
      INNER JOIN roles r ON u.rol_id = r.id_rol
      WHERE u.estado = 1
      GROUP BY r.nombre
    `)) as any[];

    const findTotal = (rol: string) => totalUsers.find(t => t.rol.toLowerCase().includes(rol))?.total || 0;
    const filterLogged = (rol: string) => loggedUsers.filter(u => u.rol.toLowerCase().includes(rol));

    const formatRole = (rol: string) => {
      const users = filterLogged(rol);
      const total = findTotal(rol);
      return {
        logueadas: users.length,
        usuarios: users,
        total,
        porcentaje: total > 0 ? Math.round((users.length / total) * 100) : 0
      };
    };

    return {
      anfitrionas: formatRole('anfitriona'),
      garzones: formatRole('garzon'),
      cajeros: formatRole('cajero')
    };
  }

  static async getSalesByMonth(offset: number = 0) {
    const rows = (await query(`
      SELECT 
        DATE_FORMAT(fecha_crea, '%Y-%m') as mes,
        COUNT(*) as cantidad_ventas,
        SUM(total) as total_ventas
      FROM ventas
      WHERE estado IN (1, 2)
        AND YEAR(fecha_crea) = YEAR(DATE_SUB(NOW(), INTERVAL ? YEAR))
      GROUP BY mes
      ORDER BY mes DESC
      LIMIT 12
    `, [offset])) as any[];

    if (!rows || rows.length === 0) {
      return {
        year: new Date().getFullYear(),
        data: [],
        summary: {
          totalVentas: 0,
          totalCantidad: 0,
          mesMaxVentas: 'N/A',
          mesMinVentas: 'N/A',
          promedioMensual: 0
        }
      };
    }

    const data = rows.map(r => ({
      mes: r.mes,
      mes_num: parseInt(r.mes.split('-')[1]),
      total: parseFloat(r.total_ventas || 0),
      cantidad_ventas: parseInt(r.cantidad_ventas || 0)
    }));

    const totalVentas = data.reduce((sum, d) => sum + d.total, 0);
    const totalCantidad = data.reduce((sum, d) => sum + d.cantidad_ventas, 0);
    const maxMes = [...data].sort((a, b) => b.total - a.total)[0];
    const minMes = [...data].sort((a, b) => a.total - b.total)[0];

    return {
      year: new Date().getFullYear(),
      data: data.sort((a, b) => a.mes.localeCompare(b.mes)), // Ordenar cronológicamente ascendente
      summary: {
        totalVentas,
        totalCantidad,
        mesMaxVentas: maxMes?.mes || 'N/A',
        mesMinVentas: minMes?.mes || 'N/A',
        promedioMensual: totalVentas / data.length
      }
    };
  }

  static async getSalesByWeek(offset: number = 0) {
    // Calcular fechas de la semana actual considerando el offset
    // En SQL, lunes es el día 0 o según la configuración local, usaremos STR_TO_DATE y WEEKDAY
    const rows = (await query(`
      WITH RECURSIVE days AS (
        SELECT DATE(DATE_SUB(NOW(), INTERVAL (WEEKDAY(NOW()) + (? * 7)) DAY)) as d, 0 as i
        UNION ALL
        SELECT DATE_ADD(d, INTERVAL 1 DAY), i + 1 FROM days WHERE i < 6
      )
      SELECT 
        DATE_FORMAT(days.d, '%W') as dia_semana,
        CASE 
          WHEN DAYNAME(days.d) = 'Monday' THEN 'Lunes'
          WHEN DAYNAME(days.d) = 'Tuesday' THEN 'Martes'
          WHEN DAYNAME(days.d) = 'Wednesday' THEN 'Miércoles'
          WHEN DAYNAME(days.d) = 'Thursday' THEN 'Jueves'
          WHEN DAYNAME(days.d) = 'Friday' THEN 'Viernes'
          WHEN DAYNAME(days.d) = 'Saturday' THEN 'Sábado'
          WHEN DAYNAME(days.d) = 'Sunday' THEN 'Domingo'
        END as dia_espanol,
        WEEKDAY(days.d) as orden,
        COALESCE(SUM(v.total), 0) as total,
        days.d as fecha
      FROM days
      LEFT JOIN ventas v ON DATE(v.fecha_crea) = days.d AND v.estado IN (1, 2)
      GROUP BY days.d, dia_semana, dia_espanol, orden
      ORDER BY orden ASC
    `, [offset])) as any[];

    const startDate = rows[0]?.fecha;
    const endDate = rows[rows.length - 1]?.fecha;

    const data = rows.map(r => ({
      dia_semana: r.dia_semana,
      dia_espanol: r.dia_espanol,
      orden: r.orden,
      total: parseFloat(r.total || 0)
    }));

    const totalVentas = data.reduce((sum, d) => sum + d.total, 0);
    const maxDia = [...data].sort((a, b) => b.total - a.total)[0];
    const minDia = [...data].sort((a, b) => a.total - b.total)[0];

    return {
      startDate,
      endDate,
      data,
      summary: {
        totalVentas,
        promedioDiario: totalVentas / 7,
        diaMaxVentas: maxDia?.dia_espanol || 'N/A',
        diaMinVentas: minDia?.dia_espanol || 'N/A'
      }
    };
  }
}
