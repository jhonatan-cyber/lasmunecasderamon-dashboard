import { query } from '@/lib/database/db';
import { type StatsGeneralType } from '@/lib/business/schemas';
import { getNowInBusinessTimezone } from '@/lib/business/timezoneService';
import { NotFoundError, DatabaseError } from '@/lib/errors/errors';
import { logger } from '@/lib/utils/logger';
import { TimerRepository } from '../TimerRepository';
import { ServiceRequestRepository } from '../ServiceRequestRepository';
import { RoomRepository } from '../RoomRepository';
import { OrderRepository } from '../OrderRepository';
import { buildDashboardInsights, buildCajaStatsResult } from './index';
import type {
  CountRow,
  ComparisonRow,
  RankingRow,
  ActivityRow,
  HabitacionStatsRow,
  CajaRow,
  CajaStatsRow,
  GeneralCajaRow,
  TotalRow,
  RoleRow,
  UserRoleRow,
  SalesByMonthRow,
  SalesByWeekRow
} from '../types';

export class StatsQueries {
  static async getDashboardAlerts(options?: { timers?: any[]; rooms?: any[] }) {
    try {
      const { timers: preloadedTimers, rooms: preloadedRooms } = options || {};

      const [cashRegisterRows, pendingOrdersRows, rooms, pendingServiceRequests, timers] =
        await Promise.all([
          query<any[]>(
            `
          SELECT COUNT(*) as total
          FROM cajas
          WHERE estado = 1
        `
          ),
          query<any[]>(
            `
          SELECT COUNT(*) as total
          FROM pedidos
          WHERE estado = 1
        `
          ),
          preloadedRooms ? Promise.resolve(preloadedRooms) : RoomRepository.getAll(),
          ServiceRequestRepository.getPendingCount(),
          preloadedTimers ? Promise.resolve(preloadedTimers) : TimerRepository.getActive()
        ]);

      const activeCaja = cashRegisterRows[0]?.total || 0;
      const pendingOrders = pendingOrdersRows[0]?.total || 0;
      const occupiedRooms = rooms.filter(room => Number(room.status) === 2).length;
      const freeRooms = rooms.filter(room => Number(room.status) === 1).length;
      const totalRooms = rooms.length;
      const activeServices = timers.filter(timer => timer.tipoTransaccion !== 'pedido').length;
      const expiringServices = timers.filter(timer => {
        const remaining = Number(timer.remainingTime || 0);
        return remaining > 0 && remaining <= 15 * 60;
      }).length;

      return {
        alerts: {
          activeCaja: activeCaja > 0,
          pendingOrders: pendingOrders > 0,
          occupiedRooms: occupiedRooms > 0,
          pendingServiceRequests: pendingServiceRequests > 0,
          expiringServices: expiringServices > 0
        },
        summary: {
          occupiedRooms,
          freeRooms,
          totalRooms,
          activeServices,
          expiringServices,
          pendingOrders,
          pendingServiceRequests
        }
      };
    } catch (err) {
      logger.error('[StatsQueries] Error en getDashboardAlerts:', { err });
      throw new DatabaseError('Error al obtener alertas del dashboard', err);
    }
  }

  static async getDashboardPendingItems() {
    try {
      const [orders, serviceRequests] = await Promise.all([
        this.getPendingOrders(5),
        ServiceRequestRepository.getPendingServiceRequests(5)
      ]);

      return {
        orders,
        serviceRequests
      };
    } catch (err) {
      logger.error('[StatsQueries] Error en getDashboardPendingItems:', { err });
      throw new DatabaseError('Error al obtener elementos pendientes del dashboard', err);
    }
  }

