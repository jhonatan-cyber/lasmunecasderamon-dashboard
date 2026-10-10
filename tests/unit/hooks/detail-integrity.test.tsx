import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { useCuentaDetail } from '@/hooks/cuentas/useCuentaDetail';
import { useOvertime } from '@/hooks/personal/useOvertime';
import { useGratificaciones } from '@/hooks/personal/useGratificaciones';
vi.unmock('@tanstack/react-query');
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock('@/lib/utils/logger', () => ({ default: { captureException: vi.fn() } }));
const clients: QueryClient[] = [];
function wrapper() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } }
  });
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
const response = (id: string) => ({
  ok: true,
  json: async () => ({ success: true, data: { id } })
});

describe('integridad de detalles', () => {
  it.each(['hora', 'crear bono', 'editar bono', 'eliminar bono'])(
    '%s: no refresca ni confirma una operación rechazada',
    async operation => {
      const request = vi.fn(async (_url: string, options?: RequestInit) => ({
        ok: true,
        json: async () =>
          options?.method !== 'GET'
            ? { success: false, message: 'Monto rechazado' }
            : { success: true, data: [] }
      }));
      vi.stubGlobal('fetch', request);
      const { result } = renderHook(
        () => ({ hours: useOvertime(), bonuses: useGratificaciones() }),
        { wrapper: wrapper() }
      );
      await waitFor(() =>
        expect(result.current.hours.loading || result.current.bonuses.loading).toBe(false)
      );
      await act(async () => {
        const promise =
          operation === 'hora'
            ? result.current.hours.createOvertime({ usuario_id: '1', hora: 1, monto: 20 })
            : operation === 'crear bono'
              ? result.current.bonuses.createGratificacion({
                  usuario_id: '1',
                  monto: 20,
                  descripcion: 'Bono'
                })
              : operation === 'editar bono'
                ? result.current.bonuses.updateGratificacion({
                    id: '1',
                    monto: 20,
                    descripcion: 'Bono'
                  })
                : result.current.bonuses.deleteGratificacion('1');
        await expect(promise).rejects.toThrow('Monto rechazado');
      });
      expect(request.mock.calls.filter(([, options]) => options?.method === 'GET')).toHaveLength(2);
    }
  );
  it.each([false, true])(
    'cuentas: ignora respuestas anteriores al cambiar o cerrar: %s',
    async close => {
      let finish!: (value: ReturnType<typeof response>) => void;
      const request = vi.fn().mockImplementationOnce(
        () =>
          new Promise(resolve => {
            finish = resolve;
          })
      );
      request.mockResolvedValueOnce(response('nueva'));
      vi.stubGlobal('fetch', request);
      const { result, rerender } = renderHook(({ id, open }) => useCuentaDetail(id, open), {
        initialProps: { id: 'anterior', open: true }
      });
      rerender({ id: 'nueva', open: !close });
      if (!close) await waitFor(() => expect(result.current.cuenta?.id).toBe('nueva'));
      await act(async () => {
        finish(response('anterior'));
      });
      expect(result.current.cuenta).toEqual(close ? null : { id: 'nueva' });
      expect(result.current.loading).toBe(false);
      expect(result.current.hasFetched).toBe(!close);
    }
  );
  it('cuentas: cerrar directamente cancela la solicitud y conserva un callback estable', async () => {
    let finish!: (value: ReturnType<typeof response>) => void;
    vi.stubGlobal(
      'fetch',
      vi.fn(
        () =>
          new Promise(resolve => {
            finish = resolve;
          })
      )
    );
    const { result } = renderHook(() => useCuentaDetail('1', true));
    const close = result.current.handleClose;
    act(() => close());
    await act(async () => {
      finish(response('1'));
    });
    expect(result.current.cuenta).toBeNull();
    expect(result.current.hasFetched).toBe(false);
    expect(result.current.handleClose).toBe(close);
  });
  it.each(['horas', 'gratificaciones'])(
    '%s: una respuesta anterior no reemplaza al empleado actual',
    async module => {
      let finish!: (value: object) => void;
      const request = vi.fn(async (url: string): Promise<object> => {
        if (url.includes('userId=1'))
          return new Promise(resolve => {
            finish = resolve;
          });
        return {
          ok: true,
          json: async () => ({
            success: true,
            data: url.includes('userId=2')
              ? [{ usuario: 'Actual', monto: 20, hora: 1, total: 20, estado: 1 }]
              : []
          })
        };
      });
      vi.stubGlobal('fetch', request);
      const { result } = renderHook(
        () => {
          const hours = useOvertime();
          const bonuses = useGratificaciones();
          return module === 'horas'
            ? {
                load: (id: number) => hours.getOvertimeDetails(String(id)),
                rows: hours.overtimeDetails,
                loading: hours.detailsLoading
              }
            : {
                load: bonuses.getGratificacionesDetails,
                rows: bonuses.gratificacionesDetails,
                loading: bonuses.detailsLoading
              };
        },
        { wrapper: wrapper() }
      );
      let previous!: Promise<unknown>;
      act(() => {
        previous = result.current.load(1);
      });
      await act(async () => {
        await result.current.load(2);
      });
      await act(async () => {
        finish({
          ok: true,
          json: async () => ({ success: true, data: [{ usuario: 'Anterior', monto: 10 }] })
        });
        await previous;
      });
      expect(result.current.rows[0].usuario).toBe('Actual');
      expect(result.current.loading).toBe(false);
    }
  );
  it('gratificaciones: acepta la lista directa que devuelve la API real', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => [{ usuario: 'Ana', monto: '50', descripcion: 'Bono', estado: 1 }]
      })
    );
    const { result } = renderHook(useGratificaciones, { wrapper: wrapper() });
    await act(async () => {
      await result.current.getGratificacionesDetails(1);
    });
    expect(result.current.gratificacionesDetails[0]).toMatchObject({
      usuario: 'Ana',
      monto: 50,
      descripcion: 'Bono'
    });
    expect(result.current.detailsError).toBeNull();
  });
});
