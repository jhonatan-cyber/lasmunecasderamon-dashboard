import { query } from '@/lib/database/db';
import { getNowInBusinessTimezone } from '@/lib/business/timezoneService';
import { DatabaseError } from '@/lib/errors/errors';
import { logger } from '@/lib/utils/logger';
import type {
  WeeklyIncomeRow,
  CountRow,
  TableCheckRow,
  UserEventRow,
  PropinaDetailRow,
  ComisionDetailRow,
  AsistenciaDetailRow,
  AnticipoDetailRow,
  ServicioDetailRow,
  VentaDetailRow,
  GratificacionDetailRow,
  HoraExtraDetailRow,
  UsuarioBasico,
  DetalleVentaRow,
  PropinaDetalleRow,
  ComisionServicioRow,
  HistorialAnticipoRow
} from '../types';

export class EventQueries {
  static async getStats(userId: string) {
    try {
      const now = getNowInBusinessTimezone();
      const weeklyIncome = await query<WeeklyIncomeRow[]>(
        `
      SELECT DATE(date) as day, SUM(amount) as total
      FROM (
        SELECT S.fecha_crea as date, COALESCE(DC.comision, 0) as amount FROM servicios S
        INNER JOIN detalle_servicios DS ON DS.servicio_id = S.id_servicio
        LEFT JOIN comisiones C ON C.servicio_id = S.id_servicio
        LEFT JOIN detalle_comisiones DC ON DC.comision_id = C.id_comision AND DC.usuario_id = DS.usuario_id
        WHERE DS.usuario_id = ? AND S.fecha_crea >= (CAST(? AS timestamp) - make_interval(days => CAST(7 AS integer)))
        UNION ALL
        SELECT DC.fecha_crea as date, DC.comision as amount FROM detalle_comisiones DC
        INNER JOIN comisiones C ON C.id_comision = DC.comision_id
        WHERE DC.usuario_id = ? AND C.venta_id IS NOT NULL AND DC.fecha_crea >= (CAST(? AS timestamp) - make_interval(days => CAST(7 AS integer)))
        UNION ALL
        SELECT DP.fecha_crea as date, DP.monto as amount FROM detalle_propinas DP
        WHERE DP.usuario_id = ? AND DP.fecha_crea >= (CAST(? AS timestamp) - make_interval(days => CAST(7 AS integer)))
        UNION ALL
        SELECT G.fecha_crea as date, G.monto as amount FROM gratificaciones G
        WHERE G.usuario_id = ? AND G.fecha_crea >= (CAST(? AS timestamp) - make_interval(days => CAST(7 AS integer)))
      ) as combined
      GROUP BY DATE(date)
      ORDER BY DATE(date) ASC
    `,
        [userId, now, userId, now, userId, now, userId, now]
      );

      const stats = await Promise.all([
        query<CountRow[]>('SELECT COUNT(*) as count FROM detalle_servicios WHERE usuario_id = ?', [
          userId
        ]),
        query<CountRow[]>(
          'SELECT SUM(comision) as total FROM detalle_comisiones WHERE usuario_id = ?',
          [userId]
        ),
        query<CountRow[]>('SELECT SUM(monto) as total FROM detalle_propinas WHERE usuario_id = ?', [
          userId
        ]),
        query<CountRow[]>('SELECT SUM(monto) as total FROM gratificaciones WHERE usuario_id = ?', [
          userId
        ])
      ]);

      const svcCount = stats[0][0]?.count || 0;
      const totalEarnings =
        Number(stats[1][0]?.total || 0) +
        Number(stats[2][0]?.total || 0) +
        Number(stats[3][0]?.total || 0);

      const badges = [];
      if (svcCount >= 10)
        badges.push({
          id: 'pro',
          icon: '🏆',
          title: 'Top 10 Servicios',
          description: '¡Has completado más de 10 servicios!'
        });
      if (totalEarnings >= 1000000000)
        badges.push({
          id: 'gold',
          icon: '💰',
          title: 'Experta en Ventas',
          description: 'Más de $100,000,000 acumulados'
        });

      return {
        weeklyIncome: weeklyIncome.map(w => ({ ...w, total: Number(w.total) })),
        badges,
        svcCount,
        totalEarnings
      };
    } catch (err) {
      logger.error('[EventQueries] Error en getStats:', { userId, err });
      throw new DatabaseError(`Error al obtener estadísticas del usuario ${userId}`, err);
    }
  }