  /**
   * Helper: query comparativa (hoy vs ayer, esta semana vs anterior).
   * Reutilizado por getDashboardInsights y getDashboardComposite.
   */
  private static async runComparisonQuery(now: string, yesterday: string) {
    try {
      return await query<any[]>(
        `SELECT
          COALESCE((SELECT SUM(v.total - COALESCE(v.cargo_tarjeta, 0)) FROM ventas v WHERE v.estado IN (1, 2) AND v.fecha_crea >= DATE(?) AND v.fecha_crea < (CAST(DATE(?) AS timestamp) + make_interval(days => CAST(1 AS integer)))), 0) AS sales_today,
          COALESCE((SELECT SUM(v.total - COALESCE(v.cargo_tarjeta, 0)) FROM ventas v WHERE v.estado IN (1, 2) AND v.fecha_crea >= DATE(?) AND v.fecha_crea < (CAST(DATE(?) AS timestamp) + make_interval(days => CAST(1 AS integer)))), 0) AS sales_yesterday,
          COALESCE((SELECT SUM(s.total) FROM servicios s WHERE s.estado IN (1, 2) AND s.fecha_crea >= DATE(?) AND s.fecha_crea < (CAST(DATE(?) AS timestamp) + make_interval(days => CAST(1 AS integer)))), 0) AS services_today,
          COALESCE((SELECT SUM(s.total) FROM servicios s WHERE s.estado IN (1, 2) AND s.fecha_crea >= DATE(?) AND s.fecha_crea < (CAST(DATE(?) AS timestamp) + make_interval(days => CAST(1 AS integer)))), 0) AS services_yesterday,
          COALESCE((SELECT COUNT(*) FROM ventas v WHERE v.estado IN (1, 2) AND TO_CHAR(v.fecha_crea, 'IYYY-IW') = TO_CHAR(DATE(?), 'IYYY-IW')), 0) AS sales_count_week,
          COALESCE((SELECT COUNT(*) FROM ventas v WHERE v.estado IN (1, 2) AND TO_CHAR(v.fecha_crea, 'IYYY-IW') = TO_CHAR((CAST(DATE(?) AS timestamp) - make_interval(days => CAST(7 AS integer))), 'IYYY-IW')), 0) AS sales_count_previous_week,
          COALESCE((SELECT SUM(v.total - COALESCE(v.cargo_tarjeta, 0)) FROM ventas v WHERE v.estado IN (1, 2) AND TO_CHAR(v.fecha_crea, 'IYYY-IW') = TO_CHAR(DATE(?), 'IYYY-IW')), 0) AS sales_total_week,
          COALESCE((SELECT SUM(v.total - COALESCE(v.cargo_tarjeta, 0)) FROM ventas v WHERE v.estado IN (1, 2) AND TO_CHAR(v.fecha_crea, 'IYYY-IW') = TO_CHAR((CAST(DATE(?) AS timestamp) - make_interval(days => CAST(7 AS integer))), 'IYYY-IW')), 0) AS sales_total_previous_week,
          COALESCE((SELECT SUM(v.total - COALESCE(v.cargo_tarjeta, 0)) FROM ventas v WHERE v.estado IN (1, 2) AND v.fecha_crea >= DATE(?) AND v.fecha_crea < (CAST(DATE(?) AS timestamp) + make_interval(days => CAST(1 AS integer))) AND CAST(v.fecha_crea AS time) <= CAST(? AS time)), 0) AS sales_same_time_today,
          COALESCE((SELECT SUM(v.total - COALESCE(v.cargo_tarjeta, 0)) FROM ventas v WHERE v.estado IN (1, 2) AND v.fecha_crea >= DATE(?) AND v.fecha_crea < (CAST(DATE(?) AS timestamp) + make_interval(days => CAST(1 AS integer))) AND CAST(v.fecha_crea AS time) <= CAST(? AS time)), 0) AS sales_same_time_yesterday
        `,
        [
          now,
          now,
          yesterday,
          yesterday,
          now,
          now,
          yesterday,
          yesterday,
          now,
          now,
          now,
          now,
          now,
          now,
          now,
          yesterday,
          yesterday,
          now
        ]
      );
    } catch (err) {
      logger.error('[StatsQueries] Error en runComparisonQuery:', { err });
      throw new DatabaseError('Error al ejecutar query comparativa', err);
    }
  }

  /**
   * Helper: query de ranking (productos, habitaciones, staff).
   * Reutilizado por getDashboardInsights y getDashboardComposite.
   */
  private static async runRankingQuery(now: string, yesterday: string) {
    try {
      return await query<any[]>(
        `SELECT * FROM (
          SELECT 'product' AS ranking_type, p.nombre AS item_name, SUM(dv.cantidad) AS primary_value, SUM(dv.sub_total) AS secondary_value
          FROM detalle_ventas dv
          INNER JOIN ventas v ON v.id_venta = dv.venta_id
          INNER JOIN productos p ON p.id_producto = dv.producto_id
          WHERE v.estado IN (1, 2) AND v.fecha_crea >= DATE(?) AND v.fecha_crea < (CAST(DATE(?) AS timestamp) + make_interval(days => CAST(1 AS integer)))
          GROUP BY p.id_producto, p.nombre
          UNION ALL
          SELECT 'room' AS ranking_type, room_activity.item_name, room_activity.operations_count AS primary_value, room_activity.total_generated AS secondary_value
          FROM (
            SELECT h.nombre AS item_name, COUNT(*) AS operations_count, SUM(activity.total) AS total_generated
            FROM (
              SELECT habitacion_id, total FROM servicios WHERE estado IN (1, 2) AND fecha_crea >= DATE(?) AND fecha_crea < (CAST(DATE(?) AS timestamp) + make_interval(days => CAST(1 AS integer)))
              UNION ALL
              SELECT habitacion_id, total FROM ventas WHERE estado IN (1, 2) AND fecha_crea >= DATE(?) AND fecha_crea < (CAST(DATE(?) AS timestamp) + make_interval(days => CAST(1 AS integer)))
            ) activity
            INNER JOIN habitaciones h ON h.id_habitacion = activity.habitacion_id
            GROUP BY h.id_habitacion, h.nombre
          ) room_activity
          UNION ALL
          SELECT 'staff' AS ranking_type, staff_activity.item_name, staff_activity.operations_count AS primary_value, staff_activity.total_generated AS secondary_value
          FROM (
            SELECT (CAST(u.nombre AS text) || CAST(' ' AS text) || CAST(u.apellido AS text)) AS item_name, COUNT(*) AS operations_count, SUM(staff_source.total) AS total_generated
            FROM (
              SELECT ds.usuario_id, s.total FROM detalle_servicios ds INNER JOIN servicios s ON s.id_servicio = ds.servicio_id WHERE s.estado IN (1, 2) AND s.fecha_crea >= DATE(?) AND s.fecha_crea < (CAST(DATE(?) AS timestamp) + make_interval(days => CAST(1 AS integer)))
              UNION ALL
              SELECT vu.usuario_id, v.total FROM ventas_usuarios vu INNER JOIN ventas v ON v.id_venta = vu.venta_id WHERE v.estado IN (1, 2) AND v.fecha_crea >= DATE(?) AND v.fecha_crea < (CAST(DATE(?) AS timestamp) + make_interval(days => CAST(1 AS integer)))
            ) staff_source
            INNER JOIN usuarios u ON u.id_usuario = staff_source.usuario_id
            GROUP BY u.id_usuario, u.nombre, u.apellido
          ) staff_activity
        ) rankings WHERE secondary_value > 0 OR primary_value > 0 ORDER BY ranking_type ASC, secondary_value DESC, primary_value DESC        `,
        [now, now, now, now, now, now, now, now, now, now]
      );
    } catch (err) {
      logger.error('[StatsQueries] Error en runRankingQuery:', { err });
      throw new DatabaseError('Error al ejecutar query de ranking', err);
    }
  }

