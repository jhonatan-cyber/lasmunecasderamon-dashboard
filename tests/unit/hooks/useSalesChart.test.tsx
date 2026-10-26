import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useSalesByMonth, useSalesByWeek } from '@/hooks/statistics/useSalesChart';

vi.unmock('@tanstack/react-query');

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function setup() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return { client, wrapper };
}

function mockFetch(data: unknown) {
  const fetchMock = vi.fn(async (_url: string) => ({
    ok: true,
    json: async () => ({ success: true, data })
  }));
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

describe('hooks del gráfico de ventas', () => {
  it('consulta cada endpoint con su offset', async () => {
    const fetchMock = mockFetch({
      year: 2026,
      startDate: '2026-10-19',
      endDate: '2026-10-25',
      data: [],
      summary: { totalVentas: 0, promedioMensual: 0, promedioDiario: 0 }
    });
    const { client, wrapper } = setup();

    const { result } = renderHook(
      () => ({ month: useSalesByMonth(2), week: useSalesByWeek(0) }),
      { wrapper }
    );

    await waitFor(() => expect(result.current.month.isSuccess).toBe(true));
    await waitFor(() => expect(result.current.week.isSuccess).toBe(true));

    const urls = fetchMock.mock.calls.map(([url]) => url);
    expect(urls).toContain('/api/stats/sales-by-month?offset=2');
    expect(urls).toContain('/api/stats/sales-by-week?offset=0');
    client.clear();
  });

  it('reutiliza la caché cuando dos paneles piden el mismo offset', async () => {
    const fetchMock = mockFetch({
      year: 2026,
      data: [],
      summary: { totalVentas: 0, promedioMensual: 0 }
    });
    const { client, wrapper } = setup();

    const { result } = renderHook(
      () => ({ primero: useSalesByMonth(0), segundo: useSalesByMonth(0) }),
      { wrapper }
    );

    await waitFor(() => expect(result.current.primero.isSuccess).toBe(true));
    await waitFor(() => expect(result.current.segundo.isSuccess).toBe(true));

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(result.current.segundo.data).toEqual(result.current.primero.data);
    client.clear();
  });
});
