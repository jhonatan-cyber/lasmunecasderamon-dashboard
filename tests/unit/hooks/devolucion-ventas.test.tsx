import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, renderHook } from '@testing-library/react';
import { useDevolucionVentasLogic } from '@/hooks/servicios/useDevolucionVentasLogic';
import type { VentaWithDetails } from '@/types/venta';
import { showErrorToast, showSuccessToast } from '@/lib/utils/toastUtils';

vi.mock('@/lib/utils/toastUtils', () => ({ showErrorToast: vi.fn(), showSuccessToast: vi.fn() }));
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

function setup(total = 100) {
  const hook = renderHook(() => useDevolucionVentasLogic());
  act(() => {
    hook.result.current.handleDevolucion({ id: 'venta-1', total } as unknown as VentaWithDetails);
    hook.result.current.setMotivoDevolucion('  Venta equivocada  ');
  });
  return hook;
}

describe('solicitudes de devolución de ventas', () => {
  it('bloquea envíos simultáneos y recorta el motivo', async () => {
    let finish!: (value: Response) => void;
    const request = vi.fn<typeof fetch>(
      () =>
        new Promise<Response>(resolve => {
          finish = resolve;
        })
    );
    vi.stubGlobal('fetch', request);
    const { result } = setup();
    const refresh = vi.fn().mockResolvedValue(undefined);
    let pending!: Promise<void>;
    act(() => {
      pending = result.current.confirmarDevolucion(refresh);
    });
    expect(result.current.isSubmitting).toBe(true);
    await act(async () => {
      await result.current.confirmarDevolucion(refresh);
    });
    expect(request).toHaveBeenCalledTimes(1);
    expect(JSON.parse(request.mock.calls[0][1]!.body as string)).toMatchObject({
      motivo: 'Venta equivocada',
      monto: 100
    });
    await act(async () => {
      finish(new Response(JSON.stringify({ success: true })));
      await pending;
    });
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(result.current.isSubmitting).toBe(false);
    expect(result.current.isDevolucionModalOpen).toBe(false);
  });

  it('conserva el formulario y permite reintentar después de un rechazo', async () => {
    const request = vi
      .fn()
      .mockResolvedValue({ ok: false, json: async () => ({ error: 'Ya existe una solicitud' }) });
    vi.stubGlobal('fetch', request);
    const { result } = setup();
    const refresh = vi.fn();
    await act(async () => {
      await result.current.confirmarDevolucion(refresh);
    });
    expect(showErrorToast).toHaveBeenCalledWith('Ya existe una solicitud');
    expect(result.current.isDevolucionModalOpen).toBe(true);
    expect(result.current.motivoDevolucion).toBe('  Venta equivocada  ');
    expect(refresh).not.toHaveBeenCalled();
    request.mockResolvedValue({ ok: true, json: async () => ({ success: true }) });
    await act(async () => {
      await result.current.confirmarDevolucion(refresh);
    });
    expect(request).toHaveBeenCalledTimes(2);
  });

  it('rechaza una respuesta sin éxito aunque HTTP sea correcto', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ success: false, message: 'Solicitud rechazada' })
      })
    );
    const { result } = setup();
    await act(async () => {
      await result.current.confirmarDevolucion(vi.fn());
    });
    expect(showSuccessToast).not.toHaveBeenCalled();
    expect(showErrorToast).toHaveBeenCalledWith('Solicitud rechazada');
  });

  it('distingue una solicitud aceptada de un fallo al actualizar la lista', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: true, json: async () => ({ success: true }) })
    );
    const { result } = setup();
    await act(async () => {
      await result.current.confirmarDevolucion(vi.fn().mockRejectedValue(new Error('red')));
    });
    expect(showSuccessToast).toHaveBeenCalledTimes(1);
    expect(showErrorToast).toHaveBeenCalledWith(
      'La solicitud fue enviada, pero no se pudo actualizar la lista de ventas'
    );
    expect(result.current.selectedVenta).toBeNull();
  });

  it.each([0, -1, NaN, Infinity])('no envía montos inválidos: %s', async total => {
    const request = vi.fn();
    vi.stubGlobal('fetch', request);
    const { result } = setup(total);
    await act(async () => {
      await result.current.confirmarDevolucion(vi.fn());
    });
    expect(request).not.toHaveBeenCalled();
  });
});