  static async getDashboardInsights() {
    try {
      const now = getNowInBusinessTimezone();
      const yesterday = getNowInBusinessTimezone(Date.now() - 24 * 60 * 60 * 1000);
      const hoursElapsed = Number(now.slice(11, 13) || 0);
      const minutesElapsed = Number(now.slice(14, 16) || 0);
      const elapsedMinutesToday = Math.max(1, hoursElapsed * 60 + minutesElapsed);

      // OPTIMIZACIÓN: Las alerts ya incluyen activeServices y expiringServices del TimerRepository.
      // No necesitamos llamar a TimerRepository.getActive() 3 veces — alerts.summary basta.
      // getLoggedUsers() se mantiene porque alerts no lo incluye.
      const [comparisonsRows, rankingRows, alerts, totalLoggedUsers] = await Promise.all([
        this.runComparisonQuery(now, yesterday),
        this.runRankingQuery(now, yesterday),
        this.getDashboardAlerts(),
        this.getLoggedUsers().then(
          users => users.anfitrionas.logueadas + users.garzones.logueadas + users.cajeros.logueadas
        )
      ]);

      const comparisonBase = comparisonsRows[0] || {};
      const movementToday =
        Number(comparisonBase.sales_today || 0) + Number(comparisonBase.services_today || 0);
      const movementYesterday =
        Number(comparisonBase.sales_yesterday || 0) +
        Number(comparisonBase.services_yesterday || 0);
      const occupancyRate =
        alerts.summary.totalRooms > 0
          ? Math.round((alerts.summary.occupiedRooms / alerts.summary.totalRooms) * 100)
          : 0;
      const yesterdaySalesSameTime = Number(comparisonBase.sales_same_time_yesterday || 0);
      const todaySalesSameTime = Number(comparisonBase.sales_same_time_today || 0);

      // Usar valores ya calculados por getDashboardAlerts en vez de re-consultar TimerRepository
      const servicesActive = alerts.summary.activeServices;
      const expiringServices = alerts.summary.expiringServices;

      return buildDashboardInsights({
        salesToday: comparisonBase.sales_today,
        salesYesterday: comparisonBase.sales_yesterday,
        servicesToday: comparisonBase.services_today,
        servicesYesterday: comparisonBase.services_yesterday,
        movementToday,
        movementYesterday,
        salesWeek: comparisonBase.sales_total_week,
        salesWeekPrevious: comparisonBase.sales_total_previous_week,
        operationsWeek: comparisonBase.sales_count_week,
        operationsWeekPrevious: comparisonBase.sales_count_previous_week,
        occupiedRooms: alerts.summary.occupiedRooms,
        freeRooms: alerts.summary.freeRooms,
        totalRooms: alerts.summary.totalRooms,
        occupancyRate,
        servicesActive,
        expiringServices,
        pendingOrders: alerts.summary.pendingOrders,
        pendingServiceRequests: alerts.summary.pendingServiceRequests,
        totalLoggedUsers,
        totalTeamMembers: 0,
        teamCoverageRate: 0,
        openCashRegisters: 0,
        rankingRows,
        openingAmount: 0,
        sales: 0,
        services: 0,
        tips: 0,
        advances: 0,
        returns: 0,
        withdrawals: 0,
        todaySalesSameTime,
        yesterdaySalesSameTime,
        elapsedMinutesToday
      });
    } catch (err) {
      logger.error('[StatsQueries] Error en getDashboardInsights:', { err });
      if (err instanceof NotFoundError) throw err;
      throw new DatabaseError('Error al obtener insights del dashboard', err);
    }
  }