  static async getUserEvents(userId: string, startDate?: string, endDate?: string) {
    try {
      const tableChecks = await query<TableCheckRow[]>(
        `SELECT table_name
       FROM information_schema.tables
       WHERE table_schema = current_schema()
          AND table_name IN ('gratificaciones', 'horas_extras')`
      );

      const hasGratificaciones = tableChecks.some(row => row.table_name === 'gratificaciones');
      const hasHorasExtras = tableChecks.some(row => row.table_name === 'horas_extras');

      const gratificacionesSql = hasGratificaciones
        ? `
      UNION ALL
      SELECT
        'gratificacion' as type,
        CAST(g.id AS text) as id,
        g.fecha_crea as date,
        g.monto as amount,
        COALESCE(g.descripcion, 'GRAT') as codigo,
        g.estado as estado,
        NULL AS "subType"
      FROM gratificaciones g
      WHERE g.usuario_id = ?
      `
        : '';

      const horasExtrasSql = hasHorasExtras
        ? `
      UNION ALL
      SELECT
        CAST('hora_extra' AS text) as type,
        CAST(he.id_hora_extra AS text) as id,
        he.fecha_crea as date,
        he.total as amount,
        (CAST(COALESCE(he.hora, 0) AS text) || CAST(' HRS' AS text)) as codigo,
        he.estado as estado,
        NULL AS "subType"
      FROM horas_extras he
      WHERE he.usuario_id = ?
      `
        : '';

      const params: Array<string | number> = [userId, userId, userId, userId, userId];
      if (hasHorasExtras) params.push(userId);
      if (hasGratificaciones) params.push(userId);

      let whereClause = '';
      if (startDate && endDate) {
        whereClause = 'WHERE date >= ? AND date <= ?';
        params.push(startDate, endDate);
      }

      return await query(
        `
      SELECT *
      FROM (
        SELECT
          'servicio' as type,
          CAST(s.id_servicio AS text) as id,
          s.fecha_crea as date,
          s.total as amount,
          s.codigo as codigo,
          s.estado as estado,
          NULL AS "subType"
        FROM servicios s
        INNER JOIN detalle_servicios ds ON s.id_servicio = ds.servicio_id
        WHERE ds.usuario_id = ?

        UNION ALL

        SELECT
          'comision' as type,
          CAST(dc.id_detalle_comision AS text) as id,
          dc.fecha_crea as date,
          dc.comision as amount,
          COALESCE(v.codigo, s.codigo, 'COMM') as codigo,
          dc.estado as estado,
          CASE
            WHEN c.venta_id IS NOT NULL AND c.venta_id IS NOT NULL THEN 'venta'
            WHEN c.servicio_id IS NOT NULL AND c.servicio_id IS NOT NULL THEN 'servicio'
            ELSE NULL
          END AS "subType"
        FROM detalle_comisiones dc
        LEFT JOIN comisiones c ON c.id_comision = dc.comision_id
        LEFT JOIN ventas v ON v.id_venta = c.venta_id
        LEFT JOIN servicios s ON s.id_servicio = c.servicio_id
        WHERE dc.usuario_id = ?

        UNION ALL

        SELECT
          'propina' as type,
          CAST(dp.id_detalle_propina AS text) as id,
          p.fecha_crea as date,
          dp.monto as amount,
          COALESCE(v.codigo, 'TIPS') as codigo,
          p.estado as estado,
          'venta' AS "subType"
        FROM detalle_propinas dp
        INNER JOIN propinas p ON p.id_propina = dp.propina_id
        LEFT JOIN ventas v ON v.id_venta = p.venta_id
        WHERE dp.usuario_id = ?

        UNION ALL

        SELECT
          'asistencia' as type,
          CAST(a.id_asistencia AS text) as id,
          (a.fecha + COALESCE(a.hora, TIME '00:00:00')) as date,
          (COALESCE(u.sueldo, 0) - COALESCE(u.aporte, 0)) as amount,
          'ASIS' as codigo,
          a.estado as estado,
          NULL AS "subType"
        FROM asistencias a
        INNER JOIN usuarios u ON u.id_usuario = a.usuario_id
        WHERE a.usuario_id = ?

        UNION ALL

        SELECT
          'anticipo' as type,
          CAST(a.id_anticipo AS text) as id,
          a.fecha_crea as date,
          a.monto as amount,
          'ANT' as codigo,
          a.estado as estado,
          NULL AS "subType"
        FROM anticipos a
        WHERE a.usuario_id = ?
        ${horasExtrasSql}
        ${gratificacionesSql}
      ) events
      ${whereClause}
      ORDER BY date DESC
      LIMIT 250
    `,
        params
      );
    } catch (err) {
      logger.error('[EventQueries] Error en getUserEvents:', { userId, err });
      throw new DatabaseError(`Error al obtener eventos del usuario ${userId}`, err);
    }
  }

