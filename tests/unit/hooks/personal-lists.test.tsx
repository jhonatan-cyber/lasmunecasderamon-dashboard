import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { useTipsDetalle } from '@/hooks/personal/useTips';
import { useCommissions } from '@/hooks/personal/useCommissions';
import useAnticipos from '@/hooks/personal/useAnticipos';

vi.unmock('@tanstack/react-query');
vi.mock('@/hooks/auth/useCurrentUser', () => ({
  useCurrentUser: () => ({ user: { role: 'administrador' } })
}));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
const clients: QueryClient[] = [];
function wrapper() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  clients.push(client);
  return function QueryWrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };
}
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  for (const client of clients.splice(0)) client.clear();
});

describe('listas de personal', () => {
  it('una respuesta anterior no muestra propinas de otro empleado', async () => {
    let finish!: (value: object) => void;
    const request = vi.fn().mockImplementationOnce(
      () =>
        new Promise(resolve => {
          finish = resolve;
        })
    );
    request.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, data: [{ id: 'nuevo' }] })
    });
    vi.stubGlobal('fetch', request);
    const { result } = renderHook(() => useTipsDetalle());
    let pending!: Promise<void>;
    act(() => {
      pending = result.current.fetchDetalles('anterior');
    });
    await act(async () => {
      await result.current.fetchDetalles('nuevo');
    });
    expect(request.mock.calls[0][1].signal.aborted).toBe(true);
    await act(async () => {
      finish({ ok: true, json: async () => ({ success: true, data: [{ id: 'anterior' }] }) });
      await pending;
    });
    expect(result.current.detalles).toEqual([{ id: 'nuevo' }]);
    expect(result.current.loading).toBe(false);
  });

  it('muestra el mensaje estructurado del error de propinas', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ success: false, error: { message: 'Sin permiso' } })
      })
    );
    const { result } = renderHook(() => useTipsDetalle());
    await act(async () => {
      await result.current.fetchDetalles('1');
    });
    expect(result.current.error).toBe('Sin permiso');
  });

  it('comisiones consulta una sola vez al cargar y al cambiar filtros', async () => {
    const request = vi
      .fn()
      .mockResolvedValue({ ok: true, json: async () => ({ success: true, data: [] }) });
    vi.stubGlobal('fetch', request);
    const { result } = renderHook(useCommissions, { wrapper: wrapper() });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(request).toHaveBeenCalledTimes(1);
    act(() => result.current.setStatusFilter('pagado'));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(request).toHaveBeenCalledTimes(2);
    expect(request.mock.calls[1][0]).toContain('status=pagado');
  });

  it('anticipos ajusta la página al reducirse la lista y admite búsquedas con espacios', async () => {
    let rows = Array.from({ length: 6 }, (_, i) => ({
      id_anticipo: i + 1,
      name: `Ana ${i + 1}`,
      monto: 100,
      estado: 1,
      fecha_crea: '2026-10-10'
    }));
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation(async () => ({
        ok: true,
        json: async () => ({ success: true, data: rows })
      }))
    );
    const { result } = renderHook(useAnticipos, { wrapper: wrapper() });
    await waitFor(() => expect(result.current.allAnticipos).toHaveLength(6));
    act(() => result.current.setPageSize(2));
    act(() => result.current.setPage(3));
    rows = rows.slice(0, 4);
    await act(async () => {
      await result.current.fetchAnticipos();
    });
    await waitFor(() => expect(result.current.page).toBe(2));
    expect(result.current.anticipos).toHaveLength(2);
    act(() => result.current.setSearchTerm('  ANA 2  '));
    expect(result.current.filteredAnticipos).toHaveLength(1);
    expect(result.current.page).toBe(1);
  });
});