  static async getRecentActivity(limit: number = 8) {
    try {
      const activities = await query<any[]>(
        `
      SELECT * FROM (
        SELECT 'venta' as type, id_venta as id, codigo, total as amount, fecha_crea as date, created_by as user_id, estado
        FROM ventas
        UNION ALL
        SELECT 'servicio' as type, id_servicio as id, codigo, total as amount, fecha_crea as date, created_by as user_id, estado
        FROM servicios
        UNION ALL
        SELECT 'anticipo' as type, id_anticipo as id, NULL as codigo, monto as amount, fecha_crea as date, usuario_id as user_id, estado
        FROM anticipos
        UNION ALL
        SELECT 'hora_extra' as type, id_hora_extra as id, NULL as codigo, total as amount, fecha_crea as date, usuario_id as user_id, estado
        FROM horas_extras
      ) act
      ORDER BY date DESC
      LIMIT ?
    `,
        [limit]
      );

      if (activities.length === 0) return [];

      const userIds = [...new Set(activities.map(a => a.user_id).filter(Boolean))];
      let usersMap: { [key: string]: any } = {};

      if (userIds.length > 0) {
        const placeholders = userIds.map(() => '?').join(',');
        const users = await query<any[]>(
          `SELECT id_usuario, nick, nombre, apellido, foto FROM usuarios WHERE id_usuario IN (${placeholders})`,
          userIds
        );
        users.forEach(u => {
          usersMap[String(u.id_usuario)] = u;
        });
      }

      return activities.map(act => {
        const u = usersMap[String(act.user_id)] || {};
        return {
          type: act.type,
          id: String(act.id),
          code: act.codigo || String(act.id),
          amount: Number(act.amount || 0),
          date: act.date,
          estado: Number(act.estado),
          user: {
            id: String(act.user_id),
            nick: u.nick || 'sistema',
            name: u.nombre || 'Sistema',
            avatar: u.foto || null
          }
        };
      });
    } catch (err) {
      logger.error('[StatsQueries] Error en getRecentActivity:', { err });
      throw new DatabaseError('Error al obtener actividad reciente', err);
    }
  }

  static async getHabitacionesStats(cajaId: string) {
    try {
      return await query<any[]>(
        `
      SELECT
        COALESCE(SUM(s.precio_servicio), 0) as monto_servicio,
        COALESCE(SUM(s.precio_habitacion), 0) as monto_habitacion,
        COALESCE(SUM(s.iva), 0) as monto_iva,
        COALESCE(SUM(h.comision_anfitriona), 0) as comisiones_habitacion,
        COALESCE(SUM(s.precio_servicio + s.precio_habitacion + s.iva), 0) as total_generado
      FROM servicios s
      INNER JOIN habitaciones h ON h.id_habitacion = s.habitacion_id
      WHERE s.caja_id = ? AND s.estado IN (1, 2)
    `,
        [cajaId]
      );
    } catch (err) {
      logger.error('[StatsQueries] Error en getHabitacionesStats:', { cajaId, err });
      throw new DatabaseError(
        `Error al obtener estadísticas de habitaciones para caja ${cajaId}`,
        err
      );
    }
  }

