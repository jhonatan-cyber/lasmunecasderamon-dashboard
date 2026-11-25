vi.unmock('@tanstack/react-query');

import { QueryClient } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { indexedDBCache } from '@/lib/utils/indexedDBCache';
import { clearPersistedQueries, setupQueryPersistence } from '@/lib/utils/queryPersistence';

vi.mock('@/lib/utils/indexedDBCache', () => ({
  indexedDBCache: {
    prune: vi.fn().mockResolvedValue(0),
    clear: vi.fn().mockResolvedValue(undefined),
    get: vi.fn().mockResolvedValue(null),
    set: vi.fn().mockResolvedValue(undefined)
  }
}));

vi.mock('@/lib/utils/logger', () => ({ default: { debug: vi.fn() } }));

const queryKey = ['dashboard', 'composite'] as const;
const accountOneCacheKey = 'rq:user:1:["dashboard","composite"]';
const accountTwoCacheKey = 'rq:user:2:["dashboard","composite"]';

function createQueryClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } });
}

function failQueryOffline(queryClient: QueryClient) {
  const query = queryClient.getQueryCache().build(queryClient, {
    queryKey,
    queryFn: async () => undefined
  });

  query.setState({
    ...query.state,
    status: 'error',
    fetchStatus: 'idle',
    data: undefined,
    error: new Error('offline'),
    errorUpdatedAt: Date.now(),
    errorUpdateCount: query.state.errorUpdateCount + 1
  });

  return query;
}

describe('persistencia de consultas por identidad', () => {
  const entries = new Map<string, unknown>();

  beforeEach(() => {
    entries.clear();
    vi.clearAllMocks();
    vi.mocked(indexedDBCache.get).mockImplementation(async <T>(key: string) => {
      const data = entries.get(key);
      return data === undefined ? null : { data: data as T };
    });
    vi.mocked(indexedDBCache.set).mockImplementation(async (key, data) => {
      entries.set(key, data);
    });
  });

  it('restaura datos offline para la misma cuenta, pero no para otra', async () => {
    const accountOne = createQueryClient();
    const stopAccountOne = setupQueryPersistence(accountOne, 1);
    const dashboardData = { data: { private: 'account one' } };

    accountOne.setQueryData(queryKey, dashboardData);
    await vi.waitFor(() => expect(entries.get(accountOneCacheKey)).toEqual(dashboardData));

    const sameAccountClient = createQueryClient();
    const stopSameAccount = setupQueryPersistence(sameAccountClient, 1);
    const restoredQuery = failQueryOffline(sameAccountClient);

    await vi.waitFor(() => expect(restoredQuery.state.data).toEqual(dashboardData));

    const accountTwo = createQueryClient();
    const stopAccountTwo = setupQueryPersistence(accountTwo, 2);
    const isolatedQuery = failQueryOffline(accountTwo);

    await vi.waitFor(() => expect(indexedDBCache.get).toHaveBeenCalledWith(accountTwoCacheKey));
    expect(isolatedQuery.state.data).toBeUndefined();
    expect(entries.has(accountTwoCacheKey)).toBe(false);

    stopAccountOne();
    stopSameAccount();
    stopAccountTwo();
  });

  it('limpia solo el namespace persistido de la cuenta indicada', async () => {
    await clearPersistedQueries(2);

    expect(indexedDBCache.clear).toHaveBeenCalledWith('rq:user:2:');
  });
});
