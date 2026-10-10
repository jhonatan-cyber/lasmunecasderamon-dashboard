import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import {
  invalidateSettingsProducts,
  useSettingsProducts
} from '@/hooks/settings/useSettingsProducts';
vi.mock('@/lib/utils/logger', () => ({ default: { captureException: vi.fn() } }));
beforeEach(invalidateSettingsProducts);
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
describe('productos en configuración', () => {
  it('una recarga rechazada conserva la lista anterior', async () => {
    const request = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: [{ id: 'vigente' }] })
      })
      .mockResolvedValueOnce({ ok: false, json: async () => ({ success: true, data: [] }) });
    vi.stubGlobal('fetch', request);
    const { result } = renderHook(useSettingsProducts);
    await waitFor(() => expect(result.current.loading).toBe(false));
    await act(async () => {
      await result.current.refresh();
    });
    expect(result.current.productos[0].id).toBe('vigente');
    expect(result.current.error).toBeTruthy();
  });
  it('un fallo inicial termina la carga y permite reintentar', async () => {
    const request = vi
      .fn()
      .mockRejectedValueOnce(new Error('Sin red'))
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: [{ id: 'nuevo' }] })
      });
    vi.stubGlobal('fetch', request);
    const { result } = renderHook(useSettingsProducts);
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBe('Sin red');
    await act(async () => {
      await result.current.refresh();
    });
    expect(result.current.error).toBeNull();
    expect(result.current.productos[0].id).toBe('nuevo');
  });
});
