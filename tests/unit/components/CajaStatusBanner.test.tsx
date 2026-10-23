import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
// El setup global mockea @tanstack/react-query con valores estáticos: para este
// banner el comportamiento real de useQuery es lo que se prueba, así que se
// restaura el paquete original solo en este archivo.
vi.mock('@tanstack/react-query', async () => vi.importActual('@tanstack/react-query'));
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { CajaStatusBanner } from '@/components/sales/CajaStatusBanner';

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock('@/hooks/realtime/useRealtimeRefresh', () => ({ useRealtimeRefresh: vi.fn() }));
vi.mock('@/hooks/auth/useCurrentUser', () => ({ useCurrentUser: () => ({ user: null }) }));

function wrap(children: React.ReactNode) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } }
  });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('CajaStatusBanner', () => {
  it('verifica la caja solo con el endpoint público /api/cashregister/status', async () => {
    const urls: string[] = [];
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        urls.push(url);
        if (url.startsWith('/api/cashregister/status')) {
          return {
            ok: true,
            json: async () => ({ success: true, data: { hasOpenCaja: true, cajaInfo: null } })
          };
        }
        return {
          ok: false,
          statusText: 'Forbidden',
          json: async () => ({ success: false, message: 'Permisos insuficientes' })
        };
      })
    );

    render(wrap(<CajaStatusBanner entityName='entradas' />));

    await waitFor(() => {
      expect(urls.some(u => u.startsWith('/api/cashregister/status'))).toBe(true);
    });
    expect(urls.filter(u => !u.startsWith('/api/cashregister/status'))).toEqual([]);
    expect(screen.queryByText('Error al verificar caja.')).not.toBeInTheDocument();
  });

  it('avisa que no hay caja abierta cuando el estado lo indica', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.startsWith('/api/cashregister/status')) {
          return {
            ok: true,
            json: async () => ({ success: true, data: { hasOpenCaja: false, cajaInfo: null } })
          };
        }
        return {
          ok: false,
          statusText: 'Forbidden',
          json: async () => ({ success: false, message: 'Permisos insuficientes' })
        };
      })
    );

    render(wrap(<CajaStatusBanner entityName='entradas' />));

    expect(await screen.findByText(/No hay caja abierta\./)).toBeInTheDocument();
  });
});