  static async getCajaGeneralStats(): Promise<any> {
    try {
      const now = getNowInBusinessTimezone();

      const cajaRows = await query<any[]>(
        `SELECT id_caja, fecha_apertura, usuario_id_apertura, monto_apertura, efectivo,
              tarjeta, transferencia, comision, anticipo, devolucion, iva,
              TRUNC(EXTRACT(EPOCH FROM (CAST(? AS timestamp) - CAST(fecha_apertura AS timestamp))) / 3600) as horas_abierta,
              TRUNC(EXTRACT(EPOCH FROM (CAST(? AS timestamp) - CAST(fecha_apertura AS timestamp))) / 60) % 60 as minutos_abierta
       FROM cajas WHERE estado = 1 ORDER BY fecha_apertura DESC LIMIT 1`,
        [now, now]
      );

      if (cajaRows.length === 0) {
        const generalData = await query<any[]>(
          `
        SELECT
          COUNT(CASE WHEN estado = 1 THEN 1 END) as cajas_abiertas,
          COUNT(CASE WHEN estado = 0 THEN 1 END) as cajas_cerradas,
          COUNT(*) as total_cajas
        FROM cajas
      `
        );
        const row = generalData[0] || {};
        return {
          cajasAbiertas: Number(row.cajas_abiertas || 0),
          cajasCerradas: Number(row.cajas_cerradas || 0),
          totalCajas: Number(row.total_cajas || 0),
          cajaActiva: null
        };
      }

      const cajaRow = cajaRows[0];
      const cajaId = cajaRow.id_caja;

      const [cajaStatsRows, withdrawalsRows, serviciosRows] = await Promise.all([
        query<any[]>(
          `SELECT
          COALESCE(SUM(v.total), 0) as total_ventas,
          COALESCE(COUNT(*), 0) as cantidad_ventas,
          COALESCE(AVG(total), 0) as promedio_venta,
          COALESCE(SUM(CASE WHEN metodo_pago = 'efectivo' THEN total ELSE 0 END), 0) as total_efectivo,
          COALESCE(SUM(CASE WHEN metodo_pago = 'tarjeta' THEN total ELSE 0 END), 0) as total_tarjeta,
          COALESCE(SUM(CASE WHEN metodo_pago = 'transferencia' THEN total ELSE 0 END), 0) as total_transferencia,
          COALESCE(SUM(v.propina), 0) as total_propina
        FROM ventas v
        WHERE v.caja_id = ? AND v.estado IN (1, 2)`,
          [cajaId]
        ),
        query<any[]>(
          `SELECT COALESCE(SUM(monto), 0) AS total FROM retiros_caja WHERE caja_id = ?`,
          [cajaId]
        ),
        query<any[]>(
          `SELECT COALESCE(COUNT(*), 0) as cantidad_servicios,
                COALESCE(SUM(total), 0) as total_servicios
         FROM servicios WHERE caja_id = ? AND estado = 1`,
          [cajaId]
        )
      ]);

      const cajaStats = cajaStatsRows[0] || {};
      const serviciosStats = serviciosRows[0] || {};
      const totalWithdrawals = Number(withdrawalsRows[0]?.total || 0);

      const balanceRow = await query<any[]>(
        `SELECT
        COALESCE(SUM(monto_apertura + efectivo + tarjeta + transferencia - COALESCE(anticipo, 0) - COALESCE(devolucion, 0)), 0) as balance_total
       FROM cajas WHERE id_caja = ?`,
        [cajaId]
      );

      const balanceTotal = Number(balanceRow[0]?.balance_total || 0) - totalWithdrawals;

      const cajaActiva = {
        id: String(cajaId),
        montoApertura: Number(cajaRow.monto_apertura || 0),
        efectivo: Number(cajaRow.efectivo || 0),
        tarjeta: Number(cajaRow.tarjeta || 0),
        transferencia: Number(cajaRow.transferencia || 0),
        anticipos: Number(cajaRow.anticipo || 0),
        devoluciones: Number(cajaRow.devolucion || 0),
        balanceCalculado: balanceTotal,
        balanceTotal: balanceTotal,
        retiros: totalWithdrawals,
        horasAbierta: Number(cajaRow.horas_abierta || 0),
        minutosAbierta: Number(cajaRow.minutos_abierta || 0)
      };

      // Shape plano: contrato real de /cashregister/status, /caja-status,
      // /caja/stats, useDashboardBusinessStats y la app móvil (hasOpenCaja).
      // Antes el query devolvía solo `cajaActiva` anidado y los endpoints
      // leían campos inexistentes (caja_id, fecha_apertura_raw...), por lo que
      // hasOpenCaja era SIEMPRE false aunque hubiera caja abierta.
      return {
        cajasAbiertas: 1,
        cajasCerradas: 0,
        totalCajas: 1,
        cajaActiva,
        caja_id: String(cajaId),
        balance_total: balanceTotal,
        total_ventas: Number(cajaStats.total_ventas || 0),
        cantidad_ventas: Number(cajaStats.cantidad_ventas || 0),
        promedio_venta: Number(cajaStats.promedio_venta || 0),
        total_servicios: Number(serviciosStats.total_servicios || 0),
        cantidad_servicios: Number(serviciosStats.cantidad_servicios || 0),
        total_efectivo: Number(cajaStats.total_efectivo || 0),
        total_tarjeta: Number(cajaStats.total_tarjeta || 0),
        total_transferencia: Number(cajaStats.total_transferencia || 0),
        total_propina: Number(cajaStats.total_propina || 0),
        total_comision: Number(cajaRow.comision || 0),
        total_iva: Number(cajaRow.iva || 0),
        monto_apertura: Number(cajaRow.monto_apertura || 0),
        efectivo_en_caja: Number(cajaRow.efectivo || 0),
        tiempo_abierta_horas: Number(cajaRow.horas_abierta || 0),
        tiempo_abierta_minutos: Number(cajaRow.minutos_abierta || 0),
        fecha_apertura_raw: cajaRow.fecha_apertura || null,
        usuario_id_apertura: cajaRow.usuario_id_apertura || null,
        retiros: totalWithdrawals
      };
    } catch (err) {
      logger.error('[StatsQueries] Error en getCajaGeneralStats:', { err });
      if (err instanceof NotFoundError) throw err;
      throw new DatabaseError('Error al obtener estadísticas generales de caja', err);
    }
  }

  static async getLoggedUsers() {
    try {
      const roles = await query<any[]>(`SELECT id_rol, nombre FROM roles`);
      const users = await query<any[]>(
        `SELECT u.id_usuario, u.nick, u.estado, u.rol_id, r.nombre as rol_nombre
       FROM usuarios u
       INNER JOIN roles r ON r.id_rol = u.rol_id`
      );

      const filterByRole = (roleName: string) => {
        const r = roles.find(role => role.nombre.toLowerCase() === roleName);
        if (!r) return { total: 0, logueadas: 0 };
        const roleUsers = users.filter(u => u.rol_id === r.id_rol);
        return {
          total: roleUsers.length,
          logueadas: roleUsers.filter(u => Number(u.estado) === 1).length
        };
      };

      return {
        anfitrionas: filterByRole('anfitriona'),
        garzones: filterByRole('garzon'),
        cajeros: filterByRole('cajero')
      };
    } catch (err) {
      logger.error('[StatsQueries] Error en getLoggedUsers:', { err });
      throw new DatabaseError('Error al obtener usuarios logueados', err);
    }
  }

  static async getSalesByMonth(offset: number = 0) {
    try {
      return await query<any[]>(
        `
      SELECT
        TO_CHAR(fecha_crea, 'YYYY-MM') as mes,
        COUNT(*) as cantidad_ventas,
        SUM(total) as total_ventas
      FROM ventas
      WHERE estado IN (1, 2)
      GROUP BY TO_CHAR(fecha_crea, 'YYYY-MM')
      ORDER BY mes DESC
      LIMIT 12 OFFSET ?
    `,
        [offset * 12]
      );
    } catch (err) {
      logger.error('[StatsQueries] Error en getSalesByMonth:', { offset, err });
      throw new DatabaseError('Error al obtener ventas por mes', err);
    }
  }

