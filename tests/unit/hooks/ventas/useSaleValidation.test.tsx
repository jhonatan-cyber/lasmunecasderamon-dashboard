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

  it('marca tipo_venta shot solo en las líneas servidas por shot', async () => {
    const { result } = renderSaleHook();
    act(() => {
      result.current.formState.setProductos([
        {
          id: 'p1',
          producto_id: 'prod-1',
          presentacion_id: 'pres-1',
          nombre: 'Whisky 750 ml',
          precio: 3000,
          cantidad: 2,
          subtotal: 6000,
          tipo_venta: 'shot'
        },
        {
          id: 'p2',
          producto_id: 'prod-2',
          presentacion_id: 'pres-2',
          nombre: 'Cerveza',
          precio: 20000,
          cantidad: 1,
          subtotal: 20000,
          tipo_venta: 'botella'
        }
      ]);
    });
    setMetodoPago(result, 'efectivo');
    createVentaMock.mockResolvedValue({ success: true, data: { id: 'v1' } });

    await act(async () => {
      await result.current.handleSubmit([], []);
    });

    const detalles = createVentaMock.mock.calls[0][0].detalles;
    expect(detalles[0]).toMatchObject({
      presentacion_id: 'pres-1',
      cantidad: 2,
      tipo_venta: 'shot'
    });
    expect(detalles[1].tipo_venta).toBeUndefined();
  });

  it('distingue el shot de anfitriona en el payload (se separa en reportes y caja)', async () => {
    const { result } = renderSaleHook();
    act(() => {
      result.current.formState.setProductos([
        {
          id: 'p1',
          producto_id: 'prod-1',
          presentacion_id: 'pres-1',
          nombre: 'Whisky 750 ml',
          precio: 3000,
          cantidad: 2,
          subtotal: 6000,
          tipo_venta: 'shot',
          shot_anfitriona: true
        }
      ]);
    });
    setMetodoPago(result, 'efectivo');
    createVentaMock.mockResolvedValue({ success: true, data: { id: 'v1' } });

    await act(async () => {
      await result.current.handleSubmit([], []);
    });

    expect(createVentaMock.mock.calls[0][0].detalles[0]).toMatchObject({
      presentacion_id: 'pres-1',
      cantidad: 2,
      tipo_venta: 'shot',
      shot_anfitriona: true
    });
  });

  it('no mezcla el shot de cliente con el de anfitriona en una sola línea del carro', async () => {
    const { result } = renderSaleHook();
    const base = {
      id: 'pres-1',
      producto_id: 'prod-1',
      presentacion_id: 'pres-1',
      nombre: 'Whisky 750 ml',
      comision: 0,
      stock_bar: 2,
      opciones_venta: []
    };

    await act(async () => {
      await result.current.handleAddProducto({
        ...base,
        tipo_venta: 'shot',
        shot_anfitriona: false,
        precio: 5000
      });
      await result.current.handleAddProducto({
        ...base,
        tipo_venta: 'shot',
        shot_anfitriona: true,
        precio: 3000
      });
    });

    const productos = result.current.formState.productos;
    expect(productos).toHaveLength(2);
    expect(productos.map((p: any) => p.shot_anfitriona)).toEqual([false, true]);
    expect(productos.map((p: any) => p.precio)).toEqual([5000, 3000]);
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
