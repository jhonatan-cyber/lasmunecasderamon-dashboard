import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';

// ── Mocks ────────────────────────────────────────────────────────────────
const fetchMock = vi.hoisted(() => vi.fn());
vi.stubGlobal('fetch', fetchMock);

vi.mock('sonner', () => ({
  toast: { error: vi.fn(), success: vi.fn() }
}));

vi.mock('@/lib/utils/logger', () => ({
  default: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    captureException: vi.fn()
  }
}));

import { useCuentaCobro } from '@/hooks/accounts/useCuentaCobro';

/**
 * Check de caja cerrada en el cobro de cuentas (paridad con las apps): el
 * cobro llama `POST /api/accounts/{id}/charge-with-sale`, que escribe en caja.
 * Con `hasOpenCaja === false` el guard corta antes de cualquier POST.
 */
describe('useCuentaCobro — check de caja para el cobro de cuenta', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const jsonResponse = (body: unknown) =>
    Promise.resolve({ ok: true, json: () => Promise.resolve(body) });

  it('carga hasOpenCaja al montar', async () => {
    fetchMock.mockImplementation((url: string) => {
      if (url === '/api/cashregister/status')
        return jsonResponse({ success: true, data: { hasOpenCaja: false, cajaInfo: null } });
      return jsonResponse({ success: true, data: [] });
    });

    const { result } = renderHook(() => useCuentaCobro());
    await waitFor(() => expect(result.current.hasOpenCaja).toBe(false));
  });

  it('con caja cerrada, el guard bloquea handleCobrarCuenta sin POST a /charge-with-sale', async () => {
    const posts: string[] = [];
    fetchMock.mockImplementation((url: string, init?: RequestInit) => {
      if (url === '/api/cashregister/status')
        return jsonResponse({ success: true, data: { hasOpenCaja: false, cajaInfo: null } });
      if (url === '/api/rooms') return jsonResponse({ success: true, data: [] });
      if (init?.method === 'POST') posts.push(url);
      return jsonResponse({ success: true, data: {} });
    });

    const { result } = renderHook(() => useCuentaCobro());
    await waitFor(() => expect(result.current.hasOpenCaja).toBe(false));

    await act(async () => {
      await result.current.handleCobrarCuenta(
        { id_cuenta: 'c1', total: 10000, sub_total: 10000, detalles: [], usuarios: [] },
        0,
        'efectivo',
        vi.fn()
      );
    });

    expect(posts).toEqual([]); // ni /charge-with-sale ni /sales
  });

  it('con caja abierta, cobra y factura con una sola petición atómica', async () => {
    const posts: string[] = [];
    fetchMock.mockImplementation((url: string, init?: RequestInit) => {
      if (url === '/api/cashregister/status')
        return jsonResponse({ success: true, data: { hasOpenCaja: true, cajaInfo: {} } });
      if (url === '/api/rooms') return jsonResponse({ success: true, data: [] });
      if (init?.method === 'POST') posts.push(url);
      return jsonResponse({ success: true, data: {} });
    });

    const { result } = renderHook(() => useCuentaCobro());
    await waitFor(() => expect(result.current.hasOpenCaja).toBe(true));

    const onSuccess = vi.fn();
    await act(async () => {
      await result.current.handleCobrarCuenta(
        { id_cuenta: 'c1', total: 10000, sub_total: 10000, detalles: [], usuarios: [] },
        0,
        'efectivo',
        onSuccess
      );
    });

    expect(posts).toEqual(['/api/accounts/c1/charge-with-sale']);
    expect(onSuccess).toHaveBeenCalled();
  });

  it('refreshCajaStatus no pisa el estado conocido si falla la consulta', async () => {
    fetchMock.mockImplementation((url: string) => {
      if (url === '/api/cashregister/status')
        return jsonResponse({ success: true, data: { hasOpenCaja: false, cajaInfo: null } });
      return jsonResponse({ success: true, data: [] });
    });

    const { result } = renderHook(() => useCuentaCobro());
    await waitFor(() => expect(result.current.hasOpenCaja).toBe(false));

    fetchMock.mockImplementation((url: string) => {
      if (url === '/api/cashregister/status') return Promise.reject(new Error('network down'));
      return jsonResponse({ success: true, data: [] });
    });

    await act(async () => {
      await result.current.refreshCajaStatus();
    });

    expect(result.current.hasOpenCaja).toBe(false);
  });
});
