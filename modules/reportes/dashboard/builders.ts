import { buildShiftForecast } from './forecast';
import {
  buildAnomalies,
  buildFinancialSummary,
  buildRankings,
  buildTrend,
  type RankingRow
} from '@/modules/reportes/dashboard/calculos';

export type PendingDashboardItem = {
  id: string;
  code: string;
  title: string;
  subtitle: string;
  amount: number;
  createdAt: string;
  href: string;
  kind: 'order' | 'service_request';
};

type CajaStatsResultInput = {
  cajaId: string | null | undefined;
  cajaRow: any;
  cajaStats: {
    total_ventas: number | string;
    cantidad_ventas: number | string;
    total_servicios: number | string;
    cantidad_servicios: number | string;
  };
};

export function buildDashboardInsights({
  salesToday,
  salesYesterday,
  servicesToday,
  servicesYesterday,
  movementToday,
  movementYesterday,
  salesWeek,
  salesWeekPrevious,
  operationsWeek,
  operationsWeekPrevious,
  occupiedRooms,
  freeRooms,
  totalRooms,
  occupancyRate,
  servicesActive,
  expiringServices,
  pendingOrders,
  pendingServiceRequests,
  totalLoggedUsers,
  totalTeamMembers,
  teamCoverageRate,
  openCashRegisters,
  rankingRows,
  openingAmount,
  sales,
  services,
  tips,
  advances,
  returns,
  withdrawals,
  todaySalesSameTime,
  yesterdaySalesSameTime,
  elapsedMinutesToday
}: {
  salesToday: number;
  salesYesterday: number;
  servicesToday: number;
  servicesYesterday: number;
  movementToday: number;
  movementYesterday: number;
  salesWeek: number;
  salesWeekPrevious: number;
  operationsWeek: number;
  operationsWeekPrevious: number;
  occupiedRooms: number;
  freeRooms: number;
  totalRooms: number;
  occupancyRate: number;
  servicesActive: number;
  expiringServices: number;
  pendingOrders: number;
  pendingServiceRequests: number;
  totalLoggedUsers: number;
  totalTeamMembers: number;
  teamCoverageRate: number;
  openCashRegisters: number;
  rankingRows: RankingRow[];
  openingAmount: number;
  sales: number;
  services: number;
  tips: number;
  advances: number;
  returns: number;
  withdrawals: number;
  todaySalesSameTime: number;
  yesterdaySalesSameTime: number;
  elapsedMinutesToday: number;
}) {
  return {
    comparisons: {
      salesToday: buildTrend(salesToday, salesYesterday),
      servicesToday: buildTrend(servicesToday, servicesYesterday),
      movementToday: buildTrend(movementToday, movementYesterday),
      salesWeek: buildTrend(salesWeek, salesWeekPrevious),
      operationsWeek: buildTrend(operationsWeek, operationsWeekPrevious)
    },
    localStatus: {
      rooms: { occupied: occupiedRooms, free: freeRooms, total: totalRooms, occupancyRate },
      services: { active: servicesActive, expiringSoon: expiringServices },
      orders: { open: pendingOrders, serviceRequests: pendingServiceRequests },
      team: { active: totalLoggedUsers, total: totalTeamMembers, coverageRate: teamCoverageRate },
      cash: { openRegisters: openCashRegisters }
    },
    rankings: buildRankings(rankingRows),
    financialSummary: buildFinancialSummary({
      openingAmount,
      sales,
      services,
      tips,
      advances,
      returns,
      withdrawals
    }),
    forecast: {
      ...buildShiftForecast(),
      anomalies: buildAnomalies({
        todaySalesSameTime,
        yesterdaySalesSameTime,
        pendingOrders,
        expiringServices
      })
    }
  };
}

export function buildPendingDashboardItem(
  item: any,
  kind: 'order' | 'service_request'
): PendingDashboardItem {
  if (kind === 'order') {
    return {
      id: String(item.id),
      code: item.codigo || String(item.id),
      title: item.cliente_nombre || 'Sin cliente registrado',
      subtitle: item.mesero_nick || item.mesero_nombre || 'Sin garzón asignado',
      amount: Number(item.total || 0),
      createdAt: item.fecha_crea,
      href: '/orders',
      kind
    };
  }

  return {
    id: String(item.id_solicitud),
    code: item.codigo || String(item.id_solicitud),
    title: item.habitacion_nombre || 'Sin habitación',
    subtitle: item.cliente_nombre || 'Sin cliente registrado',
    amount: Number(item.total || 0),
    createdAt: item.fecha_solicitud,
    href: '/orders',
    kind
  };
}

export function buildCajaStatsResult({ cajaId, cajaRow, cajaStats }: CajaStatsResultInput) {
  return {
    caja_id: cajaId,
    monto_apertura: parseFloat(cajaRow?.monto_apertura || '0'),
    efectivo_en_caja:
      parseFloat(cajaRow?.monto_apertura || '0') + parseFloat(cajaRow?.efectivo || '0'),
    total_efectivo:
      parseFloat(cajaRow?.monto_apertura || '0') + parseFloat(cajaRow?.efectivo || '0'),
    total_tarjeta: parseFloat(cajaRow?.tarjeta || '0'),
    total_transferencia: parseFloat(cajaRow?.transferencia || '0'),
    total_anticipo: parseFloat(cajaRow?.anticipo || '0'),
    total_devolucion: parseFloat(cajaRow?.devolucion || '0'),
    total_comision: parseFloat(cajaRow?.comision || '0'),
    total_propina: parseFloat(cajaRow?.propina || '0'),
    total_iva: parseFloat(cajaRow?.iva || '0'),
    total_ventas: parseFloat(String(cajaStats.total_ventas || '0')),
    cantidad_ventas: parseInt(String(cajaStats.cantidad_ventas || '0')),
    total_servicios: parseFloat(String(cajaStats.total_servicios || '0')),
    cantidad_servicios: parseInt(String(cajaStats.cantidad_servicios || '0')),
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
}
