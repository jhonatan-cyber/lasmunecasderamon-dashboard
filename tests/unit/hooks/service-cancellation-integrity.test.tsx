import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, renderHook } from '@testing-library/react';
import { useServiceAnulacionForm } from '@/hooks/personal/useServiceAnulacionForm';
import type { ServicioWithDetails } from '@/types/servicio';
import { showErrorToast, showSuccessToast } from '@/lib/utils/toastUtils';
vi.mock('@/lib/utils/toastUtils', () => ({ showErrorToast: vi.fn(), showSuccessToast: vi.fn() }));
vi.mock('@/lib/utils/logger', () => ({ default: { captureException: vi.fn() } }));
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});
function setup(confirm = vi.fn(), close = vi.fn()) {
  const hook = renderHook(() =>
    useServiceAnulacionForm({
      servicio: { id_servicio: '1' } as ServicioWithDetails,
      onConfirm: confirm,
      onOpenChange: close
    })
  );
  act(() => hook.result.current.setMotivo('  Equivocación  '));
  return { ...hook, confirm, close };
}
describe('anulación de servicios', () => {
  it('bloquea solicitudes simultáneas y cancelar durante el envío', async () => {
    let finish!: (value: object) => void;
    const request = vi.fn(
      () =>
        new Promise(resolve => {
          finish = resolve;
        })
    );
    vi.stubGlobal('fetch', request);
    const { result, close } = setup();
    let pending!: Promise<void>;
    act(() => {
      pending = result.current.handleSubmit();
    });
    await act(async () => {
      await result.current.handleSubmit();
      result.current.handleCancel();
    });
    expect(request).toHaveBeenCalledTimes(1);
    expect(close).not.toHaveBeenCalled();
    await act(async () => {
      finish({ ok: true, json: async () => ({ success: true }) });
      await pending;
    });
    expect(result.current.isLoading).toBe(false);
    expect(close).toHaveBeenCalledWith(false);
  });
  it('un fallo HTTP conserva el motivo y no informa éxito', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        json: async () => ({ success: true, message: 'Rechazado' })
      })
    );
    const { result, confirm } = setup();
    await act(async () => {
      await result.current.handleSubmit();
    });
    expect(result.current.motivo).toBe('  Equivocación  ');
    expect(showErrorToast).toHaveBeenCalledWith('Rechazado');
    expect(showSuccessToast).not.toHaveBeenCalled();
    expect(confirm).not.toHaveBeenCalled();
  });
  it('una recarga fallida no convierte la solicitud aceptada en un error de conexión', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: true, json: async () => ({ success: true }) })
    );
    const { result } = setup(vi.fn().mockRejectedValue(new Error('Sin red')));
    await act(async () => {
      await result.current.handleSubmit();
    });
    expect(showSuccessToast).toHaveBeenCalledTimes(1);
    expect(showErrorToast).toHaveBeenCalledWith(
      'La solicitud fue enviada, pero no se pudo actualizar la lista de servicios'
    );
    expect(result.current.motivo).toBe('');
  });
});
