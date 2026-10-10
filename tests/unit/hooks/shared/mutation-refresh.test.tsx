import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { useClients } from '@/hooks/clientes/useClients';
import useRooms from '@/hooks/habitaciones/useRooms';
import { useCuentas } from '@/hooks/caja/useCuentas';

vi.unmock('@tanstack/react-query');
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock('@/lib/utils/toastUtils', () => ({ showSuccessToast: vi.fn(), showErrorToast: vi.fn() }));

const clients: QueryClient[] = [];
function wrapper() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } }
  });
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

describe('refresco después de guardar', () => {
  it.each(['clients', 'rooms', 'cuentas'] as const)(
    '%s hace una sola recarga después de crear',
    async entity => {
      const request = vi
        .fn()
        .mockResolvedValue({ ok: true, json: async () => ({ success: true, data: [] }) });
      vi.stubGlobal('fetch', request);
      const { result } = renderHook(
        () => ({ clients: useClients(), rooms: useRooms(), cuentas: useCuentas() }),
        { wrapper: wrapper() }
      );
      const reads = () =>
        request.mock.calls.filter(
          ([url, options]) => url === `/api/${entity}` && options?.method === 'GET'
        );
      await waitFor(() => expect(reads()).toHaveLength(1));
      await act(async () => {
        if (entity === 'clients') await result.current.clients.createClient({ name: 'Nuevo' });
        if (entity === 'rooms') await result.current.rooms.createRoom({ name: 'Nueva' } as any);
        if (entity === 'cuentas') await result.current.cuentas.createCuenta({} as any);
      });
      expect(reads()).toHaveLength(2);
    }
  );

  it('conserva los datos normalizados por el servidor después de editar un cliente', async () => {
    let saved = false;
    const request = vi.fn(async (_url: string, options?: RequestInit) => {
      if (options?.method === 'PUT') saved = true;
      return {
        ok: true,
        json: async () => ({
          success: true,
          data: [
            {
              id: '1',
              name: saved ? 'Ana' : 'Anterior',
              status: 1,
              updated_at: saved ? '2026-10-10T12:00:00Z' : '2026-10-09T12:00:00Z'
            }
          ]
        })
      };
    });
    vi.stubGlobal('fetch', request);
    const { result } = renderHook(useClients, { wrapper: wrapper() });
    await waitFor(() => expect(result.current.allClients[0]?.name).toBe('Anterior'));
    await act(async () => {
      await result.current.updateClient({ id: '1', name: '  Ana  ' });
    });
    await waitFor(() => expect(result.current.allClients[0]?.name).toBe('Ana'));
    expect(result.current.allClients[0].updated_at).toBe('2026-10-10T12:00:00Z');
  });
});
