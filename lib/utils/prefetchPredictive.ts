'use client';

import { indexedDBCache } from './indexedDBCache';
import logger from './logger';

// ─── Route Adjacency Map ────────────────────────────────────────────
// Defines which routes to prefetch when the user is on a given page.

const ROUTE_ADJACENCY: Record<string, string[]> = {
  // Overview Section
  '/dashboard': ['/orders', '/sales', '/cash-register', '/users', '/reports'],
  '/reports': ['/dashboard', '/sales', '/orders', '/cash-register'],

  // Operation Section
  '/orders': ['/sales', '/cash-register', '/dashboard', '/accounts'],
  '/sales': ['/orders', '/cash-register', '/dashboard', '/accounts'],
  '/cash-register': ['/sales', '/orders', '/dashboard', '/accounts'],
  '/accounts': ['/sales', '/orders', '/cash-register', '/dashboard'],
  '/rooms': ['/private-rooms', '/accounts', '/dashboard'],
  '/private-rooms': ['/rooms', '/accounts', '/sales'],

  // Commercial Section
  '/clients': ['/products', '/categories', '/sales', '/accounts'],
  '/products': ['/categories', '/clients', '/orders'],
  '/categories': ['/products', '/clients'],

  // Finance Section
  '/tips': ['/commissions', '/payroll', '/advances', '/sales'],
  '/commissions': ['/tips', '/payroll', '/advances'],
  '/payroll': ['/payroll/calendar', '/tips', '/commissions', '/advances'],
  '/payroll/calendar': ['/payroll', '/tips', '/commissions'],
  '/advances': ['/tips', '/commissions', '/payroll', '/gratificaciones'],
  '/gratificaciones': ['/advances', '/tips', '/payroll'],
  '/returns': ['/sales', '/orders', '/accounts'],

  // Team Section
  '/users': ['/roles', '/attendance', '/overtime', '/dashboard'],
  '/roles': ['/users', '/attendance', '/settings'],
  '/attendance': ['/users', '/overtime', '/dashboard'],
  '/overtime': ['/attendance', '/users', '/payroll'],

  // Settings
  '/settings': ['/users', '/roles', '/dashboard']
};

// ─── Route → API Endpoint Mapping ───────────────────────────────────

const ROUTE_API_ENDPOINTS: Record<string, string[]> = {
  '/dashboard': ['/api/dashboard/composite', '/api/stats/dashboard-summary'],
  '/orders': ['/api/orders'],
  '/sales': ['/api/sales'],
  '/cash-register': ['/api/cashregister'],
  '/accounts': ['/api/cuentas'],
  '/rooms': ['/api/rooms'],
  '/private-rooms': ['/api/rooms'],
  '/clients': ['/api/clients'],
  '/products': ['/api/products'],
  '/categories': ['/api/categories'],
  '/tips': ['/api/tips'],
  '/commissions': ['/api/commissions'],
  '/payroll': ['/api/payroll'],
  '/payroll/calendar': ['/api/payroll'],
  '/advances': ['/api/anticipos'],
  '/gratificaciones': ['/api/gratificaciones'],
  '/returns': [],
  '/users': ['/api/users'],
  '/roles': ['/api/roles'],
  '/attendance': ['/api/attendance'],
  '/overtime': ['/api/overtime'],
  '/settings': ['/api/configurations'],
  '/reports': ['/api/reports/cash-register', '/api/reports/commissions', '/api/reports/sales']
};

// ─── Endpoint → React Query Key Mapping ─────────────────────────────
// Maps API endpoints to their corresponding React Query keys so that
// prefetched data is stored under the same rq:... keys that
// setupQueryPersistence.restoreFromCache() expects.