  static async getEventDetail(id: string, type: string) {
    try {
      switch (type) {
        case 'propina':
          return await this.getPropinaDetail(id);
        case 'comision':
          return await this.getComisionDetail(id);
        case 'asistencia':
          return await this.getAsistenciaDetail(id);
        case 'anticipo':
          return await this.getAnticipoDetail(id);
        case 'servicio':
          return await this.getServicioDetail(id);
        case 'venta':
          return await this.getVentaDetail(id);
        case 'gratificacion':
          return await this.getGratificacionDetail(id);
        case 'hora_extra':
          return await this.getHoraExtraDetail(id);
        default:
          throw new Error(`Tipo de evento no soportado: ${type}`);
      }
    } catch (err) {
      logger.error('[EventQueries] Error en getEventDetail:', { id, type, err });
      throw new DatabaseError(`Error al obtener detalle de evento ${id} (${type})`, err);
    }
  }

  static async getPropinaDetail(id: string) {
    try {
      const detalPropina = await query<PropinaDetailRow[]>(
        `
      SELECT
        dp.id_detalle_propina,
        dp.monto,
        dp.estado,
        dp.fecha_crea,
        dp.usuario_id,
        p.id_propina,
        p.propina as monto_total,
        p.estado as estado_propina,
        p.fecha_crea as fecha_crea_propina,
        p.venta_id,
        v.codigo as codigo_venta,
        v.fecha_crea as fecha_venta,
        v.total as total_venta,
        v.metodo_pago,
        v.estado as estado_venta,
        v.habitacion_id,
        h.nombre as habitacion_nombre,
        cajero_u.nick as cajero_nick,
        cajero_u.nombre as cajero_nombre
      FROM detalle_propinas dp
      INNER JOIN propinas p ON p.id_propina = dp.propina_id
      LEFT JOIN ventas v ON v.id_venta = p.venta_id
      LEFT JOIN habitaciones h ON h.id_habitacion = v.habitacion_id
      LEFT JOIN usuarios cajero_u ON cajero_u.id_usuario = v.created_by
      WHERE dp.id_detalle_propina = ?
    `,
        [id]
      );

      if (detalPropina.length === 0) {
        return null;
      }

      const dp = detalPropina[0];

      const usuario = await query<UsuarioBasico[]>(
        `
      SELECT u.id_usuario, u.nick, u.nombre, u.apellido, u.foto
      FROM usuarios u WHERE u.id_usuario = ?
    `,
        [dp.usuario_id]
      );

      let garzon = null;
      if (dp.venta_id) {
        const garzonData = await query<UsuarioBasico[]>(
          `
        SELECT u.id_usuario, u.nick, u.nombre, u.apellido
        FROM detalle_ventas dv
        INNER JOIN usuarios u ON u.id_usuario = dv.hostess_id
        WHERE dv.venta_id = ? LIMIT 1
      `,
          [dp.venta_id]
        );
        if (garzonData.length > 0) garzon = garzonData[0];
      }

      let detalles: DetalleVentaRow[] = [];
      if (dp.venta_id) {
        detalles = await query<DetalleVentaRow[]>(
          `
        SELECT dv.cantidad, dv.sub_total as subtotal, p.nombre as producto_nombre
        FROM detalle_ventas dv
        INNER JOIN productos p ON p.id_producto = dv.producto_id
        WHERE dv.venta_id = ?
      `,
          [dp.venta_id]
        );
      }

      let propinas_detalle: PropinaDetalleRow[] = [];
      if (dp.venta_id) {
        propinas_detalle = await query<PropinaDetalleRow[]>(
          `
        SELECT dp2.monto, u.id_usuario, u.nick, u.nombre, u.apellido
        FROM detalle_propinas dp2
        INNER JOIN propinas p2 ON p2.id_propina = dp2.propina_id
        INNER JOIN usuarios u ON u.id_usuario = dp2.usuario_id
        WHERE p2.venta_id = ?
      `,
          [dp.venta_id]
        );
      }

      let tiempo = null;
      if (dp.venta_id) {
        const tiempoData = await query<Array<{ minutos: number | null }>>(
          `SELECT tiempo as minutos FROM servicios WHERE id_servicio = ?`,
          [dp.venta_id]
        );
        if (tiempoData.length > 0 && tiempoData[0].minutos) {
          tiempo = tiempoData[0].minutos;
        }
      }

      return {
        tipo: 'propina',
        monto: dp.monto,

        usuario_nick: usuario[0]?.nick,
        usuario_nombre: usuario[0]?.nombre,

        habitacion_nombre: dp.habitacion_nombre,
        codigo: dp.codigo_venta,
        tiempo: tiempo,

        garzon_nick: garzon?.nick,
        garzon_nombre: garzon?.nombre,

        cajero_nick: dp.cajero_nick,
        cajero_nombre: dp.cajero_nombre,

        detalles: detalles,

        propinas_detalle: propinas_detalle,

        anfitrionas: propinas_detalle.map((p: PropinaDetalleRow) => ({
          nick: p.nick,
          nombre: p.nombre,
          comision: p.monto
        }))
      };
    } catch (err) {
      logger.error('[EventQueries] Error en getPropinaDetail:', { id, err });
      throw new DatabaseError(`Error al obtener detalle de propina ${id}`, err);
    }
  }

