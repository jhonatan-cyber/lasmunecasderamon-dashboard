import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';

// ── Mocks ────────────────────────────────────────────────────────────────
const fetchMock = vi.hoisted(() => vi.fn());
vi.stubGlobal('fetch', fetchMock);

vi.mock('sonner', () => ({
  toast: { error: vi.fn(), success: vi.fn() }
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'u1' } })
}));

vi.mock('@/hooks/personal', () => ({
  usePrepagoForm: () => ({
    amount: '10.000',
    setAmount: vi.fn(),
    numericAmount: 10000
  })
}));

vi.mock('@/hooks/shared', () => ({
  useRefreshOnFocus: vi.fn()
}));

// useCashRegister usa useGenericFetch (react-query): se mockea el hook
// completo controlando hasOpenCaja desde el test.
const cajaHasOpen = vi.hoisted(() => ({ value: true }));
const checkCajaStatusMock = vi.hoisted(() => vi.fn());
vi.mock('@/hooks/caja/useCashRegister', () => ({
  useCashRegister: () => ({
    hasOpenCaja: cajaHasOpen.value,
    checkCajaStatus: checkCajaStatusMock
  })
}));

import { useClientModals } from '@/hooks/clientes/useClientModals';

/**
 * Check de caja cerrada en el prepago (paridad con las apps): la carga de
 * saldo hace `deductFromCaja` en el backend. Con `hasOpenCaja === false`
 * el guard de `handlePrepagoSubmit` corta antes del POST a
 * `/api/clients/prepago`.
 */
describe('useClientModals — check de caja para el prepago', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const jsonResponse = (body: unknown) =>
    Promise.resolve({ ok: true, json: () => Promise.resolve(body) });

  const mockCaja = (hasOpenCaja: boolean) => {
    cajaHasOpen.value = hasOpenCaja;
    fetchMock.mockImplementation((url: string) => {
      if (url === '/api/cashregister/status')
        return jsonResponse({ success: true, data: { hasOpenCaja, cajaInfo: null } });
      return jsonResponse({ success: true, data: [] });
    });
  };

  it('expone prepagoCajaCerrada=true cuando no hay caja abierta', async () => {
    mockCaja(false);
    const { result } = renderHook(() => useClientModals());
    await waitFor(() => expect(result.current.prepagoCajaCerrada).toBe(true));
  });

  it('con caja cerrada, el guard bloquea handlePrepagoSubmit sin POST al prepago', async () => {
    mockCaja(false);
    const { result } = renderHook(() => useClientModals());
    await waitFor(() => expect(result.current.prepagoCajaCerrada).toBe(true));

    act(() => {
      result.current.openPrepagoModal({
        id: 'cl1',
        name: 'Juan',
        lastName: 'Pérez',
        saldo: 0,
        deuda: 0
      } as any);
    });

    const posts: string[] = [];
    fetchMock.mockImplementation((url: string, init?: RequestInit) => {
      if (url === '/api/cashregister/status')
        return jsonResponse({ success: true, data: { hasOpenCaja: false, cajaInfo: null } });
      if (init?.method === 'POST') posts.push(url);
      return jsonResponse({ success: true, data: {} });
    });

    let ok: boolean | undefined;
    await act(async () => {
      ok = await result.current.handlePrepagoSubmit({ preventDefault: vi.fn() } as any);
    });

    expect(ok).toBe(false);
    expect(posts).toEqual([]); // sin POST a /api/clients/prepago
  });

  it('con caja abierta, handlePrepagoSubmit llega al POST /api/clients/prepago', async () => {
    mockCaja(true);
    const { result } = renderHook(() => useClientModals());
    await waitFor(() => expect(result.current.prepagoCajaCerrada).toBe(false));

    act(() => {
      result.current.openPrepagoModal({
        id: 'cl1',
        name: 'Juan',
        lastName: 'Pérez',
        saldo: 0,
        deuda: 0
      } as any);
    });

    const posts: string[] = [];
    fetchMock.mockImplementation((url: string, init?: RequestInit) => {
      if (url === '/api/cashregister/status')
        return jsonResponse({ success: true, data: { hasOpenCaja: true, cajaInfo: null } });
      if (init?.method === 'POST') posts.push(url);
      return jsonResponse({ success: true, nuevoSaldo: 10000 });
    });

    let ok: boolean | undefined;
    await act(async () => {
      ok = await result.current.handlePrepagoSubmit({ preventDefault: vi.fn() } as any);
    });

    expect(ok).toBe(true);
    expect(posts).toEqual(['/api/clients/prepago']);
  });
});
