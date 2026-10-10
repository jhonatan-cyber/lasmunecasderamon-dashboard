import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, renderHook } from '@testing-library/react';
import { useProductSearch } from '@/hooks/cuentas/useProductSearch';
vi.mock('@/lib/utils/logger', () => ({ default: { captureException: vi.fn() } }));
const response = (id: string) => ({
  ok: true,
  json: async () => ({ success: true, data: [{ id }] })
});
beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});
const advance = async () => {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(300);
  });
};

describe('búsqueda de productos en cuentas', () => {
  it.each([false, true])(
    'ignora respuestas anteriores al cambiar o limpiar la búsqueda: %s',
    async clear => {
      let finish!: (value: ReturnType<typeof response>) => void;
      const request = vi.fn().mockImplementationOnce(
        () =>
          new Promise(resolve => {
            finish = resolve;
          })
      );
      request.mockResolvedValueOnce(response('nuevo'));
      vi.stubGlobal('fetch', request);
      const { result } = renderHook(() => useProductSearch());
      act(() => result.current.handleSearchChange('anterior'));
      await advance();
      act(() => {
        if (clear) result.current.handleClearSearch();
        else result.current.handleSearchChange('nuevo');
      });
      expect(request.mock.calls[0][1].signal.aborted).toBe(true);
      await advance();
      await act(async () => {
        finish(response('anterior'));
      });
      expect(result.current.searchResults).toEqual(clear ? [] : [{ id: 'nuevo' }]);
      expect(result.current.searchLoading).toBe(false);
    }
  );
  it('acepta únicamente listas de resultados y recorta espacios', async () => {
    const request = vi
      .fn()
      .mockResolvedValue({ ok: true, json: async () => ({ success: true, data: null }) });
    vi.stubGlobal('fetch', request);
    const { result } = renderHook(() => useProductSearch());
    act(() => result.current.handleSearchChange(' vodka '));
    await advance();
    expect(request.mock.calls[0][0]).toBe('/api/products?term=vodka');
    expect(result.current.paginatedResults).toEqual([]);
  });
});