  static async getSalesByWeek(offset: number = 0) {
    try {
      const queryStr = `
      SELECT
        TO_CHAR(days.d, 'YYYY-IW') as semana,
        TO_CHAR(days.d, 'FMDay') as dia_semana,
        MIN(days.d) as fecha_inicio,
        (EXTRACT(ISODOW FROM days.d)::integer - 1) as orden,
        COALESCE(SUM(v.total), 0) as total,
        COUNT(v.id_venta) as cantidad
      FROM (
        SELECT (CAST(DATE(?) AS timestamp) - make_interval(days => CAST((t.n + ? * 7) AS integer))) as d
        FROM (
          SELECT a.N + b.N * 10 + c.N * 100 AS n
          FROM (SELECT 0 AS N UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9) a
          CROSS JOIN (SELECT 0 AS N UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9) b
          CROSS JOIN (SELECT 0 AS N UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9) c
        ) t
        WHERE t.n < 7
      ) days
      LEFT JOIN ventas v ON DATE(v.fecha_crea) = days.d AND v.estado IN (1, 2)
      GROUP BY TO_CHAR(days.d, 'YYYY-IW'), TO_CHAR(days.d, 'FMDay'), (EXTRACT(ISODOW FROM days.d)::integer - 1)
      ORDER BY semana DESC, orden ASC
    `;
      const now = getNowInBusinessTimezone();
      return await query<any[]>(queryStr, [now, offset]);
    } catch (err) {
      logger.error('[StatsQueries] Error en getSalesByWeek:', { offset, err });
      throw new DatabaseError('Error al obtener ventas por semana', err);
    }
  }

  static async getPendingOrders(limit: number) {
    try {
      const orders = await OrderRepository.getAll(20);
      return orders
        .filter(order => Number(order.estado) === 1)
        .slice(0, limit)
        .map(order => ({
          id: String(order.id),
          code: order.codigo || String(order.id),
          title: order.cliente_nombre || 'Sin cliente registrado',
          subtitle: order.mesero_nick || order.mesero_nombre || 'Sin garzón asignado',
          amount: Number(order.total || 0),
          createdAt: order.fecha_crea,
          href: '/orders',
          kind: 'order' as const
        }));
    } catch (err) {
      logger.error('[StatsQueries] Error en getPendingOrders:', { limit, err });
      throw new DatabaseError('Error al obtener pedidos pendientes', err);
    }
  }