  static async getComisionDetail(id: string) {
    try {
      const detalComision = await query<ComisionDetailRow[]>(
        `
      SELECT
        dc.id_detalle_comision,
        dc.comision as comision,
        dc.estado,
        dc.fecha_crea,
        dc.usuario_id,
        c.id_comision,
        c.monto as monto_total,
        c.estado as estado_comision,
        c.venta_id,
        c.servicio_id,
        v.codigo as codigo_venta,
        v.fecha_crea as fecha_venta,
        v.total as total_venta,
        v.habitacion_id,
        h.nombre as habitacion_nombre,
        s.codigo as codigo_servicio,
        s.fecha_crea as fecha_servicio,
        s.total as total_servicio,
        s.estado as estado_servicio,
        s.tiempo,
        cajero_u.nick as cajero_nick,
        cajero_u.nombre as cajero_nombre
      FROM detalle_comisiones dc
      INNER JOIN comisiones c ON c.id_comision = dc.comision_id
      LEFT JOIN ventas v ON v.id_venta = c.venta_id
      LEFT JOIN habitaciones h ON h.id_habitacion = v.habitacion_id
      LEFT JOIN servicios s ON s.id_servicio = c.servicio_id
      LEFT JOIN usuarios cajero_u ON cajero_u.id_usuario = v.created_by
      WHERE dc.id_detalle_comision = ?
    `,
        [id]
      );

      if (detalComision.length === 0) {
        return null;
      }

      const dc = detalComision[0];

      const usuario = await query<UsuarioBasico[]>(
        `
      SELECT u.id_usuario, u.nick, u.nombre, u.apellido, u.foto
      FROM usuarios u WHERE u.id_usuario = ?
    `,
        [dc.usuario_id]
      );

      const esVenta = !!dc.venta_id;
      const esServicio = !!dc.servicio_id;

      let garzon = null;
      if (esVenta) {
        const garzonData = await query<UsuarioBasico[]>(
          `
        SELECT u.id_usuario, u.nick, u.nombre, u.apellido
        FROM detalle_ventas dv
        INNER JOIN usuarios u ON u.id_usuario = dv.hostess_id
        WHERE dv.venta_id = ? LIMIT 1
      `,
          [dc.venta_id]
        );
        if (garzonData.length > 0) garzon = garzonData[0];
      }

      let tiempo = null;
      if (esServicio && dc.tiempo) {
        tiempo = dc.tiempo;
      }

      let detalles: DetalleVentaRow[] = [];
      if (esVenta) {
        detalles = await query<DetalleVentaRow[]>(
          `
        SELECT dv.cantidad, dv.sub_total as subtotal, p.nombre as producto_nombre
        FROM detalle_ventas dv
        INNER JOIN productos p ON p.id_producto = dv.producto_id
        WHERE dv.venta_id = ?
      `,
          [dc.venta_id]
        );
      }

      return {
        tipo: 'comision',
        monto: dc.comision,

        usuario_nick: usuario[0]?.nick,
        usuario_nombre: usuario[0]?.nombre,

        habitacion_nombre: esVenta ? dc.habitacion_nombre : null,
        codigo: esVenta ? dc.codigo_venta : dc.codigo_servicio,
        tiempo: tiempo,
        subType: esVenta ? 'venta' : esServicio ? 'servicio' : null,

        garzon_nick: garzon?.nick,
        garzon_nombre: garzon?.nombre,

        cajero_nick: dc.cajero_nick,
        cajero_nombre: dc.cajero_nombre,

        detalles: detalles
      };
    } catch (err) {
      logger.error('[EventQueries] Error en getComisionDetail:', { id, err });
      throw new DatabaseError(`Error al obtener detalle de comisión ${id}`, err);
    }
  }

