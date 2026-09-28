import { RedisDashboardCache } from './redisDashboardCache';
import { redisNamespace } from './redisKeys';

export const DashboardCache = new RedisDashboardCache(
  process.env.REDIS_URL || 'redis://127.0.0.1:6379',
  `lmr:dashboard:v1:${redisNamespace()}:`
);

export async function invalidateDashboardCache(): Promise<void> {
  await DashboardCache.invalidate();
}

// Keys del caché para cada endpoint
export const DASHBOARD_CACHE_KEYS = {
  COMPOSITE: 'dashboard:composite',
  INSIGHTS: 'dashboard:insights',
  ALERTS: 'dashboard:alerts',
  PENDING_ITEMS: 'dashboard:pending-items',
  SALES_CHART: 'dashboard:sales-chart',
  STATS: 'dashboard:stats',
  RECENT_ACTIVITY: 'dashboard:recent-activity',
  LOGGED_USERS: 'dashboard:logged-users',
  SALES_BY_MONTH: (offset: number) => `dashboard:sales-by-month:${offset}`,
  SALES_BY_WEEK: (offset: number) => `dashboard:sales-by-week:${offset}`,
  USER_SUMMARY: (userId: string, role: string) =>
    `dashboard:user-summary:${encodeURIComponent(userId)}:${encodeURIComponent(role)}`,
  // Ventas por categoría dentro de una caja (/api/caja/ventas-*).
  SALES_CHART_BY_CAJA: (
    cajaId: string,
    tipo: 'barras' | 'champagne' | 'tragos-chicas' | 'productos'
  ) => `dashboard:sales-chart:${tipo}:${encodeURIComponent(cajaId)}`
} as const;

// TTLs por endpoint (en ms)
export const DASHBOARD_TTL = {
  COMPOSITE: 15_000, // 15s — el más costoso
  INSIGHTS: 15_000, // 15s — costoso
  ALERTS: 10_000, // 10s — cambia frecuentemente
  PENDING_ITEMS: 10_000, // 10s — cambios frecuentes
  SALES_CHART: 30_000, // 30s — datos históricos
  SALES_CHART_BY_CAJA: 15_000, // 15s — cambia con cada venta de la caja
  STATS: 15_000, // 15s — stats mensuales
  RECENT_ACTIVITY: 15_000, // 15s — actividad reciente
  LOGGED_USERS: 30_000, // 30s — rara vez cambia
  SALES_BY_MONTH: 30_000, // 30s — datos históricos
  SALES_BY_WEEK: 30_000, // 30s — datos históricos
  USER_SUMMARY: 15_000 // 15s — por usuario
} as const;
