import { beforeEach, expect, it, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useDashboardSummary } from '@/hooks/statistics/useDashboardSummary';

const mocks = vi.hoisted(() => ({ user: vi.fn(), query: vi.fn() }));
vi.mock('@/hooks/auth/useCurrentUser', () => ({ useCurrentUser: mocks.user }));
vi.mock('@tanstack/react-query', () => ({ useQuery: mocks.query }));
vi.mock('@/lib/api/queryClient', () => ({
  queryKeys: { dashboard: { summary: () => ['dashboard', 'summary'] } }
}));

beforeEach(() => vi.clearAllMocks());

it('espera a que la sesión esté confirmada antes de consultar el resumen', () => {
  mocks.user.mockReturnValue({ user: null, loading: true });
  const { rerender } = renderHook(() => useDashboardSummary());
  expect(mocks.query.mock.lastCall![0].enabled).toBe(false);
  mocks.user.mockReturnValue({ user: { id: 7, role: 'anfitriona' }, loading: false });
  rerender();
  expect(mocks.query.mock.lastCall![0].enabled).toBe(true);
});

it('separa el resumen cuando cambia la cuenta del usuario', () => {
  mocks.user.mockReturnValue({ user: { id: 7, role: 'anfitriona' }, loading: false });
  const { rerender } = renderHook(() => useDashboardSummary());
  const firstKey = mocks.query.mock.lastCall![0].queryKey;
  mocks.user.mockReturnValue({ user: { id: 8, role: 'anfitriona' }, loading: false });
  rerender();
  expect(mocks.query.mock.lastCall![0].queryKey).not.toEqual(firstKey);
});