  static async getAsistenciaDetail(id: string) {
    try {
      const asistencia = await query<AsistenciaDetailRow[]>(
        `
      SELECT
        a.id_asistencia,
        a.fecha,
        a.hora,
        a.estado,
        u.id_usuario,
        u.nick,
        u.nombre,
        u.apellido,
        u.foto,
        u.sueldo,
        u.aporte,
        r.nombre as rol
      FROM asistencias a
      INNER JOIN usuarios u ON u.id_usuario = a.usuario_id
      LEFT JOIN roles r ON r.id_rol = u.rol_id
      WHERE a.id_asistencia = ?
    `,
        [id]
      );

      if (asistencia.length === 0) {
        return null;
      }

      const a = asistencia[0];

      const liquiSueldo = Number(a.sueldo || 0);
      const liquiAporte = Number(a.aporte || 0);

      const semanasData = await query<Array<{ semanas: number | null }>>(
        `
      SELECT COUNT(DISTINCT TO_CHAR(fecha, 'IYYY-IW')) as semanas
      FROM asistencias
      WHERE usuario_id = ? AND fecha <= ? AND estado = 1 AND (EXTRACT(DOW FROM fecha)::integer + 1) IN (3,4,5,6,7,1)
    `,
        [a.id_usuario, a.fecha]
      );

      const semanas = semanasData.length > 0 ? Number(semanasData[0]?.semanas || 0) : 0;
      const descuento_total = 0;
      const neto = liquiSueldo - liquiAporte - descuento_total;

      return {
        tipo: 'asistencia',

        usuario_nick: a.nick,
        usuario_nombre: a.nombre,

        sueldo: liquiSueldo,
        aporte: liquiAporte,
        descuento_total: descuento_total,
        semanas_con_descuento: semanas,
        neto: neto,

        fecha: a.fecha,
        hora: a.hora
      };
    } catch (err) {
      logger.error('[EventQueries] Error en getAsistenciaDetail:', { id, err });
      throw new DatabaseError(`Error al obtener detalle de asistencia ${id}`, err);
    }
  }

