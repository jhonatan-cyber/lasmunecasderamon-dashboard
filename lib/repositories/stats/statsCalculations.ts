type RankingRow = {
  ranking_type: 'product' | 'room' | 'staff' | string;
  item_name: string;
  primary_value: number | string;
  secondary_value: number | string;
};

type TrendDirection = 'up' | 'down' | 'flat';

export function buildTrend(current: number, previous: number) {
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
    direction: (delta > 0 ? 'up' : delta < 0 ? 'down' : 'flat') as TrendDirection
  };
}

export function buildRankings(rankingRows: RankingRow[]) {
  const buildGroup = (type: RankingRow['ranking_type']) =>
    rankingRows
      .filter(row => row.ranking_type === type)
      .slice(0, 5)
      .map(row => ({
        name: row.item_name,
        quantity: Number(row.primary_value || 0),
        amount: Number(row.secondary_value || 0)
      }));

  return {
    products: buildGroup('product'),
    rooms: buildGroup('room'),
    staff: buildGroup('staff')
  };
}

export function buildFinancialSummary({
  openingAmount,
  sales,
  services,
  tips,
  advances,
  returns,
  withdrawals
}: {
  openingAmount: number;
  sales: number;
  services: number;
  tips: number;
  advances: number;
  returns: number;
  withdrawals: number;
}) {
  return {
    openingAmount,
    sales,
    services,
    tips,
    advances,
    returns,
    withdrawals,
    netRevenue: sales + services + tips - returns - withdrawals
  };
}

export function buildAnomalies({
  todaySalesSameTime,
  yesterdaySalesSameTime,
  pendingOrders,
  expiringServices
}: {
  todaySalesSameTime: number;
  yesterdaySalesSameTime: number;
  pendingOrders: number;
  expiringServices: number;
}) {
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

export type { RankingRow };
