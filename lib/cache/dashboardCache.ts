/**
 * Cache en memoria para endpoints del dashboard.
 * Sigue el mismo patrón que PermissionsCache.
 * Cada endpoint tiene su propio TTL configurable.
 */

interface CacheEntry<T = unknown> {
  data: T;
  expiresAt: number;
}

interface CacheConfig {
  /** Tiempo de vida en milisegundos */
  ttlMs: number;
}

const DEFAULT_TTL_MS = 15_000; // 15 segundos

const configs = new Map<string, CacheConfig>();
const cache = new Map<string, CacheEntry>();

function getConfigKey(key: string): string {
  return `__config__${key}`;
}

export const DashboardCache = {
  /**
   * Obtiene un valor del caché si no ha expirado.
   */
  get<T>(key: string): T | null {
    const entry = cache.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      cache.delete(key);
      return null;
    }
    return entry.data as T;
  },

  /**
   * Almacena un valor en el caché con el TTL configurado para esta key.
   */
  set<T>(key: string, data: T): void {
    const configKey = getConfigKey(key);
    const config = configs.get(configKey) ?? { ttlMs: DEFAULT_TTL_MS };
    cache.set(key, {
      data,
      expiresAt: Date.now() + config.ttlMs
    });
  },

  /**
   * Configura el TTL para una key específica (o patrón de keys).
   */
  configure(key: string, config: Partial<CacheConfig>): void {
    const existing = configs.get(getConfigKey(key));
    configs.set(getConfigKey(key), {
      ttlMs: config.ttlMs ?? existing?.ttlMs ?? DEFAULT_TTL_MS
    });
  },

  /**
   * Obtiene o calcula un valor. Si está en caché y vigente, lo retorna.
   * Si no, ejecuta la función fetch, almacena el resultado y lo retorna.
   */
  async getOrFetch<T>(
    key: string,
    fetch: () => Promise<T>,
    ttlMs?: number
  ): Promise<{ data: T; fromCache: boolean }> {
    if (ttlMs !== undefined) {
      DashboardCache.configure(key, { ttlMs });
    }

    const cached = DashboardCache.get<T>(key);
    if (cached !== null) {
      return { data: cached, fromCache: true };
    }

    const data = await fetch();
    DashboardCache.set(key, data);
    return { data, fromCache: false };
  },

  /**
   * Invalida una entrada específica del caché.
   */
  invalidate(key: string): void {
    cache.delete(key);
  },

  /**
   * Invalida todas las entradas cuyo key comience con el prefijo dado.
   */
  invalidateByPrefix(prefix: string): void {
    for (const key of cache.keys()) {
      if (key.startsWith(prefix)) {
        cache.delete(key);
      }
    }
  },

  /**
   * Invalida múltiples keys a la vez.
   */
  invalidateMany(keys: string[]): void {
    for (const key of keys) {
      cache.delete(key);
    }
  },

  /**
   * Limpia entradas expiradas.
   */
  purgeExpired(): void {
    const now = Date.now();
    for (const [key, entry] of cache.entries()) {
      if (now > entry.expiresAt) cache.delete(key);
    }
  },

  /**
   * Limpia todo el caché.
   */
  clear(): void {
    cache.clear();
  },

  /**
   * Retorna la cantidad de entradas en caché.
   */
  size(): number {
    return cache.size;
  }
};

// ================================================================
// Invalidación automática — se llama desde servicios que modifican datos
// ================================================================

/**
 * Invalida las entradas del caché del dashboard que dependen de datos
 * de ventas, servicios o pedidos. Se llama automáticamente desde:
 * - SaleService.createSale()
 * - ServiceService.createService()
 * - OrderService.create()
 *
 * Para invalidación más granular (e.g. solo un usuario específico),
 * pasar userId en las opciones.
 */
export function invalidateDashboardCache(options?: {
  userId?: string;
}): void {
  const keysToInvalidate = [
    DASHBOARD_CACHE_KEYS.COMPOSITE,
    DASHBOARD_CACHE_KEYS.INSIGHTS,
    DASHBOARD_CACHE_KEYS.ALERTS,
    DASHBOARD_CACHE_KEYS.PENDING_ITEMS,
    DASHBOARD_CACHE_KEYS.SALES_CHART,
    DASHBOARD_CACHE_KEYS.STATS,
    DASHBOARD_CACHE_KEYS.RECENT_ACTIVITY,
    DASHBOARD_CACHE_KEYS.LOGGED_USERS
  ];

  DashboardCache.invalidateMany(keysToInvalidate);

  // Invalidar también las variantes con offset de sales-by-month/week
  DashboardCache.invalidateByPrefix('dashboard:sales-by-month:');
  DashboardCache.invalidateByPrefix('dashboard:sales-by-week:');

  // Invalidar el resumen del usuario si se proporcionó
  if (options?.userId) {
    DashboardCache.invalidate(DASHBOARD_CACHE_KEYS.USER_SUMMARY(options.userId));
  }
}

// Purga automática cada 30 segundos
if (typeof setInterval !== 'undefined') {
  setInterval(() => DashboardCache.purgeExpired(), 30_000);
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
  USER_SUMMARY: (userId: string) => `dashboard:user-summary:${userId}`
} as const;

// TTLs por endpoint (en ms)
export const DASHBOARD_TTL = {
  COMPOSITE: 15_000,      // 15s — el más costoso
  INSIGHTS: 15_000,       // 15s — costoso
  ALERTS: 10_000,         // 10s — cambia frecuentemente
  PENDING_ITEMS: 10_000,  // 10s — cambios frecuentes
  SALES_CHART: 30_000,    // 30s — datos históricos
  STATS: 15_000,          // 15s — stats mensuales
  RECENT_ACTIVITY: 15_000,// 15s — actividad reciente
  LOGGED_USERS: 30_000,   // 30s — rara vez cambia
  SALES_BY_MONTH: 30_000, // 30s — datos históricos
  SALES_BY_WEEK: 30_000,  // 30s — datos históricos
  USER_SUMMARY: 15_000    // 15s — por usuario
} as const;