  static async getAnticipoDetail(id: string) {
    try {
      const anticipo = await query<AnticipoDetailRow[]>(
        `
      SELECT
        a.id_anticipo,
        a.monto,
        a.estado,
        a.fecha_crea,
        a.fecha_mod,
        a.motivo,
        a.usuario_id,
        u.id_usuario,
        u.nick,
        u.nombre,
        u.apellido,
        u.foto
      FROM anticipos a
      INNER JOIN usuarios u ON u.id_usuario = a.usuario_id
      WHERE a.id_anticipo = ?
    `,
        [id]
      );

      if (anticipo.length === 0) {
        return null;
      }

      const a = anticipo[0];

      const historial = await query<HistorialAnticipoRow[]>(
        `
      SELECT h.accion, h.fecha_crea, u.nick as usuario_accion_nick
      FROM anticipo_historial h
      LEFT JOIN usuarios u ON u.id_usuario = h.usuario_id
      WHERE h.anticipo_id = ?
      ORDER BY h.fecha_crea DESC
    `,
        [id]
      );

      return {
        tipo: 'anticipo',

        solicitante_nick: a.nick,
        solicitante_nombre: a.nombre,

        monto: a.monto,
        estado: a.estado,
        observacion: a.motivo,

        fecha: a.fecha_crea,

        historial: historial
      };
    } catch (err) {
      logger.error('[EventQueries] Error en getAnticipoDetail:', { id, err });
      throw new DatabaseError(`Error al obtener detalle de anticipo ${id}`, err);
    }
  }

  static async getServicioDetail(id: string) {
    try {
      const servicio = await query<ServicioDetailRow[]>(
        `
      SELECT
        s.id_servicio,
        s.codigo,
        s.fecha_crea,
        s.total,
        s.metodo_pago,
        s.estado,
        s.habitacion_id,
        s.cliente_id,
        s.tiempo,
        h.nombre as habitacion_nombre,
        c.nombre as cliente_nombre,
        c.telefono as cliente_telefono,
        cajero_u.nick as cajero_nick,
        cajero_u.nombre as cajero_nombre
      FROM servicios s
      LEFT JOIN habitaciones h ON h.id_habitacion = s.habitacion_id
      LEFT JOIN clientes c ON c.id_cliente = s.cliente_id
      LEFT JOIN usuarios cajero_u ON cajero_u.id_usuario = s.created_by
      WHERE s.id_servicio = ?
    `,
        [id]
      );

      if (servicio.length === 0) {
        return null;
      }

      const s = servicio[0];

      let tiempo = s.tiempo || null;

      const comisiones = await query<ComisionServicioRow[]>(
        `
      SELECT
        dc.comision as comision,
        u.id_usuario,
        u.nick,
        u.nombre,
        u.apellido
      FROM detalle_comisiones dc
      INNER JOIN comisiones c ON c.id_comision = dc.comision_id
      INNER JOIN usuarios u ON u.id_usuario = dc.usuario_id
      WHERE c.servicio_id = ?
    `,
        [id]
      );
      const anfitrionas = comisiones;

      let garzon: UsuarioBasico | null = null;
      const garzonData = await query<UsuarioBasico[]>(
        `
      SELECT u.id_usuario, u.nick, u.nombre, u.apellido
      FROM detalle_servicios ds
      INNER JOIN usuarios u ON u.id_usuario = ds.usuario_id
      WHERE ds.servicio_id = ? LIMIT 1
    `,
        [id]
      );
      if (garzonData.length > 0) garzon = garzonData[0];

      return {
        tipo: 'servicio',
        monto: s.total,

        codigo: s.codigo,
        tiempo: tiempo,
        habitacion_nombre: s.habitacion_nombre,
        cliente_nombre: s.cliente_nombre || 'Sin cliente',

        garzon_nick: garzon?.nick,
        garzon_nombre: garzon?.nombre,

        cajero_nick: s.cajero_nick,
        cajero_nombre: s.cajero_nombre,

        detalles: anfitrionas.map((a: ComisionServicioRow) => ({
          amount: a.comision,
          producto_nombre: a.nick || `${a.nombre} ${a.apellido}`.trim(),
          subtotal: a.comision
        })),

        anfitrionas: anfitrionas,

        propinas_detalle: comisiones.map((c: ComisionServicioRow) => ({
          monto: c.comision,
          nick: c.nick,
          nombre: c.nombre,
          apellido: c.apellido
        }))
      };
    } catch (err) {
      logger.error('[EventQueries] Error en getServicioDetail:', { id, err });
      throw new DatabaseError(`Error al obtener detalle de servicio ${id}`, err);
    }
  }

