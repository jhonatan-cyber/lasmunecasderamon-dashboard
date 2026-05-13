import { query } from '@/lib/database/db';
import {
  StatsGeneralSchema,
  type StatsGeneralType,
  MonthlySalesSchema,
  type MonthlySalesType,
  WeeklySalesSchema,
  type WeeklySalesType
} from '@/lib/business/schemas';
import { getNowInBusinessTimezone } from '@/lib/business/timezoneService';
import { NotFoundError } from '@/lib/errors/errors';
import { TimerRepository } from './TimerRepository';
import { ServiceRequestRepository } from './ServiceRequestRepository';
import { RoomRepository } from './RoomRepository';
import { OrderRepository } from './OrderRepository';

export class StatsRepository {
  private static buildTrend(current: number, previous: number) {
    const safeCurrent = Number(current || 0);
    const safePrevious = Number(previous || 0);
    const delta = safeCurrent - safePrevious;
    const percentChange =
      safePrevious === 0 ? (safeCurrent > 0 ? 100 : 0) : Math.round((delta / safePrevious) * 100);

    return {
      current: safeCurrent,
      previous: safePrevious,
      delta,
      percentChange,
      direction: delta > 0 ? 'up' : delta < 0 ? 'down' : 'flat'
    };
  }

  static async getDashboardAlerts() {
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
        RoomRepository.getAll(),
        ServiceRequestRepository.getPendingCount(),
        TimerRepository.getActive()
      ]);

    const openCashRegisters = Number(cashRegisterRows[0]?.total || 0);
    const pendingOrders = Number(pendingOrdersRows[0]?.total || 0);
    const occupiedRooms = rooms.filter(room => Number(room.status) === 2).length;
    const freeRooms = rooms.filter(room => Number(room.status) === 1).length;
    const totalRooms = rooms.length;
    const expiringServices = timers.filter(timer => {
      const remaining = Number(timer.remainingTime || 0);
      return remaining > 0 && remaining <= 15 * 60;
    }).length;

    const alerts = [
      {
        id: 'cash-register',
        title: openCashRegisters > 0 ? 'Caja abierta' : 'Sin caja abierta',
        description:
          openCashRegisters > 0
            ? 'Hay una caja operando en este momento.'
            : 'No hay caja activa en este momento.',
        value: openCashRegisters,
        severity: openCashRegisters > 0 ? 'warning' : 'success',
        href: '/cash-register',
        ctaLabel: openCashRegisters > 0 ? 'Revisar caja' : 'Abrir caja'
      },
      {
        id: 'orders',
        title: 'Pedidos pendientes',
        description: 'Pedidos esperando atención o procesamiento.',
        value: pendingOrders,
        severity: pendingOrders > 0 ? 'critical' : 'success',
        href: '/orders',
        ctaLabel: 'Ver pedidos'
      },
      {
        id: 'service-requests',
        title: 'Solicitudes pendientes',
        description: 'Solicitudes de servicio listas para revisión.',
        value: pendingServiceRequests,
        severity: pendingServiceRequests > 0 ? 'warning' : 'success',
        href: '/orders',
        ctaLabel: 'Revisar solicitudes'
      },
      {
        id: 'timers',
        title: 'Servicios por vencer',
        description: 'Temporizadores con menos de 15 minutos restantes.',
        value: expiringServices,
        severity: expiringServices > 0 ? 'warning' : 'success',
        href: '/private-rooms',
        ctaLabel: 'Ver servicios'
      }
    ];

    return {
      alerts,
      summary: {
        openCashRegisters,
        pendingOrders,
        pendingServiceRequests,
        expiringServices,
        occupiedRooms,
        freeRooms,
        totalRooms,
        criticalCount: alerts.filter(alert => alert.severity === 'critical' && alert.value > 0)
          .length,
        warningCount: alerts.filter(alert => alert.severity === 'warning' && alert.value > 0).length
      }
    };
  }

  static async getDashboardPendingItems() {
    const [orders, serviceRequests] = await Promise.all([
      OrderRepository.getAll(20),
      ServiceRequestRepository.getAll('pendiente')
    ]);

    const pendingOrders = orders
      .filter(order => Number(order.estado) === 1)
      .slice(0, 5)
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

    const pendingServiceRequests = serviceRequests.slice(0, 5).map(request => ({
      id: String(request.id_solicitud),
      code: request.codigo || String(request.id_solicitud),
      title: request.habitacion_nombre || 'Sin habitación',
      subtitle: request.cliente_nombre || 'Sin cliente registrado',
      amount: Number(request.total || 0),
      createdAt: request.fecha_solicitud,
      href: '/orders',
      kind: 'service_request' as const
    }));

    return {
      orders: pendingOrders,
      serviceRequests: pendingServiceRequests,
      summary: {
        totalPendingOrders: pendingOrders.length,
        totalPendingServiceRequests: pendingServiceRequests.length,
        totalVisibleItems: pendingOrders.length + pendingServiceRequests.length
      }
    };
  }

  static async getDashboardInsights() {
    const now = getNowInBusinessTimezone();
    const yesterday = getNowInBusinessTimezone(Date.now() - 24 * 60 * 60 * 1000);
    const hoursElapsed = Number(now.slice(11, 13) || 0);
    const minutesElapsed = Number(now.slice(14, 16) || 0);
    const elapsedMinutesToday = Math.max(1, hoursElapsed * 60 + minutesElapsed);
    const cajaStats = await this.getCajaGeneralStats();

    const [alerts, loggedUsers, timers, comparisonsRows, rankingRows, withdrawalsRows] =
      await Promise.all([
        this.getDashboardAlerts(),
        this.getLoggedUsers(),
        TimerRepository.getActive(),
        query<any[]>(
          `
          SELECT
            COALESCE((
              SELECT SUM(v.total)
              FROM ventas v
              WHERE v.estado IN (1, 2)
                AND v.fecha_crea >= DATE(?)
                AND v.fecha_crea < DATE_ADD(DATE(?), INTERVAL 1 DAY)
            ), 0) AS sales_today,
            COALESCE((
              SELECT SUM(v.total)
              FROM ventas v
              WHERE v.estado IN (1, 2)
                AND v.fecha_crea >= DATE(?)
                AND v.fecha_crea < DATE_ADD(DATE(?), INTERVAL 1 DAY)
            ), 0) AS sales_yesterday,
            COALESCE((
              SELECT SUM(s.total)
              FROM servicios s
              WHERE s.estado IN (1, 2)
                AND s.fecha_crea >= DATE(?)
                AND s.fecha_crea < DATE_ADD(DATE(?), INTERVAL 1 DAY)
            ), 0) AS services_today,
            COALESCE((
              SELECT SUM(s.total)
              FROM servicios s
              WHERE s.estado IN (1, 2)
                AND s.fecha_crea >= DATE(?)
                AND s.fecha_crea < DATE_ADD(DATE(?), INTERVAL 1 DAY)
            ), 0) AS services_yesterday,
            COALESCE((
              SELECT COUNT(*)
              FROM ventas v
              WHERE v.estado IN (1, 2)
                AND YEARWEEK(v.fecha_crea, 1) = YEARWEEK(DATE(?), 1)
            ), 0) AS sales_count_week,
            COALESCE((
              SELECT COUNT(*)
              FROM ventas v
              WHERE v.estado IN (1, 2)
                AND YEARWEEK(v.fecha_crea, 1) = YEARWEEK(DATE_SUB(DATE(?), INTERVAL 7 DAY), 1)
            ), 0) AS sales_count_previous_week,
            COALESCE((
              SELECT SUM(v.total)
              FROM ventas v
              WHERE v.estado IN (1, 2)
                AND YEARWEEK(v.fecha_crea, 1) = YEARWEEK(DATE(?), 1)
            ), 0) AS sales_total_week,
            COALESCE((
              SELECT SUM(v.total)
              FROM ventas v
              WHERE v.estado IN (1, 2)
                AND YEARWEEK(v.fecha_crea, 1) = YEARWEEK(DATE_SUB(DATE(?), INTERVAL 7 DAY), 1)
            ), 0) AS sales_total_previous_week,
            COALESCE((
              SELECT SUM(v.total)
              FROM ventas v
              WHERE v.estado IN (1, 2)
                AND v.fecha_crea >= DATE(?)
                AND v.fecha_crea < DATE_ADD(DATE(?), INTERVAL 1 DAY)
                AND TIME(v.fecha_crea) <= TIME(?)
            ), 0) AS sales_same_time_today,
            COALESCE((
              SELECT SUM(v.total)
              FROM ventas v
              WHERE v.estado IN (1, 2)
                AND v.fecha_crea >= DATE(?)
                AND v.fecha_crea < DATE_ADD(DATE(?), INTERVAL 1 DAY)
                AND TIME(v.fecha_crea) <= TIME(?)
            ), 0) AS sales_same_time_yesterday
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
        ),
        query<any[]>(
          `
          SELECT *
          FROM (
            SELECT
              'product' AS ranking_type,
              p.nombre AS item_name,
              SUM(dv.cantidad) AS primary_value,
              SUM(dv.sub_total) AS secondary_value
            FROM detalle_ventas dv
            INNER JOIN ventas v ON v.id_venta = dv.venta_id
            INNER JOIN productos p ON p.id_producto = dv.producto_id
            WHERE v.estado IN (1, 2)
              AND v.fecha_crea >= DATE(?)
              AND v.fecha_crea < DATE_ADD(DATE(?), INTERVAL 1 DAY)
            GROUP BY p.id_producto, p.nombre

            UNION ALL

            SELECT
              'room' AS ranking_type,
              room_activity.item_name,
              room_activity.operations_count AS primary_value,
              room_activity.total_generated AS secondary_value
            FROM (
              SELECT
                h.nombre AS item_name,
                COUNT(*) AS operations_count,
                SUM(activity.total) AS total_generated
              FROM (
                SELECT habitacion_id, total
                FROM servicios
                WHERE estado IN (1, 2)
                  AND fecha_crea >= DATE(?)
                  AND fecha_crea < DATE_ADD(DATE(?), INTERVAL 1 DAY)

                UNION ALL

                SELECT habitacion_id, total
                FROM ventas
                WHERE estado IN (1, 2)
                  AND fecha_crea >= DATE(?)
                  AND fecha_crea < DATE_ADD(DATE(?), INTERVAL 1 DAY)
              ) activity
              INNER JOIN habitaciones h ON h.id_habitacion = activity.habitacion_id
              GROUP BY h.id_habitacion, h.nombre
            ) room_activity

            UNION ALL

            SELECT
              'staff' AS ranking_type,
              staff_activity.item_name,
              staff_activity.operations_count AS primary_value,
              staff_activity.total_generated AS secondary_value
            FROM (
              SELECT
                CONCAT(u.nombre, ' ', u.apellido) AS item_name,
                COUNT(*) AS operations_count,
                SUM(staff_source.total) AS total_generated
              FROM (
                SELECT ds.usuario_id, s.total
                FROM detalle_servicios ds
                INNER JOIN servicios s ON s.id_servicio = ds.servicio_id
                WHERE s.estado IN (1, 2)
                  AND s.fecha_crea >= DATE(?)
                  AND s.fecha_crea < DATE_ADD(DATE(?), INTERVAL 1 DAY)

                UNION ALL

                SELECT vu.usuario_id, v.total
                FROM ventas_usuarios vu
                INNER JOIN ventas v ON v.id_venta = vu.venta_id
                WHERE v.estado IN (1, 2)
                  AND v.fecha_crea >= DATE(?)
                  AND v.fecha_crea < DATE_ADD(DATE(?), INTERVAL 1 DAY)
              ) staff_source
              INNER JOIN usuarios u ON u.id_usuario = staff_source.usuario_id
              GROUP BY u.id_usuario, u.nombre, u.apellido
            ) staff_activity
          ) rankings
          WHERE secondary_value > 0 OR primary_value > 0
          ORDER BY ranking_type ASC, secondary_value DESC, primary_value DESC
        `,
          [now, now, now, now, now, now, now, now, now, now]
        ),
        cajaStats.caja_id
          ? query<any[]>(
              `
              SELECT COALESCE(SUM(monto), 0) AS total
              FROM retiros_caja
              WHERE caja_id = ?
            `,
              [cajaStats.caja_id]
            )
          : Promise.resolve([{ total: 0 }])
      ]);

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
      Number(comparisonBase.sales_yesterday || 0) + Number(comparisonBase.services_yesterday || 0);
    const totalWithdrawals = Number(withdrawalsRows[0]?.total || 0);
    const occupancyRate =
      alerts.summary.totalRooms > 0
        ? Math.round((alerts.summary.occupiedRooms / alerts.summary.totalRooms) * 100)
        : 0;
    const teamCoverageRate =
      totalTeamMembers > 0 ? Math.round((totalLoggedUsers / totalTeamMembers) * 100) : 0;
    const projectedRevenue = Math.round((movementToday / elapsedMinutesToday) * 24 * 60);
    const yesterdaySalesSameTime = Number(comparisonBase.sales_same_time_yesterday || 0);
    const todaySalesSameTime = Number(comparisonBase.sales_same_time_today || 0);
    const anomalies: Array<{
      id: string;
      tone: 'success' | 'warning' | 'critical';
      title: string;
      description: string;
    }> = [];

    if (yesterdaySalesSameTime > 0 && todaySalesSameTime <= yesterdaySalesSameTime * 0.75) {
      anomalies.push({
        id: 'sales-drop',
        tone: 'critical',
        title: 'Ventas por debajo del ritmo esperado',
        description: 'El acumulado de hoy va por debajo de lo registrado a esta misma hora ayer.'
      });
    } else if (yesterdaySalesSameTime > 0 && todaySalesSameTime >= yesterdaySalesSameTime * 1.25) {
      anomalies.push({
        id: 'sales-boost',
        tone: 'success',
        title: 'Ventas aceleradas',
        description: 'El día avanza por encima del ritmo de ventas observado ayer a esta hora.'
      });
    }

    if (alerts.summary.pendingOrders >= 5) {
      anomalies.push({
        id: 'order-backlog',
        tone: 'warning',
        title: 'Acumulación en pedidos',
        description: 'Hay una carga operativa alta en pedidos pendientes que conviene destrabar.'
      });
    }

    if (alerts.summary.expiringServices >= 3) {
      anomalies.push({
        id: 'service-pressure',
        tone: 'warning',
        title: 'Servicios próximos a vencer',
        description: 'Varios servicios están cerca de expirar y requieren atención del equipo.'
      });
    }

    return {
      comparisons: {
        salesToday: this.buildTrend(comparisonBase.sales_today, comparisonBase.sales_yesterday),
        servicesToday: this.buildTrend(
          comparisonBase.services_today,
          comparisonBase.services_yesterday
        ),
        movementToday: this.buildTrend(movementToday, movementYesterday),
        salesWeek: this.buildTrend(
          comparisonBase.sales_total_week,
          comparisonBase.sales_total_previous_week
        ),
        operationsWeek: this.buildTrend(
          comparisonBase.sales_count_week,
          comparisonBase.sales_count_previous_week
        )
      },
      localStatus: {
        rooms: {
          occupied: alerts.summary.occupiedRooms,
          free: alerts.summary.freeRooms,
          total: alerts.summary.totalRooms,
          occupancyRate
        },
        services: {
          active: servicesActive,
          expiringSoon: alerts.summary.expiringServices
        },
        orders: {
          open: alerts.summary.pendingOrders,
          serviceRequests: alerts.summary.pendingServiceRequests
        },
        team: {
          active: totalLoggedUsers,
          total: totalTeamMembers,
          coverageRate: teamCoverageRate
        },
        cash: {
          openRegisters: alerts.summary.openCashRegisters
        }
      },
      rankings: {
        products: rankingRows
          .filter(row => row.ranking_type === 'product')
          .slice(0, 5)
          .map(row => ({
            name: row.item_name,
            quantity: Number(row.primary_value || 0),
            amount: Number(row.secondary_value || 0)
          })),
        rooms: rankingRows
          .filter(row => row.ranking_type === 'room')
          .slice(0, 5)
          .map(row => ({
            name: row.item_name,
            quantity: Number(row.primary_value || 0),
            amount: Number(row.secondary_value || 0)
          })),
        staff: rankingRows
          .filter(row => row.ranking_type === 'staff')
          .slice(0, 5)
          .map(row => ({
            name: row.item_name,
            quantity: Number(row.primary_value || 0),
            amount: Number(row.secondary_value || 0)
          }))
      },
      financialSummary: {
        openingAmount: Number(cajaStats.monto_apertura || 0),
        sales: Number(cajaStats.total_ventas || 0),
        services: Number(cajaStats.total_servicios || 0),
        tips: Number(cajaStats.total_propina || 0),
        advances: Number(cajaStats.total_anticipo || 0),
        returns: Number(cajaStats.total_devolucion || 0),
        withdrawals: totalWithdrawals,
        netRevenue:
          Number(cajaStats.total_ventas || 0) +
          Number(cajaStats.total_servicios || 0) +
          Number(cajaStats.total_propina || 0) -
          Number(cajaStats.total_devolucion || 0) -
          totalWithdrawals
      },
      forecast: {
        projectedRevenue,
        currentRevenue: movementToday,
        yesterdayRevenue: movementYesterday,
        elapsedMinutesToday,
        anomalies
      }
    };
  }

  static async getRecentActivity(limit: number = 8) {
    const rows = (await query<any[]>(
      `
      SELECT *
      FROM (
        SELECT 
          CONCAT('venta-', v.id_venta) AS id,
          'venta' AS type,
          CONCAT('Venta ', COALESCE(v.codigo, v.id_venta)) AS description,
          v.total AS amount,
          COALESCE(c.nombre, 'Sin cliente registrado') AS metadata,
          v.fecha_crea AS created_at
        FROM ventas v
        LEFT JOIN clientes c ON c.id_cliente = v.cliente_id
        WHERE v.estado IN (1, 2)

        UNION ALL

        SELECT 
          CONCAT('servicio-', s.id_servicio) AS id,
          'servicio' AS type,
          CONCAT('Servicio ', COALESCE(s.codigo, s.id_servicio)) AS description,
          s.total AS amount,
          COALESCE(c.nombre, 'Sin cliente registrado') AS metadata,
          s.fecha_crea AS created_at
        FROM servicios s
        LEFT JOIN clientes c ON c.id_cliente = s.cliente_id
        WHERE s.estado IN (1, 2, 3, 4)

        UNION ALL

        SELECT 
          CONCAT('pedido-', p.id_pedido) AS id,
          'pedido' AS type,
          CONCAT('Pedido ', COALESCE(p.codigo, p.id_pedido)) AS description,
          p.total AS amount,
          COALESCE(c.nombre, 'Sin cliente registrado') AS metadata,
          p.fecha_crea AS created_at
        FROM pedidos p
        LEFT JOIN clientes c ON c.id_cliente = p.cliente_id

        UNION ALL

        SELECT 
          CONCAT('login-', l.usuario_id, '-', UNIX_TIMESTAMP(l.last_login)) AS id,
          'login' AS type,
          CONCAT(u.nombre, ' ', u.apellido, ' inició sesión') AS description,
          NULL AS amount,
          r.nombre AS metadata,
          l.last_login AS created_at
        FROM logins l
        INNER JOIN usuarios u ON u.id_usuario = l.usuario_id
        INNER JOIN roles r ON r.id_rol = u.rol_id
        WHERE l.estado = 1
      ) recent_activity
      ORDER BY created_at DESC
      LIMIT ?
    `,
      [limit]
    )) as any[];

    return rows.map(row => ({
      id: row.id,
      type: row.type,
      description: row.description,
      amount: row.amount !== null ? Number(row.amount) : null,
      metadata: row.metadata,
      createdAt: row.created_at
    }));
  }

  static async getHabitacionesStats(cajaId: string) {
    const habitacionesStats = (await query(
      `
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
    `,
      [cajaId]
    )) as any[];

    const comisionesVentas = await query(
      `
      SELECT 
        COALESCE(SUM(dv.comision), 0) as total_comisiones_venta
      FROM ventas v
      INNER JOIN detalle_ventas dv ON v.id_venta = dv.venta_id
      WHERE v.caja_id = ?
    `,
      [cajaId]
    );

    const totalComisionesVenta = (comisionesVentas as any)[0]?.total_comisiones_venta || 0;
    const totalServicios = habitacionesStats.reduce(
      (sum: number, h: any) => sum + h.total_servicios,
      0
    );

    return habitacionesStats.map((habitacion: any) => ({
      ...habitacion,
      comisiones_venta:
        totalServicios > 0
          ? Math.round((habitacion.total_servicios / totalServicios) * totalComisionesVenta)
          : 0
    }));
  }

  static async getCajaGeneralStats(): Promise<StatsGeneralType> {
    const now = getNowInBusinessTimezone();
    const cajaAbierta = await query<any[]>(
      `
      SELECT id_caja, fecha_apertura, usuario_id_apertura, monto_apertura, efectivo,
        tarjeta, transferencia, comision, propina, iva, anticipo, devolucion,
        TIMESTAMPDIFF(HOUR, fecha_apertura, ?) as horas_abierta,
        TIMESTAMPDIFF(MINUTE, fecha_apertura, ?) % 60 as minutos_abierta
      FROM cajas
      WHERE estado = 1
      ORDER BY fecha_apertura DESC
      LIMIT 1
    `,
      [now, now]
    );

    const cajaRow = cajaAbierta[0] || null;

    const [cajasStats, ventasStats, serviciosStats, balanceStats] = await Promise.all([
      query(`
        SELECT 
          COUNT(CASE WHEN estado = 1 THEN 1 END) as cajas_abiertas,
          COUNT(CASE WHEN estado = 0 THEN 1 END) as cajas_cerradas,
          COUNT(*) as total_cajas
        FROM cajas
      `) as Promise<any[]>,

      cajaRow?.id_caja
        ? (query(
            `
            SELECT 
              COALESCE(SUM(total), 0) as total_ventas,
              COALESCE(COUNT(*), 0) as cantidad_ventas,
              COALESCE(AVG(total), 0) as promedio_venta,
              COALESCE(SUM(CASE WHEN metodo_pago = 'efectivo' THEN total ELSE 0 END), 0) as total_efectivo,
              COALESCE(SUM(CASE WHEN metodo_pago = 'tarjeta' THEN total ELSE 0 END), 0) as total_tarjeta,
              COALESCE(SUM(CASE WHEN metodo_pago = 'transferencia' THEN total ELSE 0 END), 0) as total_transferencia
            FROM ventas
            WHERE caja_id = ? AND estado IN (1, 2)
          `,
            [cajaRow.id_caja]
          ) as Promise<any[]>)
        : Promise.resolve([
            {
              total_ventas: 0,
              cantidad_ventas: 0,
              promedio_venta: 0,
              total_efectivo: 0,
              total_tarjeta: 0,
              total_transferencia: 0
            }
          ] as any[]),

      cajaRow?.id_caja
        ? (query(
            `
            SELECT 
              COALESCE(SUM(total), 0) as total_servicios,
              COALESCE(COUNT(*), 0) as cantidad_servicios,
              COALESCE(AVG(total), 0) as promedio_servicio
            FROM servicios
            WHERE caja_id = ? AND estado IN (1, 2)
          `,
            [cajaRow.id_caja]
          ) as Promise<any[]>)
        : Promise.resolve([
            { total_servicios: 0, cantidad_servicios: 0, promedio_servicio: 0 }
          ] as any[]),

      query(`
        SELECT 
          COALESCE(SUM(monto_apertura + efectivo + tarjeta + transferencia - COALESCE(anticipo, 0) - COALESCE(devolucion, 0)), 0) as balance_total
        FROM cajas
        WHERE estado = 1
      `) as Promise<any[]>
    ]);

    return StatsGeneralSchema.parse({
      caja_id: cajaRow?.id_caja,
      monto_apertura: parseFloat(cajaRow?.monto_apertura || '0'),
      efectivo_en_caja:
        parseFloat(cajaRow?.monto_apertura || '0') + parseFloat(cajaRow?.efectivo || '0'),
      total_efectivo: parseFloat(cajaRow?.efectivo || '0'),
      total_tarjeta: parseFloat(cajaRow?.tarjeta || '0'),
      total_transferencia: parseFloat(cajaRow?.transferencia || '0'),
      total_anticipo: parseFloat(cajaRow?.anticipo || '0'),
      total_devolucion: parseFloat(cajaRow?.devolucion || '0'),
      total_comision: parseFloat(cajaRow?.comision || '0'),
      total_propina: parseFloat(cajaRow?.propina || '0'),
      total_iva: parseFloat(cajaRow?.iva || '0'),

      total_ventas: parseFloat(ventasStats[0]?.total_ventas || '0'),
      cantidad_ventas: parseInt(ventasStats[0]?.cantidad_ventas || '0'),
      total_servicios: parseFloat(serviciosStats[0]?.total_servicios || '0'),
      cantidad_servicios: parseInt(serviciosStats[0]?.cantidad_servicios || '0'),
      balance_total: parseFloat(balanceStats[0]?.balance_total || '0'),

      tiempo_abierta_horas: cajaRow?.horas_abierta || 0,
      tiempo_abierta_minutos: cajaRow?.minutos_abierta || 0,
      fecha_apertura_raw: cajaRow?.fecha_apertura || null,
      usuario_id_apertura: cajaRow?.usuario_id_apertura || null
    });
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

    const findTotal = (rol: string) =>
      totalUsers.find((t: any) => t.rol.toLowerCase().includes(rol))?.total || 0;
    const filterLogged = (rol: string) =>
      loggedUsers.filter(u => u.rol.toLowerCase().includes(rol));

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
    const now = getNowInBusinessTimezone();
    const currentYear = parseInt(now.substring(0, 4), 10);
    const targetYear = currentYear - offset;
    const rows = await query<any[]>(
      `
      SELECT 
        DATE_FORMAT(fecha_crea, '%Y-%m') as mes,
        COUNT(*) as cantidad_ventas,
        SUM(total) as total_ventas
      FROM ventas
      WHERE estado IN (1, 2)
        -- Optimization: Range query using Year boundaries
        AND fecha_crea >= STR_TO_DATE(CONCAT(YEAR(DATE_SUB(?, INTERVAL ? YEAR)), '-01-01'), '%Y-%m-%d')
        AND fecha_crea <= STR_TO_DATE(CONCAT(YEAR(DATE_SUB(?, INTERVAL ? YEAR)), '-12-31 23:59:59'), '%Y-%m-%d %H:%i:%s')
      GROUP BY mes
      ORDER BY mes DESC
      LIMIT 12
    `,
      [now, offset, now, offset]
    );

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
      year: targetYear,
      data: data.sort((a, b) => a.mes.localeCompare(b.mes)),
      summary: {
        totalVentas,
        totalCantidad,
        mesMaxVentas: maxMes?.mes || 'N/A',
        mesMinVentas: minMes?.mes || 'N/A',
        promedioMensual: data.length > 0 ? totalVentas / data.length : 0
      }
    };
  }

  static async getSalesByWeek(offset: number = 0) {
    const now = getNowInBusinessTimezone();
    const rows = (await query(
      `
      WITH RECURSIVE days AS (
        SELECT DATE(DATE_SUB(?, INTERVAL (WEEKDAY(?) + (? * 7)) DAY)) as d, 0 as i
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
      -- Optimization: Avoid DATE() on index column
      LEFT JOIN ventas v ON v.fecha_crea >= days.d AND v.fecha_crea < DATE_ADD(days.d, INTERVAL 1 DAY)
        AND v.estado IN (1, 2)
      GROUP BY days.d, dia_semana, dia_espanol, orden
      ORDER BY orden ASC
    `,
      [now, now, offset]
    )) as any[];

    const startDate = rows[0]?.fecha;
    const endDate = rows[rows.length - 1]?.fecha;

    const data = rows.map((r: any) => ({
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

  static async getDashboardComposite() {
    const now = getNowInBusinessTimezone();
    const yesterday = getNowInBusinessTimezone(Date.now() - 24 * 60 * 60 * 1000);
    const hoursElapsed = Number(now.slice(11, 13) || 0);
    const minutesElapsed = Number(now.slice(14, 16) || 0);
    const elapsedMinutesToday = Math.max(1, hoursElapsed * 60 + minutesElapsed);

    // Step 1: Get caja_id once (used by multiple queries)
    const cajaRows = await query<any[]>(
      `SELECT id_caja, fecha_apertura, usuario_id_apertura, monto_apertura, efectivo,
              tarjeta, transferencia, comision, anticipo, devolucion, iva,
              TIMESTAMPDIFF(HOUR, fecha_apertura, ?) as horas_abierta,
              TIMESTAMPDIFF(MINUTE, fecha_apertura, ?) % 60 as minutos_abierta
       FROM cajas WHERE estado = 1 ORDER BY fecha_apertura DESC LIMIT 1`,
      [now, now]
    );
    const cajaRow = cajaRows[0] || null;
    const cajaId = cajaRow?.id_caja;

    // Step 2: All independent queries run in parallel
    const [
      cajaStatsRows,
      comparisonsRows,
      rankingRows,
      loggedUsers,
      timers,
      rooms,
      pendingServiceRequestsCount,
      withdrawalsRows
    ] = await Promise.all([
      // caja stats: ventas, servicios, balance in ONE query
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

      // comparisons: 10 values in single SELECT
      query<any[]>(
        `SELECT
          COALESCE((SELECT SUM(v.total) FROM ventas v WHERE v.estado IN (1, 2) AND v.fecha_crea >= DATE(?) AND v.fecha_crea < DATE_ADD(DATE(?), INTERVAL 1 DAY)), 0) AS sales_today,
          COALESCE((SELECT SUM(v.total) FROM ventas v WHERE v.estado IN (1, 2) AND v.fecha_crea >= DATE(?) AND v.fecha_crea < DATE_ADD(DATE(?), INTERVAL 1 DAY)), 0) AS sales_yesterday,
          COALESCE((SELECT SUM(s.total) FROM servicios s WHERE s.estado IN (1, 2) AND s.fecha_crea >= DATE(?) AND s.fecha_crea < DATE_ADD(DATE(?), INTERVAL 1 DAY)), 0) AS services_today,
          COALESCE((SELECT SUM(s.total) FROM servicios s WHERE s.estado IN (1, 2) AND s.fecha_crea >= DATE(?) AND s.fecha_crea < DATE_ADD(DATE(?), INTERVAL 1 DAY)), 0) AS services_yesterday,
          COALESCE((SELECT COUNT(*) FROM ventas v WHERE v.estado IN (1, 2) AND YEARWEEK(v.fecha_crea, 1) = YEARWEEK(DATE(?), 1)), 0) AS sales_count_week,
          COALESCE((SELECT COUNT(*) FROM ventas v WHERE v.estado IN (1, 2) AND YEARWEEK(v.fecha_crea, 1) = YEARWEEK(DATE_SUB(DATE(?), INTERVAL 7 DAY), 1)), 0) AS sales_count_previous_week,
          COALESCE((SELECT SUM(v.total) FROM ventas v WHERE v.estado IN (1, 2) AND YEARWEEK(v.fecha_crea, 1) = YEARWEEK(DATE(?), 1)), 0) AS sales_total_week,
          COALESCE((SELECT SUM(v.total) FROM ventas v WHERE v.estado IN (1, 2) AND YEARWEEK(v.fecha_crea, 1) = YEARWEEK(DATE_SUB(DATE(?), INTERVAL 7 DAY), 1)), 0) AS sales_total_previous_week,
          COALESCE((SELECT SUM(v.total) FROM ventas v WHERE v.estado IN (1, 2) AND v.fecha_crea >= DATE(?) AND v.fecha_crea < DATE_ADD(DATE(?), INTERVAL 1 DAY) AND TIME(v.fecha_crea) <= TIME(?)), 0) AS sales_same_time_today,
          COALESCE((SELECT SUM(v.total) FROM ventas v WHERE v.estado IN (1, 2) AND v.fecha_crea >= DATE(?) AND v.fecha_crea < DATE_ADD(DATE(?), INTERVAL 1 DAY) AND TIME(v.fecha_crea) <= TIME(?)), 0) AS sales_same_time_yesterday
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
      ),

      // rankings: existing complex query
      query<any[]>(
        `SELECT * FROM (
          SELECT 'product' AS ranking_type, p.nombre AS item_name, SUM(dv.cantidad) AS primary_value, SUM(dv.sub_total) AS secondary_value
          FROM detalle_ventas dv
          INNER JOIN ventas v ON v.id_venta = dv.venta_id
          INNER JOIN productos p ON p.id_producto = dv.producto_id
          WHERE v.estado IN (1, 2) AND v.fecha_crea >= DATE(?) AND v.fecha_crea < DATE_ADD(DATE(?), INTERVAL 1 DAY)
          GROUP BY p.id_producto, p.nombre
          UNION ALL
          SELECT 'room' AS ranking_type, room_activity.item_name, room_activity.operations_count AS primary_value, room_activity.total_generated AS secondary_value
          FROM (
            SELECT h.nombre AS item_name, COUNT(*) AS operations_count, SUM(activity.total) AS total_generated
            FROM (
              SELECT habitacion_id, total FROM servicios WHERE estado IN (1, 2) AND fecha_crea >= DATE(?) AND fecha_crea < DATE_ADD(DATE(?), INTERVAL 1 DAY)
              UNION ALL
              SELECT habitacion_id, total FROM ventas WHERE estado IN (1, 2) AND fecha_crea >= DATE(?) AND fecha_crea < DATE_ADD(DATE(?), INTERVAL 1 DAY)
            ) activity
            INNER JOIN habitaciones h ON h.id_habitacion = activity.habitacion_id
            GROUP BY h.id_habitacion, h.nombre
          ) room_activity
          UNION ALL
          SELECT 'staff' AS ranking_type, staff_activity.item_name, staff_activity.operations_count AS primary_value, staff_activity.total_generated AS secondary_value
          FROM (
            SELECT CONCAT(u.nombre, ' ', u.apellido) AS item_name, COUNT(*) AS operations_count, SUM(staff_source.total) AS total_generated
            FROM (
              SELECT ds.usuario_id, s.total FROM detalle_servicios ds INNER JOIN servicios s ON s.id_servicio = ds.servicio_id WHERE s.estado IN (1, 2) AND s.fecha_crea >= DATE(?) AND s.fecha_crea < DATE_ADD(DATE(?), INTERVAL 1 DAY)
              UNION ALL
              SELECT vu.usuario_id, v.total FROM ventas_usuarios vu INNER JOIN ventas v ON v.id_venta = vu.venta_id WHERE v.estado IN (1, 2) AND v.fecha_crea >= DATE(?) AND v.fecha_crea < DATE_ADD(DATE(?), INTERVAL 1 DAY)
            ) staff_source
            INNER JOIN usuarios u ON u.id_usuario = staff_source.usuario_id
            GROUP BY u.id_usuario, u.nombre, u.apellido
          ) staff_activity
        ) rankings WHERE secondary_value > 0 OR primary_value > 0 ORDER BY ranking_type ASC, secondary_value DESC, primary_value DESC`,
        [now, now, now, now, now, now, now, now, now, now]
      ),

      // logged users
      this.getLoggedUsers(),

      // timers
      TimerRepository.getActive(),

      // rooms
      RoomRepository.getAll(),

      // pending service requests count
      ServiceRequestRepository.getPendingCount(),

      // withdrawals
      cajaId
        ? query<any[]>(
            `SELECT COALESCE(SUM(monto), 0) AS total FROM retiros_caja WHERE caja_id = ?`,
            [cajaId]
          )
        : Promise.resolve([{ total: 0 }])
    ]);

    // Step 3: Compute summary from data already fetched
    const cajaStats = cajaStatsRows[0] || {};
    const occupiedRooms = rooms.filter(room => Number(room.status) === 2).length;
    const freeRooms = rooms.filter(room => Number(room.status) === 1).length;
    const totalRooms = rooms.length;
    const expiringServices = timers.filter(timer => {
      const remaining = Number(timer.remainingTime || 0);
      return remaining > 0 && remaining <= 15 * 60;
    }).length;

    const openCashRegisters = cajaId ? 1 : 0;
    const pendingOrders = 0; // Will be filled from separate query if needed

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
      Number(comparisonBase.sales_yesterday || 0) + Number(comparisonBase.services_yesterday || 0);
    const totalWithdrawals = Number(withdrawalsRows[0]?.total || 0);
    const occupancyRate = totalRooms > 0 ? Math.round((occupiedRooms / totalRooms) * 100) : 0;
    const teamCoverageRate =
      totalTeamMembers > 0 ? Math.round((totalLoggedUsers / totalTeamMembers) * 100) : 0;
    const projectedRevenue = Math.round((movementToday / elapsedMinutesToday) * 24 * 60);
    const yesterdaySalesSameTime = Number(comparisonBase.sales_same_time_yesterday || 0);
    const todaySalesSameTime = Number(comparisonBase.sales_same_time_today || 0);

    // Build insights structure (same as getDashboardInsights)
    const insights = {
      comparisons: {
        salesToday: this.buildTrend(comparisonBase.sales_today, comparisonBase.sales_yesterday),
        servicesToday: this.buildTrend(
          comparisonBase.services_today,
          comparisonBase.services_yesterday
        ),
        movementToday: this.buildTrend(movementToday, movementYesterday),
        salesWeek: this.buildTrend(
          comparisonBase.sales_total_week,
          comparisonBase.sales_total_previous_week
        ),
        operationsWeek: this.buildTrend(
          comparisonBase.sales_count_week,
          comparisonBase.sales_count_previous_week
        )
      },
      localStatus: {
        rooms: { occupied: occupiedRooms, free: freeRooms, total: totalRooms, occupancyRate },
        services: { active: servicesActive, expiringSoon: expiringServices },
        orders: { open: pendingOrders, serviceRequests: pendingServiceRequestsCount },
        team: { active: totalLoggedUsers, total: totalTeamMembers, coverageRate: teamCoverageRate },
        cash: { openRegisters: openCashRegisters }
      },
      rankings: {
        products: rankingRows
          .filter(row => row.ranking_type === 'product')
          .slice(0, 5)
          .map(row => ({
            name: row.item_name,
            quantity: Number(row.primary_value || 0),
            amount: Number(row.secondary_value || 0)
          })),
        rooms: rankingRows
          .filter(row => row.ranking_type === 'room')
          .slice(0, 5)
          .map(row => ({
            name: row.item_name,
            quantity: Number(row.primary_value || 0),
            amount: Number(row.secondary_value || 0)
          })),
        staff: rankingRows
          .filter(row => row.ranking_type === 'staff')
          .slice(0, 5)
          .map(row => ({
            name: row.item_name,
            quantity: Number(row.primary_value || 0),
            amount: Number(row.secondary_value || 0)
          }))
      },
      financialSummary: {
        openingAmount: Number(cajaRow?.monto_apertura || 0),
        sales: Number(cajaStats.total_ventas || 0),
        services: Number(cajaStats.total_servicios || 0),
        tips: Number(cajaRow?.propina || 0),
        advances: Number(cajaRow?.anticipo || 0),
        returns: Number(cajaRow?.devolucion || 0),
        withdrawals: totalWithdrawals,
        netRevenue:
          Number(cajaStats.total_ventas || 0) +
          Number(cajaStats.total_servicios || 0) +
          Number(cajaRow?.propina || 0) -
          Number(cajaRow?.devolucion || 0) -
          totalWithdrawals
      },
      forecast: {
        projectedRevenue,
        currentRevenue: movementToday,
        yesterdayRevenue: movementYesterday,
        elapsedMinutesToday,
        anomalies: this.buildAnomalies(
          todaySalesSameTime,
          yesterdaySalesSameTime,
          pendingOrders,
          expiringServices
        )
      }
    };

    // Get recent activity
    const recentActivity = await this.getRecentActivity(8);

    // Get pending orders count
    const pendingOrdersResult = await query<any[]>(
      `SELECT COUNT(*) as total FROM pedidos WHERE estado = 1`
    );
    insights.localStatus.orders.open = Number(pendingOrdersResult[0]?.total || 0);

    // Build cajaStats structure (same as getCajaGeneralStats)
    const cajaStatsResult = {
      caja_id: cajaId,
      monto_apertura: parseFloat(cajaRow?.monto_apertura || '0'),
      efectivo_en_caja:
        parseFloat(cajaRow?.monto_apertura || '0') + parseFloat(cajaRow?.efectivo || '0'),
      total_efectivo: parseFloat(cajaRow?.efectivo || '0'),
      total_tarjeta: parseFloat(cajaRow?.tarjeta || '0'),
      total_transferencia: parseFloat(cajaRow?.transferencia || '0'),
      total_anticipo: parseFloat(cajaRow?.anticipo || '0'),
      total_devolucion: parseFloat(cajaRow?.devolucion || '0'),
      total_comision: parseFloat(cajaRow?.comision || '0'),
      total_propina: parseFloat(cajaRow?.propina || '0'),
      total_iva: parseFloat(cajaRow?.iva || '0'),
      total_ventas: parseFloat(cajaStats.total_ventas || '0'),
      cantidad_ventas: parseInt(cajaStats.cantidad_ventas || '0'),
      total_servicios: parseFloat(cajaStats.total_servicios || '0'),
      cantidad_servicios: parseInt(cajaStats.cantidad_servicios || '0'),
      balance_total:
        parseFloat(cajaRow?.monto_apertura || '0') +
        parseFloat(cajaRow?.efectivo || '0') +
        parseFloat(cajaRow?.tarjeta || '0') +
        parseFloat(cajaRow?.transferencia || '0') -
        parseFloat(cajaRow?.anticipo || '0') -
        parseFloat(cajaRow?.devolucion || '0'),
      tiempo_abierta_horas: cajaRow?.horas_abierta || 0,
      tiempo_abierta_minutos: cajaRow?.minutos_abierta || 0,
      fecha_apertura_raw: cajaRow?.fecha_apertura || null,
      usuario_id_apertura: cajaRow?.usuario_id_apertura || null
    };

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
          totalPendingOrders: Number(pendingOrdersResult[0]?.total || 0),
          totalPendingServiceRequests: pendingServiceRequestsCount,
          totalVisibleItems: 5 + Math.min(pendingServiceRequestsCount, 5)
        }
      }
    };
  }

  private static async getPendingOrders(limit: number) {
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
  }

  private static buildAnomalies(
    todaySalesSameTime: number,
    yesterdaySalesSameTime: number,
    pendingOrders: number,
    expiringServices: number
  ) {
    const anomalies: Array<{
      id: string;
      tone: 'success' | 'warning' | 'critical';
      title: string;
      description: string;
    }> = [];

    if (yesterdaySalesSameTime > 0 && todaySalesSameTime <= yesterdaySalesSameTime * 0.75) {
      anomalies.push({
        id: 'sales-drop',
        tone: 'critical',
        title: 'Ventas por debajo del ritmo esperado',
        description: 'El acumulado de hoy va por debajo de lo registrado a esta misma hora ayer.'
      });
    } else if (yesterdaySalesSameTime > 0 && todaySalesSameTime >= yesterdaySalesSameTime * 1.25) {
      anomalies.push({
        id: 'sales-boost',
        tone: 'success',
        title: 'Ventas aceleradas',
        description: 'El día avanza por encima del ritmo de ventas observado ayer a esta hora.'
      });
    }

    if (pendingOrders >= 5) {
      anomalies.push({
        id: 'order-backlog',
        tone: 'warning',
        title: 'Acumulación en pedidos',
        description: 'Hay una carga operativa alta en pedidos pendientes que conviene destrabar.'
      });
    }

    if (expiringServices >= 3) {
      anomalies.push({
        id: 'service-pressure',
        tone: 'warning',
        title: 'Servicios próximos a vencer',
        description: 'Varios servicios están cerca de expirar y requieren atención del equipo.'
      });
    }

    return anomalies;
  }

  static async getUserDashboardSummary(userId: string, role: string) {
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
        ? (query('SELECT id_pedido, estado FROM pedidos WHERE mesero_id = ?', [userId]) as Promise<
            any[]
          >)
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
        SELECT COUNT(DISTINCT YEARWEEK(fecha, 1)) as semanas 
        FROM asistencias 
        WHERE usuario_id = ? AND estado = 1 AND DAYOFWEEK(fecha) IN (3,4,5,6,7,1)`,
        [userId]
      ) as Promise<any[]>
    ]);

    const filterEstado1 = (arr: any[]) => arr.filter(i => i.estado === 1);

    const anticiposPendientesArr = filterEstado1(anticipos);
    const totalAnticiposPendientes = anticiposPendientesArr.reduce((s, a) => s + (a.monto || 0), 0);

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
  }
}
