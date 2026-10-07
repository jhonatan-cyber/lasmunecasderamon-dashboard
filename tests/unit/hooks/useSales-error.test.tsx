import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useSales } from '@/hooks/caja/useSales';
import { showErrorToast } from '@/lib/utils/toastUtils';

vi.mock('@/hooks/shared/useGenericFetch', () => ({
  useGenericFetch: () => ({ data: [], isLoading: false, refetch: vi.fn(), setData: vi.fn() })
}));
vi.mock('@/lib/utils/toastUtils', () => ({ showErrorToast: vi.fn() }));
afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});
describe('error al generar una venta', () => {
  it('muestra el motivo real del backend en vez de un error genérico', async () => {
    const message = 'Hay anfitrionas seleccionadas que no estan logueadas en el local';
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        json: async () => ({
          success: false,
          code: 'HOSTESS_NOT_LOGGED_IN',
          error: { code: 'HOSTESS_NOT_LOGGED_IN', message }
        })
      })
    );
    const { result } = renderHook(useSales);
    await act(async () => {
      await result.current.createVenta({
        metodo_pago: 'efectivo',
        propina: 0,
        sub_total: 20000,
        total: 20000,
        detalles: [
          {
            producto_id: 'prod',
            precio: 20000,
            comision: 4000,
            cantidad: 1,
            sub_total: 20000,
            hostess_id: 'anf'
          }
        ],
        usuarios: ['anf']
      });
    });
    expect(showErrorToast).toHaveBeenCalledExactlyOnceWith(message);
    expect(result.current.error).toBe(message);
  });
});
