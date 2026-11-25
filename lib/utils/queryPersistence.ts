'use client';

import type { QueryClient } from '@tanstack/react-query';
import { indexedDBCache } from './indexedDBCache';
import logger from './logger';

type UserId = string | number;

const pendingWritesByUser = new Map<string, Set<Promise<void>>>();
const persistenceCleanupByClient = new WeakMap<QueryClient, () => void>();

/**
 * Returns the IndexedDB namespace for a user's query data.
 */
function userCachePrefix(userId: UserId): string {
  return `rq:user:${encodeURIComponent(String(userId))}:`;
}

/**
 * Converts a user ID and React Query key to a stable IndexedDB key string.
 */
export function getPersistedQueryCacheKey(userId: UserId, queryKey: readonly unknown[]): string {
  return `${userCachePrefix(userId)}${JSON.stringify(queryKey)}`;
}

function persistForUser(
  userId: UserId,
  queryKey: readonly unknown[],
  data: unknown
): Promise<void> {
  const prefix = userCachePrefix(userId);
  const pendingWrites = pendingWritesByUser.get(prefix) ?? new Set<Promise<void>>();
  pendingWritesByUser.set(prefix, pendingWrites);

  const write = indexedDBCache
    .set(getPersistedQueryCacheKey(userId, queryKey), data)
    .catch(() => {})
    .finally(() => {
      pendingWrites.delete(write);
      if (pendingWrites.size === 0) pendingWritesByUser.delete(prefix);
    });
  pendingWrites.add(write);

  return write;
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
 * Usage: Call `setupQueryPersistence(queryClient, userId)` after creating the QueryClient.
 */
export function setupQueryPersistence(queryClient: QueryClient, userId: UserId): () => void {
  if (typeof window === 'undefined') return () => {};

  stopQueryPersistence(queryClient);
  let isActive = true;

  // Remove entries written by older versions without an identity namespace.
  void indexedDBCache.clear('rq:[');

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

    const cacheKey = getPersistedQueryCacheKey(userId, query.queryKey);

    // On successful fetch: persist data to IndexedDB
    if (state.status === 'success' && state.data) {
      void persistForUser(userId, query.queryKey, state.data);
      return;
    }

    // On fetch error with no data: restore from cache
    if (state.status === 'error' && !state.data) {
      indexedDBCache
        .get(cacheKey)
        .then(cached => {
          if (isActive && cached?.data) {
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

  const cleanup = () => {
    if (!isActive) return;
    isActive = false;
    unsubscribe();
    window.removeEventListener('online', handleOnline);
    persistenceCleanupByClient.delete(queryClient);
  };

  persistenceCleanupByClient.set(queryClient, cleanup);
  return cleanup;
}

/** Stops persistence and any pending cache restoration for a query client. */
export function stopQueryPersistence(queryClient: QueryClient): void {
  persistenceCleanupByClient.get(queryClient)?.();
}

/**
 * Restores cached data for a specific query from IndexedDB.
 * Used for manually checking cache outside React Query lifecycle.
 */
export async function restoreFromCache<T = unknown>(
  userId: UserId,
  queryKey: readonly unknown[]
): Promise<T | null> {
  const cacheKey = getPersistedQueryCacheKey(userId, queryKey);
  const cached = await indexedDBCache.get<T>(cacheKey);
  return cached?.data ?? null;
}

/**
 * Manually persist query data to IndexedDB.
 */
export async function persistQueryData<T>(
  userId: UserId,
  queryKey: readonly unknown[],
  data: T
): Promise<void> {
  await persistForUser(userId, queryKey, data);
}

/**
 * Clear persisted data matching a query key prefix.
 * @param userId - Owner of the persisted query data.
 * @param pattern - Optional query key prefix (e.g., ['dashboard']).
 */
export async function clearPersistedQueries(
  userId: UserId,
  pattern?: readonly unknown[]
): Promise<void> {
  const userPrefix = userCachePrefix(userId);
  const pendingWrites = pendingWritesByUser.get(userPrefix);
  if (pendingWrites?.size) await Promise.all([...pendingWrites]);

  const queryPrefix = pattern?.length
    ? `${userPrefix}${JSON.stringify(pattern).slice(0, -1)}`
    : userPrefix;
  await indexedDBCache.clear(queryPrefix);
}
