import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useSaleProductSearch } from '@/hooks/ventas/useSaleProductSearch';

const capture = vi.hoisted(() => vi.fn());
vi.mock('@/lib/utils/logger', () => ({ default: { captureException: capture } }));

const response = (id: string) => ({
  ok: true,
  json: async () => ({ success: true, data: [{ id, nombre: id, precio_venta: 3000 }] })
});

beforeEach(() => {
  vi.useFakeTimers();
  capture.mockClear();
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('búsqueda de productos para venta', () => {
  it('solo busca el último texto cuando se escribe rápidamente', async () => {
    const request = vi.fn().mockResolvedValue(response('vodka'));
    vi.stubGlobal('fetch', request);
    const { rerender } = renderHook(({ term }) => useSaleProductSearch(term), {
      initialProps: { term: 'vo' }
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(100);
    });
    rerender({ term: 'vodka' });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(300);
    });
    expect(request).toHaveBeenCalledTimes(1);
    expect(request.mock.calls[0][0]).toBe('/api/products?for_sale=1&term=vodka');
  });

  it('una respuesta antigua no reemplaza la búsqueda más reciente', async () => {
    let finish!: (value: ReturnType<typeof response>) => void;
    const request = vi.fn().mockImplementationOnce(
      () =>
        new Promise(resolve => {
          finish = resolve;
        })
    );
    request.mockResolvedValueOnce(response('nuevo'));
    vi.stubGlobal('fetch', request);
    const { result, rerender } = renderHook(({ term }) => useSaleProductSearch(term), {
      initialProps: { term: 'anterior' }
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(300);
    });
    const signal = request.mock.calls[0][1].signal;
    rerender({ term: 'nuevo' });
    expect(signal.aborted).toBe(true);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(300);
    });
    const newest = result.current.results;
    expect(newest).toHaveLength(1);
    await act(async () => {
      finish(response('anterior'));
    });
    expect(result.current.results).toBe(newest);
    expect(result.current.loading).toBe(false);
  });

  it('limpiar el texto cancela la solicitud y evita que reaparezcan resultados', async () => {
    let finish!: (value: ReturnType<typeof response>) => void;
    const request = vi.fn().mockImplementation(
      () =>
        new Promise(resolve => {
          finish = resolve;
        })
    );
    vi.stubGlobal('fetch', request);
    const { result, rerender } = renderHook(({ term }) => useSaleProductSearch(term), {
      initialProps: { term: 'vodka' }
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(300);
    });
    rerender({ term: '' });
    expect(request.mock.calls[0][1].signal.aborted).toBe(true);
    await act(async () => {
      finish(response('vodka'));
    });
    expect(result.current.results).toEqual([]);
    expect(result.current.loading).toBe(false);
  });

  it('un fallo de red termina la carga sin rechazos sin manejar', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('sin red')));
    const { result } = renderHook(() => useSaleProductSearch('vodka'));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(300);
    });
    expect(result.current.loading).toBe(false);
    expect(result.current.results).toEqual([]);
    expect(capture).toHaveBeenCalledOnce();
  });
});
