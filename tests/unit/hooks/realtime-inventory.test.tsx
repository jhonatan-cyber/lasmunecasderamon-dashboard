import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { afterEach, expect, it, vi } from 'vitest';
import { useRealtimeInvalidation } from '@/hooks/realtime/useRealtimeInvalidation';
import { useRealtimeRefresh } from '@/hooks/realtime/useRealtimeRefresh';

vi.unmock('@tanstack/react-query');

const stream = vi.hoisted(() => ({ receive: null as null | ((payload: unknown) => void) }));
vi.mock('@/hooks/auth/useCurrentUser', () => ({
  useCurrentUser: () => ({ user: { id: 'user' } })
}));
vi.mock('@/hooks/shared/useSharedSSE', () => ({
  useSharedSSE: (_url: string, callback: (payload: unknown) => void) => {
    stream.receive = callback;
  }
}));

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

it.each([
  { type: 'presence_updated' },
  { type: 'attendance_registered' },
  { type: 'attendance_duplicate' },
  { type: 'resource_updated', data: { module: 'attendance' } }
])('refresca asistencia, logueados y selectores al recibir $type', async payload => {
  vi.useFakeTimers();
  const client = new QueryClient();
  const keys = [
    ['dashboard', 'composite'],
    ['logged-users-stats'],
    ['anfitrionas', 'en-local'],
    ['/api/attendance/stats'],
    ['/api/attendance/usuario/detail'],
    ['users']
  ];
  for (const key of keys) client.setQueryData(key, []);
  renderHook(() => useRealtimeInvalidation(), {
    wrapper: ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    )
  });
  await act(async () => {
    stream.receive!(payload);
    await vi.advanceTimersByTimeAsync(250);
  });
  for (const key of keys) expect(client.getQueryState(key)?.isInvalidated).toBe(true);
  client.clear();
});

it('actualiza estado local de Bar una vez por ráfaga y al reconectar', async () => {
  vi.useFakeTimers();
  const refresh = vi.fn();
  const { unmount } = renderHook(() => useRealtimeRefresh('/api/bar', refresh));
  await act(async () => {
    stream.receive!({ type: 'ping' });
    stream.receive!({ type: 'presence_updated' });
    await vi.advanceTimersByTimeAsync(250);
  });
  expect(refresh).not.toHaveBeenCalled();
  await act(async () => {
    stream.receive!({ type: 'updateSales' });
    stream.receive!({ type: 'transfers_updated' });
    stream.receive!({ type: 'resource_updated', data: { module: 'products' } });
    await vi.advanceTimersByTimeAsync(250);
  });
  expect(refresh).toHaveBeenCalledTimes(1);
  await act(async () => {
    stream.receive!({ type: 'connected' });
    await vi.advanceTimersByTimeAsync(250);
  });
  expect(refresh).toHaveBeenCalledTimes(2);
  act(() => stream.receive!({ type: 'transfers_updated' }));
  unmount();
  await vi.advanceTimersByTimeAsync(250);
  expect(refresh).toHaveBeenCalledTimes(2);
});

it('no refresca un modal cerrado y usa el callback actual al abrirlo', async () => {
  vi.useFakeTimers();
  const oldRefresh = vi.fn();
  const latestRefresh = vi.fn();
  const { rerender } = renderHook(
    ({ enabled, refresh }) => useRealtimeRefresh('/api/attendance', refresh, enabled),
    {
      initialProps: { enabled: false, refresh: oldRefresh }
    }
  );
  await act(async () => {
    stream.receive!({ type: 'attendance_registered' });
    await vi.advanceTimersByTimeAsync(250);
  });
  expect(oldRefresh).not.toHaveBeenCalled();
  rerender({ enabled: true, refresh: oldRefresh });
  act(() => stream.receive!({ type: 'attendance_registered' }));
  rerender({ enabled: true, refresh: latestRefresh });
  await act(async () => {
    await vi.advanceTimersByTimeAsync(250);
  });
  expect(latestRefresh).toHaveBeenCalledOnce();
  expect(oldRefresh).not.toHaveBeenCalled();
});

it('marca las consultas como obsoletas al recuperar la conexión', () => {
  const client = new QueryClient();
  client.setQueryData(['dashboard', 'composite'], {});
  renderHook(() => useRealtimeInvalidation(), {
    wrapper: ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    )
  });
  act(() => stream.receive!({ type: 'connected' }));
  expect(client.getQueryState(['dashboard', 'composite'])?.isInvalidated).toBe(true);
  client.clear();
});

it('vuelve a consultar los logueados visibles y muestra el resultado nuevo', async () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  let count = 1;
  const { result } = renderHook(
    () => {
      useRealtimeInvalidation();
      return useQuery({
        queryKey: ['logged-users-stats'],
        queryFn: async () => ({ logueadas: count }),
        staleTime: Infinity
      });
    },
    {
      wrapper: ({ children }: { children: ReactNode }) => (
        <QueryClientProvider client={client}>{children}</QueryClientProvider>
      )
    }
  );
  await waitFor(() => expect(result.current.data?.logueadas).toBe(1));
  count = 2;
  act(() => stream.receive!({ type: 'presence_updated' }));
  await waitFor(() => expect(result.current.data?.logueadas).toBe(2));
  client.clear();
});

it('refresca las tres cachés usadas por selectores cuando otra sesión reordena habitaciones', async () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  let rooms = ['sala-a', 'sala-b'];
  const { result } = renderHook(
    () => {
      useRealtimeInvalidation();
      const options = { queryFn: async () => rooms, staleTime: Infinity };
      return [
        useQuery({ ...options, queryKey: ['rooms'] }),
        useQuery({ ...options, queryKey: ['rooms', 'list'] }),
        useQuery({ ...options, queryKey: ['/api/rooms'] })
      ];
    },
    {
      wrapper: ({ children }: { children: ReactNode }) => (
        <QueryClientProvider client={client}>{children}</QueryClientProvider>
      )
    }
  );
  await waitFor(() => {
    for (const query of result.current) expect(query.data).toEqual(['sala-a', 'sala-b']);
  });
  rooms = ['sala-b', 'sala-a'];
  act(() => stream.receive!({ type: 'resource_updated', data: { module: 'rooms' } }));
  await waitFor(() => {
    for (const query of result.current) expect(query.data).toEqual(['sala-b', 'sala-a']);
  });
  client.clear();
});

it.each([
  { type: 'resource_updated', data: { module: 'products' } },
  { type: 'transfers_updated' }
])('invalida stock y presentaciones inactivas al recibir $type', async payload => {
  vi.useFakeTimers();
  const client = new QueryClient();
  const keys = [
    ['product-presentations', 'prod-1'],
    ['/api/products?category_id=1'],
    ['/api/bar'],
    ['/api/purchases'],
    ['/api/transfers']
  ];
  for (const key of [...keys, ['/api/users']]) client.setQueryData(key, { stock: 4 });
  renderHook(() => useRealtimeInvalidation(), {
    wrapper: ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    )
  });
  await act(async () => {
    stream.receive!(payload);
    await vi.advanceTimersByTimeAsync(250);
  });
  for (const key of keys) expect(client.getQueryState(key)?.isInvalidated).toBe(true);
  expect(client.getQueryState(['/api/users'])?.isInvalidated).toBe(false);
  client.clear();
});
