import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({
  role: 'barman',
  fetchData: vi.fn(),
  refetch: vi.fn(),
  request: vi.fn()
}));
vi.mock('@/hooks/auth/useCurrentUser', () => ({
  useCurrentUser: () => ({ user: { role: mocks.role } })
}));
vi.mock('@/hooks/shared/useGenericFetch', () => ({ useGenericFetch: mocks.fetchData }));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
import useAnticipos from '@/hooks/personal/useAnticipos';
beforeEach(() => {
  vi.clearAllMocks();
  mocks.fetchData.mockReturnValue({ data: [], isLoading: false, refetch: mocks.refetch });
  vi.stubGlobal('fetch', mocks.request);
  mocks.request.mockResolvedValue(Response.json({ success: true }));
});
describe('Acceso a la gestión de anticipos', () => {
  it('barman no se considera administrador y no procesa anticipos', async () => {
    mocks.role = 'Barman';
    const { result } = renderHook(() => useAnticipos());
    expect(result.current.isAdmin).toBe(false);
    expect(result.current.canDeliver).toBe(false);
    expect(mocks.fetchData).toHaveBeenCalledWith('/api/anticipos/user', expect.anything());
    for (const action of ['approve', 'reject', 'deliver'] as const)
      await act(async () => {
        expect(await result.current.processAnticipo('test', action)).toBe(false);
      });
    expect(mocks.request).not.toHaveBeenCalled();
  });
  it('el cajero entrega sin aprobar', async () => {
    mocks.role = 'cajero';
    const { result } = renderHook(() => useAnticipos());
    expect(result.current.isAdmin).toBe(false);
    await act(async () => {
      expect(await result.current.processAnticipo('test', 'approve')).toBe(false);
    });
    await act(async () => {
      expect(await result.current.processAnticipo('test', 'deliver')).toBe(true);
    });
    expect(mocks.request).toHaveBeenCalledOnce();
    expect(mocks.request).toHaveBeenCalledWith(
      '/api/anticipos/test',
      expect.objectContaining({ body: '{"estado":0}' })
    );
  });
  it('el administrador aprueba sin entregar', async () => {
    mocks.role = 'administrador';
    const { result } = renderHook(() => useAnticipos());
    await act(async () => {
      expect(await result.current.processAnticipo('test', 'deliver')).toBe(false);
    });
    await act(async () => {
      expect(await result.current.processAnticipo('test', 'approve')).toBe(true);
    });
    expect(mocks.request).toHaveBeenCalledOnce();
    expect(mocks.request).toHaveBeenCalledWith(
      '/api/anticipos/test',
      expect.objectContaining({ body: '{"estado":1}' })
    );
  });
});
