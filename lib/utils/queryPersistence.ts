'use client';

import type { QueryClient } from '@tanstack/react-query';
import { indexedDBCache } from './indexedDBCache';
import logger from './logger';

/**
 * Converts a React Query key array to a stable IndexedDB key string.
 */
function queryKeyToCacheKey(queryKey: readonly unknown[]): string {
  return `rq:${JSON.stringify(queryKey)}`;
}

/**
 * Checks if a query key should be excluded from IndexedDB persistence.
 */
function shouldExcludeQuery(queryKey: readonly unknown[]): boolean {
  const firstKey = String(queryKey[0] ?? '');
  return firstKey === 'auth' || firstKey === 'sse' || firstKey === 'notifications';
}

/**
 * Persistence adapter for React Query using IndexedDB.
 *
 * Provides:
 * - Save query results to IndexedDB on successful fetch
 * - Restore query results from IndexedDB when fetch fails (offline support)
 * - Automatic cache pruning on startup
 *
 * Usage: Call `setupQueryPersistence(queryClient)` after creating the QueryClient.
 */
export function setupQueryPersistence(queryClient: QueryClient): void {
  if (typeof window === 'undefined') return;

  // Prune expired entries on startup
  indexedDBCache.prune().then(count => {
    if (count > 0) {
      logger.debug('[QueryPersistence] Pruned expired entries', { count });
    }
  });

  // Subscribe to all query cache events
  const unsubscribe = queryClient.getQueryCache().subscribe(event => {
    if (event.type !== 'updated' && event.type !== 'added') return;
    if (!event.query) return;

    const query = event.query;
    const state = query.state;

    // Skip excluded query types
    if (shouldExcludeQuery(query.queryKey)) return;

    const cacheKey = queryKeyToCacheKey(query.queryKey);

    // On successful fetch: persist data to IndexedDB
    if (state.status === 'success' && state.data) {
      indexedDBCache.set(cacheKey, state.data).catch(() => {});
      return;
    }

    // On fetch error with no data: restore from cache
    if (state.status === 'error' && !state.data) {
      indexedDBCache
        .get(cacheKey)
        .then(cached => {
          if (cached?.data) {
            logger.debug('[QueryPersistence] Restored from cache', {
              queryKey: query.queryKey
            });
            queryClient.setQueryData(query.queryKey, cached.data);
          }
        })
        .catch(() => {});
      return;
    }
  });

  // When coming back online, refetch stale queries
  const handleOnline = () => {
    logger.debug('[QueryPersistence] Online, refetching stale queries');
    queryClient
      .refetchQueries({
        type: 'active' as any
      })
      .catch(() => {});
  };

  window.addEventListener('online', handleOnline);

  // Cleanup
  (queryClient as any).__queryPersistenceCleanup = () => {
    unsubscribe();
    window.removeEventListener('online', handleOnline);
  };
}

/**
 * Restores cached data for a specific query from IndexedDB.
 * Used for manually checking cache outside React Query lifecycle.
 */
export async function restoreFromCache<T = unknown>(
  queryKey: readonly unknown[]
): Promise<T | null> {
  const cacheKey = queryKeyToCacheKey(queryKey);
  const cached = await indexedDBCache.get<T>(cacheKey);
  return cached?.data ?? null;
}

/**
 * Manually persist query data to IndexedDB.
 */
export async function persistQueryData<T>(queryKey: readonly unknown[], data: T): Promise<void> {
  const cacheKey = queryKeyToCacheKey(queryKey);
  await indexedDBCache.set(cacheKey, data);
}

/**
 * Clear persisted data matching a query key prefix.
 * @param pattern - Query key prefix (e.g., ['dashboard'])
 */
export async function clearPersistedQueries(pattern: readonly unknown[]): Promise<void> {
  const prefix = queryKeyToCacheKey(pattern).replace(/\*$/, '');
  await indexedDBCache.clear(prefix);
}
