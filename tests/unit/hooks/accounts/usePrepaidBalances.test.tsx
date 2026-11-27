import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { usePrepaidBalances } from '@/hooks/accounts/usePrepaidBalances';

vi.unmock('@tanstack/react-query');

const queryClients: QueryClient[] = [];

function wrapper() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  queryClients.push(queryClient);
  return function QueryWrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
  for (const queryClient of queryClients.splice(0)) queryClient.clear();
});

describe('usePrepaidBalances', () => {
  it('busca clientes por nombre y pagina el saldo desde la API de Clientes', async () => {
    const request = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        data: [
          {
            id: 'client-1',
            name: 'Ana',
            lastName: 'Pérez',
            run: '12.345.678-9',
            phone: '5551234',
            saldo: 42000,
            status: 1
          }
        ],
        total: 41
      })
    });
    vi.stubGlobal('fetch', request);

    const { result } = renderHook(
      () => usePrepaidBalances({ search: 'Ana & Luis', page: 3, pageSize: 20 }),
      { wrapper: wrapper() }
    );

    await waitFor(() => expect(result.current.clients).toHaveLength(1));

    expect(request.mock.calls[0][0]).toBe(
      '/api/clients?search=Ana+%26+Luis&limit=20&offset=40&con_saldo=1'
    );
    expect(result.current.clients[0]).toMatchObject({
      id: 'client-1',
      name: 'Ana',
      lastName: 'Pérez',
      saldo: 42000
    });
    expect(result.current.total).toBe(41);
  });

  it('expone el error de lectura para no confundirlo con una lista vacía', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        statusText: 'Service Unavailable',
        json: async () => ({ message: 'No se pudieron cargar los saldos' })
      })
    );

    const { result } = renderHook(() => usePrepaidBalances({ search: '', page: 1, pageSize: 10 }), {
      wrapper: wrapper()
    });

    await waitFor(() => expect(result.current.error).toBe('No se pudieron cargar los saldos'));
    expect(result.current.clients).toEqual([]);
  });
});
