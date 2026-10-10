import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { useNotifications } from '@/hooks/notificaciones/useNotifications';
const session = vi.hoisted(() => ({
  user: { id: 1, role: 'cajero' } as { id: number; role: string } | null,
  pathname: '/orders',
  handler: null as null | ((payload: any) => void)
}));
vi.unmock('@tanstack/react-query');
vi.mock('next/navigation', () => ({
  usePathname: () => session.pathname,
  useRouter: () => ({ push: vi.fn() })
}));
vi.mock('@/hooks/auth/useCurrentUser', () => ({ useCurrentUser: () => ({ user: session.user }) }));
vi.mock('@/hooks/shared', () => ({
  useSharedSSE: (_url: string, handler: (payload: any) => void) => {
    session.handler = handler;
    return { reconnect: vi.fn() };
  }
}));
vi.mock('@/lib/utils/audioUtils', () => ({
  playNotificationSound: vi.fn(),
  announcePriority: vi.fn()
}));
vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn(), warning: vi.fn() }
}));
const clients: QueryClient[] = [];
function wrapper() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  clients.push(client);
  return function Provider({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };
}
beforeEach(() => {
  session.user = { id: 1, role: 'cajero' };
  session.pathname = '/orders';
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  for (const client of clients.splice(0)) client.clear();
});
describe('contadores de notificaciones', () => {
  it('separa los contadores de cada usuario', async () => {
    let count = 7;
    const request = vi.fn(async () => ({
      ok: true,
      json: async () => ({ pedidosCount: count, solicitudesCount: 2 })
    }));
    vi.stubGlobal('fetch', request);
    const { result, rerender } = renderHook(useNotifications, { wrapper: wrapper() });
    await waitFor(() => expect(result.current.pendingOrdersCount).toBe(7));
    count = 1;
    session.user = { id: 2, role: 'garzon' };
    rerender();
    await waitFor(() => expect(result.current.pendingOrdersCount).toBe(1));
    expect(request).toHaveBeenCalledTimes(2);
  });
  it.each(['salir', 'login'])('oculta los contadores al %s', async action => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ pedidosCount: 7, solicitudesCount: 2 })
      })
    );
    const { result, rerender } = renderHook(useNotifications, { wrapper: wrapper() });
    await waitFor(() => expect(result.current.pendingOrdersCount).toBe(7));
    if (action === 'salir') session.user = null;
    else session.pathname = '/login';
    rerender();
    expect(result.current.pendingOrdersCount).toBe(0);
    expect(result.current.pendingServiceRequestsCount).toBe(0);
  });
  it('un evento repetido conserva los contadores oficiales aunque el resultado no cambie', async () => {
    const request = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ pedidosCount: 3, solicitudesCount: 2 })
    });
    vi.stubGlobal('fetch', request);
    const { result } = renderHook(useNotifications, { wrapper: wrapper() });
    await waitFor(() => expect(result.current.pendingOrdersCount).toBe(3));
    await act(async () => {
      session.handler?.({
        type: 'new_order',
        data: { id: 1, codigo: '1', createdBy: 1, total: 10 }
      });
      session.handler?.({
        type: 'new_order',
        data: { id: 1, codigo: '1', createdBy: 1, total: 10 }
      });
    });
    await waitFor(() => expect(request.mock.calls.length).toBeGreaterThan(1));
    expect(result.current.pendingOrdersCount).toBe(3);
  });
});
