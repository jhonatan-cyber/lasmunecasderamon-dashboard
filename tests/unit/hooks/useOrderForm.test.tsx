import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useOrderForm } from '@/hooks/personal/useOrderForm';
import { OrderCreateSchema } from '@/lib/business/schemas';

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock('@/hooks/auth/useCurrentUser', () => ({
  useCurrentUser: () => ({ user: { id: 'garzon' } })
}));
vi.mock('@/hooks/habitaciones/useRooms', () => ({
  default: () => ({ rooms: [], fetchRooms: vi.fn() })
}));
vi.mock('@/hooks/shared/useConfigValue', () => ({ useConfigValue: () => 10 }));
vi.mock('@/lib/utils/toastUtils', () => ({ showSuccessToast: vi.fn(), showErrorToast: vi.fn() }));

beforeEach(() => vi.restoreAllMocks());

describe('Crear pedido con configuración de venta', () => {
  it.each([
    ['botella', 0],
    ['botella', 1000],
    ['shot', 0],
    ['shot', 1000]
  ] as const)('asigna anfitriona solo con comisión de %s (%s)', async (tipo, comision) => {
    const add = vi.fn();
    const { result } = renderHook(() =>
      useOrderForm({
        productos: [],
        selectedCliente: '',
        setSelectedCliente: vi.fn(),
        onAddProducto: add
      })
    );
    await act(() =>
      result.current.handleAgregarProducto({
        id: 'bebida',
        tipo_venta: tipo,
        shot_anfitriona: tipo === 'shot',
        precio: 5000,
        comision,
        cantidad: 1,
        selectedHostesses: ['ana']
      })
    );
    expect(add).toHaveBeenCalledWith(
      expect.objectContaining({
        selectedHostesses: comision > 0 ? ['ana'] : [],
        comision: comision > 0 ? comision : 0,
        generaComision: comision > 0 ? 1 : 0
      })
    );
  });

  it.each(['botella', 'shot'] as const)(
    'limpia selecciones previas sin comisión al enviar pedido de %s',
    async tipo => {
      const fetch = vi
        .spyOn(globalThis, 'fetch')
        .mockResolvedValue({ status: 400, json: async () => ({ success: false }) } as Response);
      const { result } = renderHook(() =>
        useOrderForm({
          productos: [
            {
              id: 'bebida',
              nombre: 'Bebida',
              tipo_venta: tipo,
              shot_anfitriona: tipo === 'shot',
              precio: 5000,
              comision: 0,
              cantidad: 1,
              subtotal: 5000,
              generaComision: 1,
              selectedHostesses: ['ana']
            }
          ],
          selectedCliente: '',
          setSelectedCliente: vi.fn()
        })
      );
      act(() => result.current.setMetodoPago('efectivo'));
      await act(() => result.current.handleSubmitInternal());
      const payload = JSON.parse(String(fetch.mock.calls[0][1]?.body));
      expect(payload.usuarios).toEqual([]);
      expect(payload.totalComision).toBe(0);
      expect(payload.detalles[0]).toMatchObject({
        comision: 0,
        generaComision: 0,
        hostessId: null,
        selectedHostesses: []
      });
    }
  );

  it('bloquea un pedido vacío sin hacer ninguna petición', async () => {
    const request = vi.fn();
    vi.stubGlobal('fetch', request);
    const { result } = renderHook(() =>
      useOrderForm({ productos: [], selectedCliente: '', setSelectedCliente: vi.fn() })
    );
    await act(() => result.current.handleSubmitInternal());
    expect(request).not.toHaveBeenCalled();
    expect(result.current.error).toContain('al menos un producto');
    vi.unstubAllGlobals();
  });

  it('conserva la comisión configurada del corto para poder asignar anfitriona después', async () => {
    const onAddProducto = vi.fn();
    const { result } = renderHook(() =>
      useOrderForm({
        productos: [],
        selectedCliente: '',
        setSelectedCliente: vi.fn(),
        onAddProducto
      })
    );
    await act(() =>
      result.current.handleAgregarProducto({
        id: 'corto',
        tipo_venta: 'shot',
        shot_anfitriona: true,
        precio: 5000,
        comision: 1000,
        cantidad: 1,
        selectedHostesses: []
      })
    );
    expect(onAddProducto).toHaveBeenCalledWith(
      expect.objectContaining({ comision: 0, comisionUnitaria: 1000, selectedHostesses: [] })
    );
  });

  it('conserva la cantidad del modal y calcula la comisión total una sola vez', async () => {
    const onAddProducto = vi.fn();
    const { result } = renderHook(() =>
      useOrderForm({
        productos: [],
        selectedCliente: '',
        setSelectedCliente: vi.fn(),
        onAddProducto
      })
    );
    await act(async () =>
      result.current.handleAgregarProducto({
        id: 'whisky-750',
        producto_id: 'whisky',
        presentacion_id: 'whisky-750',
        tipo_venta: 'shot',
        shot_anfitriona: true,
        precio: 20000,
        comision: 3000,
        cantidad: 2,
        selectedHostesses: ['ana', 'bea'],
        acompanamiento_corto: { presentacion_id: 'sprite', ml_por_corto: 150 }
      })
    );
    expect(onAddProducto).toHaveBeenCalledWith(
      expect.objectContaining({
        cantidad: 2,
        subtotal: 40000,
        comision: 6000,
        comisionUnitaria: 3000,
        selectedHostesses: ['ana', 'bea'],
        acompanamiento_corto: { presentacion_id: 'sprite', ml_por_corto: 150 }
      })
    );
  });

  it('envía un pedido válido con bebida por ml y asignaciones por unidad', async () => {
    const fetch = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue({ status: 400, json: async () => ({ success: false }) } as Response);
    const productos = [
      {
        id: 'whisky-750',
        producto_id: 'whisky',
        presentacion_id: 'whisky-750',
        nombre: 'Whisky',
        tipo_venta: 'shot' as const,
        shot_anfitriona: true,
        precio: 20000,
        cantidad: 2,
        comision: 6000,
        subtotal: 40000,
        generaComision: 1,
        selectedHostesses: ['ana', 'bea'],
        acompanamiento_corto: { presentacion_id: 'sprite', ml_por_corto: 150 }
      }
    ];
    const { result } = renderHook(() =>
      useOrderForm({ productos, selectedCliente: '', setSelectedCliente: vi.fn() })
    );
    act(() => result.current.setMetodoPago('efectivo'));
    await act(async () => result.current.handleSubmitInternal());
    const payload = JSON.parse(String(fetch.mock.calls[0][1]?.body));
    expect(OrderCreateSchema.safeParse(payload).success).toBe(true);
    expect(payload.detalles[0]).toMatchObject({
      cantidad: 2,
      comision: 6000,
      selectedHostesses: ['ana', 'bea'],
      acompanamiento_corto: { presentacion_id: 'sprite', ml_por_corto: 150 }
    });
  });
});

