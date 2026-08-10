import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

// ── Mocks ────────────────────────────────────────────────────────────────
const configValues = vi.hoisted(() => new Map<string, string>());
const createVentaMock = vi.hoisted(() => vi.fn());

vi.mock('@/hooks/shared/useConfigValue', () => ({
  useConfigValue: (_category: string, key: string, fallback: string) =>
    configValues.get(key) ?? fallback
}));

vi.mock('@/hooks/caja/useSales', () => ({
  useSales: () => ({ createVenta: createVentaMock })
}));

vi.mock('@/contexts/TimerContext', () => ({
  useTimer: () => ({ startTimer: vi.fn() })
}));

import { useSaleValidation } from '@/hooks/ventas/useSaleValidation';

// ── Helpers ──────────────────────────────────────────────────────────────
const renderSaleHook = () => renderHook(() => useSaleValidation({ onClearSearch: vi.fn() }));

const addProduct = (result: any, precio = 10000, cantidad = 1) => {
  act(() => {
    result.current.formState.setProductos([
      { id: 'p1', precio, cantidad, subtotal: precio * cantidad }
    ]);
  });
};

const setMetodoPago = (result: any, metodo: string) => {
  act(() => {
    result.current.formState.setMetodoPago(metodo);
  });
};

const setEnableTip = (result: any, enabled: boolean) => {
  act(() => {
    result.current.formState.setEnableTip(enabled);
  });
};

describe('useSaleValidation totals (propina / total)', () => {
  beforeEach(() => {
    configValues.clear();
    configValues.set('propina_venta', '10');
    createVentaMock.mockReset();
    window.localStorage.clear();
  });

  it('sin productos todos los conceptos son 0', () => {
    const { result } = renderSaleHook();
    expect(result.current.formState.totals).toEqual({
      subtotal: 0,
      propina: 0,
      total: 0
    });
  });

  it('sin propina el total es el subtotal (con cualquier método de pago)', () => {
    const { result } = renderSaleHook();
    addProduct(result);
    setMetodoPago(result, 'tarjeta');

    expect(result.current.formState.totals).toEqual({
      subtotal: 10000,
      propina: 0,
      total: 10000
    });
  });

  it('con efectivo y propina activa el total es subtotal + propina', () => {
    const { result } = renderSaleHook();
    addProduct(result);
    setMetodoPago(result, 'efectivo');
    setEnableTip(result, true);

    expect(result.current.formState.totals).toEqual({
      subtotal: 10000,
      propina: 1000,
      total: 11000
    });
  });

  it('la propina usa el porcentaje configurado de propina_venta', () => {
    configValues.set('propina_venta', '8');
    const { result } = renderSaleHook();
    addProduct(result, 20000);
    setEnableTip(result, true);

    expect(result.current.formState.totals.propina).toBe(1600); // 8% de 20000
    expect(result.current.formState.totals.total).toBe(21600); // 20000 + 1600
  });

  it('el payload de la venta envía la propina (reparto) y el total sin cargo extra', async () => {
    const { result } = renderSaleHook();
    addProduct(result);
    setMetodoPago(result, 'tarjeta');
    setEnableTip(result, true);

    createVentaMock.mockResolvedValue({ success: true, data: { id: 'v1' } });

    await act(async () => {
      await result.current.handleSubmit([], []);
    });

    expect(createVentaMock).toHaveBeenCalledTimes(1);
    const payload = createVentaMock.mock.calls[0][0];
    expect(payload.sub_total).toBe(10000);
    expect(payload.propina).toBe(1000); // solo la propina de venta se reparte
    expect(payload.total).toBe(11000); // subtotal + propina
    expect(payload.metodo_pago).toBe('tarjeta');
    expect(payload.cargo_tarjeta).toBeUndefined(); // el cargo por tarjeta ya no existe
  });
});
