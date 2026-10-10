import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import usePayroll from '@/hooks/personal/usePayroll';
import { useCalendarActions } from '@/hooks/calendario/useCalendarActions';
vi.unmock('@tanstack/react-query');
const clients: QueryClient[] = [];
function wrapper() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  clients.push(client);
  return function Provider({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };
}
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  for (const client of clients.splice(0)) client.clear();
});
describe('planilla y calendario', () => {
  it.each(['buscar', 'rol', 'tamaño'])('planilla: %s vuelve a una página válida', async filter => {
    const rows = Array.from({ length: 12 }, (_, index) => ({
      id_usuario: index,
      usuario: index === 0 ? 'Ana' : 'Otro',
      rol: index === 0 ? 'cajero' : 'garzon'
    }));
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: true, json: async () => ({ success: true, data: rows }) })
    );
    const { result } = renderHook(usePayroll, { wrapper: wrapper() });
    await waitFor(() => expect(result.current.rows).toHaveLength(12));
    act(() => result.current.setPage(3));
    expect(result.current.paginated).toHaveLength(2);
    act(() => {
      if (filter === 'buscar') result.current.setSearchTerm(' Ana ');
      else if (filter === 'rol') result.current.setRoleFilter('cajero');
      else result.current.setRowsPerPage(20);
    });
    expect(result.current.page).toBe(1);
    expect(result.current.paginated).toHaveLength(filter === 'tamaño' ? 12 : 1);
    act(() => {
      result.current.setRowsPerPage(0);
      result.current.setPage(NaN);
    });
    expect(result.current.page).toBe(1);
    expect(result.current.rowsPerPage).toBe(filter === 'tamaño' ? 20 : 5);
  });
  it('calendario: una actualización usa las fechas solicitadas y muestra ese intervalo', async () => {
    const request = vi.fn(async (url: string) => ({
      ok: true,
      json: async () => ({
        success: true,
        data: { [new URL(url, 'http://localhost').searchParams.get('startDate')!]: [] }
      })
    }));
    vi.stubGlobal('fetch', request);
    const { result } = renderHook(() => useCalendarActions('2026-10-01', '2026-10-31'), {
      wrapper: wrapper()
    });
    await waitFor(() => expect(result.current.actions).toHaveProperty('2026-10-01'));
    await act(async () => {
      await result.current.refetch('2026-11-01', '2026-11-30');
    });
    await waitFor(() => expect(result.current.actions).toHaveProperty('2026-11-01'));
    expect(
      request.mock.calls.filter(([url]) => url.includes('startDate=2026-11-01&endDate=2026-11-30'))
    ).toHaveLength(1);
  });
  it('calendario: sin fechas muestra un objeto vacío y no hace solicitudes', () => {
    const request = vi.fn();
    vi.stubGlobal('fetch', request);
    const { result } = renderHook(() => useCalendarActions(), { wrapper: wrapper() });
    expect(result.current.actions).toEqual({});
    expect(result.current.loading).toBe(false);
    expect(request).not.toHaveBeenCalled();
  });
});