  static async getVentaDetail(id: string) {
    try {
      const venta = await query<VentaDetailRow[]>(
        `
      SELECT
        v.id_venta,
        v.codigo,
        v.fecha_crea,
        v.total,
        v.propina,
        v.total_comision,
        v.metodo_pago,
        v.estado,
        v.habitacion_id,
        v.cliente_id,
        h.nombre as habitacion_nombre,
        c.nombre as cliente_nombre,
        c.telefono as cliente_telefono,
        cajero_u.nick as cajero_nick,
        cajero_u.nombre as cajero_nombre
      FROM ventas v
      LEFT JOIN habitaciones h ON h.id_habitacion = v.habitacion_id
      LEFT JOIN clientes c ON c.id_cliente = v.cliente_id
      LEFT JOIN usuarios cajero_u ON cajero_u.id_usuario = v.created_by
      WHERE v.id_venta = ?
    `,
        [id]
      );

      if (venta.length === 0) {
        return null;
      }

      const v = venta[0];

      const productos = await query<DetalleVentaRow[]>(
        `
      SELECT
        dv.cantidad,
        dv.sub_total,
        p.nombre as producto_nombre
      FROM detalle_ventas dv
      INNER JOIN productos p ON p.id_producto = dv.producto_id
      WHERE dv.venta_id = ?
    `,
        [id]
      );

      const comisiones = await query<ComisionServicioRow[]>(
        `
      SELECT
        dc.comision as comision,
        u.id_usuario,
        u.nick,
        u.nombre,
        u.apellido
      FROM detalle_comisiones dc
      INNER JOIN comisiones c ON c.id_comision = dc.comision_id
      INNER JOIN usuarios u ON u.id_usuario = dc.usuario_id
      WHERE c.venta_id = ?
    `,
        [id]
      );

      const propinas = await query<PropinaDetalleRow[]>(
        `
      SELECT
        dp.monto,
        u.id_usuario,
        u.nick,
        u.nombre,
        u.apellido
      FROM detalle_propinas dp
      INNER JOIN propinas p ON p.id_propina = dp.propina_id
      INNER JOIN usuarios u ON u.id_usuario = dp.usuario_id
      WHERE p.venta_id = ?
    `,
        [id]
      );

      let garzon: UsuarioBasico | null = null;
      const garzonData = await query<UsuarioBasico[]>(
        `
      SELECT u.id_usuario, u.nick, u.nombre, u.apellido
      FROM detalle_ventas dv
      INNER JOIN usuarios u ON u.id_usuario = dv.hostess_id
      WHERE dv.venta_id = ? LIMIT 1
    `,
        [id]
      );
      if (garzonData.length > 0) garzon = garzonData[0];

      const anfitrionas = await query<ComisionServicioRow[]>(
        `
      SELECT u.id_usuario, u.nick, u.nombre, u.apellido, dc.comision as comision
      FROM detalle_comisiones dc
      INNER JOIN comisiones c ON c.id_comision = dc.comision_id
      INNER JOIN usuarios u ON u.id_usuario = dc.usuario_id
      WHERE c.venta_id = ?
    `,
        [id]
      );

      let tiempo: number | null = null;
      const tiempoData = await query<Array<{ minutos: number | null }>>(
        `SELECT s.tiempo as minutos
      FROM servicios s
      INNER JOIN ventas v2 ON v2.pedido_id = s.id_servicio
      WHERE v2.id_venta = ?
    `,
        [id]
      );
      if (tiempoData.length > 0 && tiempoData[0].minutos) {
        tiempo = tiempoData[0].minutos;
      }

      return {
        tipo: 'venta',
        monto: v.total,

        codigo: v.codigo,
        tiempo: tiempo,
        habitacion_nombre: v.habitacion_nombre,
        cliente_nombre: v.cliente_nombre || 'Sin cliente',

        garzon_nick: garzon?.nick,
        garzon_nombre: garzon?.nombre,

        cajero_nick: v.cajero_nick,
        cajero_nombre: v.cajero_nombre,

        detalles: productos.map((p: DetalleVentaRow) => ({
          cantidad: p.cantidad,
          producto_nombre: p.producto_nombre,
          subtotal: p.sub_total
        })),

        anfitrionas: anfitrionas,

        propinas_detalle: propinas.map((p: PropinaDetalleRow) => ({
          monto: p.monto,
          nick: p.nick,
          nombre: p.nombre,
          apellido: p.apellido
        }))
      };
    } catch (err) {
      logger.error('[EventQueries] Error en getVentaDetail:', { id, err });
      throw new DatabaseError(`Error al obtener detalle de venta ${id}`, err);
    }
  }