  static async getDashboardComposite() {
    try {
      const now = getNowInBusinessTimezone();
      const yesterday = getNowInBusinessTimezone(Date.now() - 24 * 60 * 60 * 1000);
      const hoursElapsed = Number(now.slice(11, 13) || 0);
      const minutesElapsed = Number(now.slice(14, 16) || 0);
      const elapsedMinutesToday = Math.max(1, hoursElapsed * 60 + minutesElapsed);

      const cajaRows = await query<any[]>(
        `SELECT id_caja, fecha_apertura, usuario_id_apertura, monto_apertura, efectivo,
              tarjeta, transferencia, comision, anticipo, devolucion, iva,
              TRUNC(EXTRACT(EPOCH FROM (CAST(? AS timestamp) - CAST(fecha_apertura AS timestamp))) / 3600) as horas_abierta,
              TRUNC(EXTRACT(EPOCH FROM (CAST(? AS timestamp) - CAST(fecha_apertura AS timestamp))) / 60) % 60 as minutos_abierta
       FROM cajas WHERE estado = 1 ORDER BY fecha_apertura DESC LIMIT 1`,
        [now, now]
      );
      const cajaRow = cajaRows[0] || null;
      const cajaId = cajaRow?.id_caja;

      const [
        cajaStatsRows,
        comparisonsRows,
        rankingRows,
        loggedUsers,
        timers,
        rooms,
        pendingServiceRequestsCount,
        pendingOrdersResult,
        withdrawalsRows
      ] = await Promise.all([
        cajaId
          ? query<any[]>(
              `SELECT
              COALESCE(SUM(v.total), 0) as total_ventas, COUNT(v.id_venta) as cantidad_ventas,
              COALESCE(AVG(v.total), 0) as promedio_venta,
              COALESCE(SUM(CASE WHEN v.metodo_pago = 'efectivo' THEN v.total ELSE 0 END), 0) as total_ventas_efectivo,
              COALESCE(SUM(CASE WHEN v.metodo_pago = 'tarjeta' THEN v.total ELSE 0 END), 0) as total_ventas_tarjeta,
              COALESCE(SUM(CASE WHEN v.metodo_pago = 'transferencia' THEN v.total ELSE 0 END), 0) as total_ventas_transferencia,
              COALESCE(SUM(s.total), 0) as total_servicios, COUNT(s.id_servicio) as cantidad_servicios,
              COALESCE(AVG(s.total), 0) as promedio_servicio
            FROM ventas v
            LEFT JOIN servicios s ON s.caja_id = v.caja_id AND s.estado IN (1, 2)
            WHERE v.caja_id = ? AND v.estado IN (1, 2)`,
              [cajaId]
            )
          : Promise.resolve([
              {
                total_ventas: 0,
                cantidad_ventas: 0,
                promedio_venta: 0,
                total_ventas_efectivo: 0,
                total_ventas_tarjeta: 0,
                total_ventas_transferencia: 0,
                total_servicios: 0,
                cantidad_servicios: 0,
                promedio_servicio: 0
              }
            ]),

        this.runComparisonQuery(now, yesterday),

        this.runRankingQuery(now, yesterday),

        this.getLoggedUsers(),

        TimerRepository.getActive(),

        RoomRepository.getAll(),

        ServiceRequestRepository.getPendingCount(),

        query<any[]>(`SELECT COUNT(*) as total FROM pedidos WHERE estado = 1`),

        cajaId
          ? query<any[]>(
              `SELECT COALESCE(SUM(monto), 0) AS total FROM retiros_caja WHERE caja_id = ?`,
              [cajaId]
            )
          : Promise.resolve([{ total: 0 }])
      ]);

      const cajaStats = cajaStatsRows[0] || {};
      const occupiedRooms = rooms.filter(room => Number(room.status) === 2).length;
      const freeRooms = rooms.filter(room => Number(room.status) === 1).length;
      const totalRooms = rooms.length;
      const expiringServices = timers.filter(timer => {
        const remaining = Number(timer.remainingTime || 0);
        return remaining > 0 && remaining <= 15 * 60;
      }).length;

      const openCashRegisters = cajaId ? 1 : 0;
      const pendingOrders = Number(pendingOrdersResult[0]?.total || 0);

      const comparisonBase = comparisonsRows[0] || {};
      const totalLoggedUsers =
        loggedUsers.anfitrionas.logueadas +
        loggedUsers.garzones.logueadas +
        loggedUsers.cajeros.logueadas;
      const totalTeamMembers =
        loggedUsers.anfitrionas.total + loggedUsers.garzones.total + loggedUsers.cajeros.total;
      const servicesActive = timers.filter(timer => timer.tipoTransaccion !== 'pedido').length;
      const movementToday =
        Number(comparisonBase.sales_today || 0) + Number(comparisonBase.services_today || 0);
      const movementYesterday =
        Number(comparisonBase.sales_yesterday || 0) +
        Number(comparisonBase.services_yesterday || 0);
      const totalWithdrawals = Number(withdrawalsRows[0]?.total || 0);
      const occupancyRate = totalRooms > 0 ? Math.round((occupiedRooms / totalRooms) * 100) : 0;
      const teamCoverageRate =
        totalTeamMembers > 0 ? Math.round((totalLoggedUsers / totalTeamMembers) * 100) : 0;
      const projectedRevenue = Math.round((movementToday / elapsedMinutesToday) * 24 * 60);
      const yesterdaySalesSameTime = Number(comparisonBase.sales_same_time_yesterday || 0);
      const todaySalesSameTime = Number(comparisonBase.sales_same_time_today || 0);

      const insights = buildDashboardInsights({
        salesToday: comparisonBase.sales_today,
        salesYesterday: comparisonBase.sales_yesterday,
        servicesToday: comparisonBase.services_today,
        servicesYesterday: comparisonBase.services_yesterday,
        movementToday,
        movementYesterday,
        salesWeek: comparisonBase.sales_total_week,
        salesWeekPrevious: comparisonBase.sales_total_previous_week,
        operationsWeek: comparisonBase.sales_count_week,
        operationsWeekPrevious: comparisonBase.sales_count_previous_week,
        occupiedRooms,
        freeRooms,
        totalRooms,
        occupancyRate,
        servicesActive,
        expiringServices,
        pendingOrders,
        pendingServiceRequests: pendingServiceRequestsCount,
        totalLoggedUsers,
        totalTeamMembers,
        teamCoverageRate,
        openCashRegisters,
        rankingRows,
        openingAmount: Number(cajaRow?.monto_apertura || 0),
        sales: Number(cajaStats.total_ventas || 0),
        services: Number(cajaStats.total_servicios || 0),
        tips: Number(cajaRow?.propina || 0),
        advances: Number(cajaRow?.anticipo || 0),
        returns: Number(cajaRow?.devolucion || 0),
        withdrawals: totalWithdrawals,
        todaySalesSameTime,
        yesterdaySalesSameTime,
        elapsedMinutesToday
      });

      insights.localStatus.orders.open = pendingOrders;

      const recentActivity = await this.getRecentActivity(8);

      const cajaStatsResult = buildCajaStatsResult({
        cajaId,
        cajaRow,
        cajaStats
      });

      return {
        insights,
        cajaStats: cajaStatsResult,
        loggedUsers,
        timers,
        rooms,
        recentActivity,
        pendingServiceRequestsCount,
        pendingItems: {
          orders: await this.getPendingOrders(5),
          serviceRequests: await ServiceRequestRepository.getPendingServiceRequests(5),
          summary: {
            totalPendingOrders: pendingOrders,
            totalPendingServiceRequests: pendingServiceRequestsCount,
            totalVisibleItems: 5 + Math.min(pendingServiceRequestsCount, 5)
          }
        }
      };
    } catch (err) {
      logger.error('[StatsQueries] Error en getDashboardComposite:', { err });
      if (err instanceof NotFoundError) throw err;
      throw new DatabaseError('Error al obtener composite del dashboard', err);
    }
  }