const ENDPOINT_TO_QUERY_KEY: Record<string, string[]> = {
  '/api/dashboard/composite': ['dashboard', 'composite'],
  '/api/stats/dashboard-summary': ['dashboard', 'summary'],
  '/api/orders': ['orders'],
  '/api/sales': ['sales'],
  '/api/cashregister': ['cashRegister'],
  '/api/cuentas': ['cuentas'],
  '/api/rooms': ['rooms'],
  '/api/clients': ['clients'],
  '/api/products': ['products'],
  '/api/categories': ['categories'],
  '/api/tips': ['tips'],
  '/api/commissions': ['commissions'],
  '/api/payroll': ['payroll'],
  '/api/anticipos': ['advances'],
  '/api/gratificaciones': ['gratifications'],
  '/api/users': ['users'],
  '/api/roles': ['roles'],
  '/api/attendance': ['attendance'],
  '/api/overtime': ['overtime'],
  '/api/configurations': ['settings'],
  '/api/reports/cash-register': ['reports', 'cashRegister'],
  '/api/reports/commissions': ['reports', 'commissions'],
  '/api/reports/sales': ['reports', 'sales']
};

// ─── Prefetch Implementation ──────────────────────────────────────

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const PREFETCH_DELAY = 300; // ms to wait before prefetching

let prefetchTimer: ReturnType<typeof setTimeout> | null = null;

type PrefetchOptions = {
  /** Delay in ms before starting prefetch (default: 300) */
  delay?: number;
  /** Enable logging of prefetched routes */
  debug?: boolean;
};

/**
 * Prefetches API data for routes adjacent to the current route.
 * Data is cached in IndexedDB under the same `rq:` keys that React Query
 * uses, making it available offline and on quick navigation.
 *
 * @param currentRoute - The current pathname (e.g., '/dashboard')
 * @param options - Prefetch options
 */
export function prefetchAdjacentRoutes(currentRoute: string, options: PrefetchOptions = {}): void {
  const { delay = PREFETCH_DELAY, debug = false } = options;

  if (typeof window === 'undefined') return;

  // Clear any pending prefetch
  if (prefetchTimer) {
    clearTimeout(prefetchTimer);
  }

  const routesToPrefetch = ROUTE_ADJACENCY[currentRoute];
  if (!routesToPrefetch) {
    if (debug) logger.debug('[Prefetch] No adjacency map for', currentRoute);
    return;
  }

  // Schedule prefetch to avoid blocking UI
  prefetchTimer = setTimeout(() => {
    if (debug) {
      logger.debug('[Prefetch] Starting for', { currentRoute, targets: routesToPrefetch });
    }

    for (const targetRoute of routesToPrefetch) {
      const endpoints = ROUTE_API_ENDPOINTS[targetRoute];
      if (!endpoints) continue;

      for (const endpoint of endpoints) {
        prefetchEndpoint(endpoint);
      }
    }

    prefetchTimer = null;
  }, delay);
}

/**
 * Prefetches a single API endpoint and caches it in IndexedDB under the
 * same `rq:` key prefix that React Query's setupQueryPersistence uses.
 * Skips if data is already cached and fresh.
 */
async function prefetchEndpoint(endpoint: string): Promise<void> {
  try {
    const queryKey = ENDPOINT_TO_QUERY_KEY[endpoint];
    if (!queryKey) return; // No matching query key, can't store usefully

    const cacheKey = `rq:${JSON.stringify(queryKey)}`;

    // Skip if already cached and fresh
    const cached = await indexedDBCache.get<any>(cacheKey);
    if (cached) {
      return; // Data is fresh enough
    }

    const response = await fetch(endpoint, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include'
    });

    if (!response.ok) return;

    const data = await response.json();
    // Only cache successful responses to avoid caching error objects
    if (data && typeof data === 'object' && (data as any).success === false) return;
    await indexedDBCache.set(cacheKey, data, CACHE_TTL);
  } catch {
    // Silently ignore — prefetch failures are non-critical
  }
}

/**
 * Manually prefetch a specific route's data.
 * Useful for prefetching on hover or other user interactions.
 */
export function prefetchRoute(route: string): void {
  const endpoints = ROUTE_API_ENDPOINTS[route];
  if (!endpoints) return;

  for (const endpoint of endpoints) {
    prefetchEndpoint(endpoint);
  }
}

/**
 * Get the predicted next routes for the current route.
 * Useful for debugging or building quick links UI.
 */
export function getPredictedRoutes(currentRoute: string): string[] {
  return ROUTE_ADJACENCY[currentRoute] ?? [];
}
