import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useDashboardComposite } from '@/hooks/statistics/useDashboardComposite';

const mocks = vi.hoisted(() => ({ useQuery: vi.fn(), captureException: vi.fn() }));

vi.mock('@tanstack/react-query', () => ({ useQuery: mocks.useQuery }));
vi.mock('@/lib/api/queryClient', () => ({
  queryKeys: { dashboard: { composite: () => ['dashboard', 'composite'] } }
}));
vi.mock('@/lib/utils/logger', () => ({
  default: { captureException: mocks.captureException }
}));

beforeEach(() => {
  vi.clearAllMocks();
  mocks.useQuery.mockImplementation((options: unknown) => options);
});

afterEach(() => vi.unstubAllGlobals());

it('rechaza una respuesta incompleta del contrato composite', async () => {
  const invalidData = { insights: {} };
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, data: invalidData })
    })
  );

  const { result } = renderHook(() => useDashboardComposite());
  const queryOptions = result.current as unknown as {
    queryFn: (context: { signal: AbortSignal }) => Promise<unknown>;
  };

  await expect(queryOptions.queryFn({ signal: new AbortController().signal })).rejects.toThrow(
    'La respuesta del dashboard no cumple el contrato esperado'
  );
  expect(mocks.captureException).toHaveBeenCalledOnce();
});