  static async getUserDashboardSummary(userId: string, role: string) {
    try {
      const roleLower = role.toLowerCase();

      const userRes = await query<any[]>(
        'SELECT sueldo, aporte, descuento FROM usuarios WHERE id_usuario = ?',
        [userId]
      );
      if (userRes.length === 0) throw new NotFoundError('Usuario', userId);
      const userBase = userRes[0];

      const [
        asistencias,
        anticipos,
        propinas,
        horasExtras,
        pedidos,
        servicios,
        comisiones,
        semanasAsistencia
      ] = await Promise.all([
        query('SELECT * FROM asistencias WHERE usuario_id = ? AND estado = 1', [userId]) as Promise<
          any[]
        >,
        query('SELECT * FROM anticipos WHERE usuario_id = ?', [userId]) as Promise<any[]>,
        query(
          `
        SELECT P.id_propina, P.estado, DP.monto
        FROM propinas P
        INNER JOIN detalle_propinas DP ON DP.propina_id = P.id_propina
        WHERE DP.usuario_id = ?`,
          [userId]
        ) as Promise<any[]>,
        query('SELECT * FROM horas_extras WHERE usuario_id = ?', [userId]) as Promise<any[]>,
        roleLower === 'garzon'
          ? (query('SELECT id_pedido, estado FROM pedidos WHERE mesero_id = ?', [
              userId
            ]) as Promise<any[]>)
          : (query(
              'SELECT P.id_pedido, P.estado FROM pedidos P INNER JOIN pedidos_usuarios PU ON P.id_pedido = PU.pedido_id WHERE PU.usuario_id = ?',
              [userId]
            ) as Promise<any[]>),
        query(
          'SELECT S.* FROM servicios S INNER JOIN detalle_servicios DS ON S.id_servicio = DS.servicio_id WHERE DS.usuario_id = ?',
          [userId]
        ) as Promise<any[]>,
        query('SELECT * FROM detalle_comisiones WHERE usuario_id = ?', [userId]) as Promise<any[]>,
        query(
          `
        SELECT COUNT(DISTINCT TO_CHAR(fecha, 'IYYY-IW')) as semanas
        FROM asistencias
        WHERE usuario_id = ? AND estado = 1 AND (EXTRACT(DOW FROM fecha)::integer + 1) IN (3,4,5,6,7,1)`,
          [userId]
        ) as Promise<any[]>
      ]);

      const filterEstado1 = (arr: any[]) => arr.filter(i => i.estado === 1);

      const anticiposPendientesArr = filterEstado1(anticipos);
      const totalAnticiposPendientes = anticiposPendientesArr.reduce(
        (s, a) => s + (a.monto || 0),
        0
      );

      const propinasPendientesArr = filterEstado1(propinas);
      const totalPropinasPendientes = propinasPendientesArr.reduce((s, p) => s + (p.monto || 0), 0);

      const horasExtrasPendientesArr = filterEstado1(horasExtras);
      const totalHorasExtrasPendientes = horasExtrasPendientesArr.reduce(
        (s, h) => s + (h.total || 0),
        0
      );

      const totalAsistenciasCount = asistencias.length;
      const totalSueldoAsistencias = totalAsistenciasCount * (userBase.sueldo || 0);
      const totalAporteAsistencias = totalAsistenciasCount * (userBase.aporte || 0);
      const totalDescuentoAsistencias =
        (semanasAsistencia[0]?.semanas || 0) * (userBase.descuento || 0);

      let totalACobrar = 0;

      if (roleLower === 'garzon') {
        const totalACobrarAsistencias =
          totalSueldoAsistencias + totalAporteAsistencias - totalDescuentoAsistencias;
        totalACobrar =
          totalACobrarAsistencias +
          totalPropinasPendientes +
          totalHorasExtrasPendientes -
          totalAnticiposPendientes;
      } else if (roleLower === 'anfitriona') {
        const totalACobrarAsistencias = Math.max(
          0,
          totalSueldoAsistencias - totalAporteAsistencias - totalDescuentoAsistencias
        );

        const comisionesVentas = comisiones.filter(c => c.tipo === 'venta' && c.estado === 1);
        const totalComisionesVentas = comisionesVentas.reduce((s, c) => s + (c.comision || 0), 0);

        const comisionesServicios = comisiones.filter(c => c.tipo === 'servicio' && c.estado === 1);
        const totalGanadoServicios = comisionesServicios.reduce((s, c) => s + (c.comision || 0), 0);

        totalACobrar =
          totalACobrarAsistencias +
          totalComisionesVentas +
          totalGanadoServicios -
          totalAnticiposPendientes;
      } else if (roleLower === 'cajero') {
        totalACobrar =
          totalSueldoAsistencias -
          totalAporteAsistencias -
          totalAnticiposPendientes +
          totalPropinasPendientes +
          totalHorasExtrasPendientes;
      }

      return {
        totalAsistencias: totalAsistenciasCount,
        totalAnticipos: anticipos.length,
        totalPropinas: propinas.length,
        totalHorasExtras: horasExtras.length,
        totalPedidos: pedidos.length,
        totalComisiones: comisiones.length,
        totalServicios: servicios.length,
        totalACobrar,
        anticiposPendientes: anticiposPendientesArr.length,
        propinasPendientes: propinasPendientesArr.length,
        horasExtrasPendientes: horasExtrasPendientesArr.length,
        comisionesPendientes: comisiones.filter(c => c.estado === 1).length
      };
    } catch (err) {
      logger.error('[StatsQueries] Error en getUserDashboardSummary:', { userId, role, err });
      if (err instanceof NotFoundError) throw err;
      throw new DatabaseError(`Error al obtener resumen de dashboard para usuario ${userId}`, err);
    }
  }
}