it('bloquea dos envios de pedido antes del render y conserva el codigo al reintentar', async () => {
  let reject!: (error: Error) => void;
  const request = vi
    .spyOn(globalThis, 'fetch')
    .mockImplementationOnce(
      () =>
        new Promise<Response>((_resolve, fail) => {
          reject = fail;
        })
    )
    .mockResolvedValue({ status: 400, json: async () => ({ success: false }) } as Response);
  const { result } = renderHook(() =>
    useOrderForm({
      productos: [
        { id: 'bebida', nombre: 'Bebida', precio: 5000, cantidad: 1, subtotal: 5000, comision: 0 }
      ],
      selectedCliente: '',
      setSelectedCliente: vi.fn()
    })
  );
  act(() => result.current.setMetodoPago('efectivo'));
  let first!: Promise<void>;
  let duplicate!: Promise<void>;
  await act(async () => {
    first = result.current.handleSubmitInternal();
    duplicate = result.current.handleSubmitInternal();
  });
  expect(first).toBe(duplicate);
  expect(request).toHaveBeenCalledTimes(1);
  await act(async () => {
    reject(new Error('Respuesta perdida'));
    await first;
  });
  await act(() => result.current.handleSubmitInternal());
  const codes = request.mock.calls.map(call => JSON.parse(String(call[1]?.body)).codigo);
  expect(codes[0]).toBeTruthy();
  expect(codes[0]).toBe(codes[1]);
});