  static async getGratificacionDetail(id: string) {
    try {
      const gratificacion = await query<GratificacionDetailRow[]>(
        `
      SELECT
        g.id,
        g.monto,
        g.descripcion,
        g.estado,
        g.fecha_crea,
        g.usuario_id,
        u.nick,
        u.nombre,
        u.apellido,
        u.foto
      FROM gratificaciones g
      INNER JOIN usuarios u ON u.id_usuario = g.usuario_id
      WHERE g.id = ?
    `,
        [id]
      );

      if (gratificacion.length === 0) {
        return null;
      }

      const g = gratificacion[0];

      return {
        tipo: 'gratificacion',
        monto: g.monto,
        descripcion: g.descripcion,
        usuario_nick: g.nick,
        usuario_nombre: g.nombre,
        fecha: g.fecha_crea,
        estado: g.estado
      };
    } catch (err) {
      logger.error('[EventQueries] Error en getGratificacionDetail:', { id, err });
      throw new DatabaseError(`Error al obtener detalle de gratificación ${id}`, err);
    }
  }

  static async getHoraExtraDetail(id: string) {
    try {
      const horaExtra = await query<HoraExtraDetailRow[]>(
        `
      SELECT
        he.id_hora_extra,
        he.hora,
        he.total,
        he.estado,
        he.fecha_crea,
        he.usuario_id,
        u.nick,
        u.nombre,
        u.apellido,
        u.foto
      FROM horas_extras he
      INNER JOIN usuarios u ON u.id_usuario = he.usuario_id
      WHERE he.id_hora_extra = ?
    `,
        [id]
      );

      if (horaExtra.length === 0) {
        return null;
      }

      const he = horaExtra[0];

      return {
        tipo: 'hora_extra',
        monto: he.total,
        hora: he.hora,
        usuario_nick: he.nick,
        usuario_nombre: he.nombre,
        fecha: he.fecha_crea,
        estado: he.estado
      };
    } catch (err) {
      logger.error('[EventQueries] Error en getHoraExtraDetail:', { id, err });
      throw new DatabaseError(`Error al obtener detalle de hora extra ${id}`, err);
    }
  }
}
