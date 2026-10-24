import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ clients: [], hostesses: [], rooms: [] }));
vi.mock('@tanstack/react-query', () => ({
  useQueryClient: () => ({ invalidateQueries: vi.fn() })
}));
vi.mock('@/hooks/shared', () => ({ useRefreshOnFocus: vi.fn() }));
vi.mock('@/hooks/clients/useClients', () => ({
  useClients: () => ({ allClients: mocks.clients, fetchClients: vi.fn() })
}));
vi.mock('@/hooks/staff', () => ({
  useAnfitrionas: () => ({ anfitrionas: mocks.hostesses, getAnfitrionas: vi.fn() })
}));
vi.mock('@/hooks/rooms/useHabitaciones', () => ({
  useHabitaciones: () => ({ habitaciones: mocks.rooms, getHabitaciones: vi.fn() })
}));
vi.mock('@/contexts/TimerContext', () => ({ useTimer: () => ({ startTimer: vi.fn() }) }));
vi.mock('@/hooks/private-rooms/usePrivateRoomSummary', () => ({
  usePrivateRoomSummary: () => ({
    hasComision: false,
    disabledPaymentMethods: [],
    clientesConSaldo: []
  })
}));
vi.mock('@/components/providers/IvaRateProvider', () => ({ useIvaRate: () => 0 }));
vi.mock('@/components/private-rooms/new/printBoleta', () => ({ printBoletaHabitacion: vi.fn() }));
vi.mock('@/components/private-rooms/new/servicioFormModel', () => ({
  validateServicioForm: () => null,
  unirNombresAnfitrionas: () => '',
  calcularTotalesServicio: () => ({ subTotal: 1000, iva: 0, total: 1000 }),
  buildServicioPayload: ({ formData }: any) => ({ ...formData, codigo: crypto.randomUUID() })
}));
import { useOrderDetailModal } from '@/hooks/orders/useOrderDetailModal';
import { useServicioForm } from '@/hooks/private-rooms/useServicioForm';
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
it('reabrir la confirmacion de un privado conserva clave y codigo mientras los datos no cambien', async () => {
  const request = vi.fn().mockResolvedValue({ json: async () => ({ success: false }) });
  vi.stubGlobal('fetch', request);
  const { result } = renderHook(useServicioForm);
  act(() => result.current.handleSubmit());
  await act(() => result.current.confirmAndSubmit());
  act(() => result.current.handleSubmit());
  await act(() => result.current.confirmAndSubmit());
  expect(JSON.parse(request.mock.calls[0][1].body).codigo).toBe(
    JSON.parse(request.mock.calls[1][1].body).codigo
  );
  expect(request.mock.calls[0][1].headers['x-idempotency-key']).toBe(
    request.mock.calls[1][1].headers['x-idempotency-key']
  );
});
it('dos confirmaciones simultaneas hacen una sola peticion y el reintento conserva la clave', async () => {
  let release!: (response: any) => void;
  const request = vi
    .fn()
    .mockImplementationOnce(
      () =>
        new Promise(resolve => {
          release = resolve;
        })
    )
    .mockResolvedValue({ json: async () => ({ success: false }) });
  vi.stubGlobal('fetch', request);
  const { result } = renderHook(useServicioForm);
  act(() => result.current.handleSubmit());
  let first!: Promise<void>;
  let duplicate!: Promise<void>;
  act(() => {
    first = result.current.confirmAndSubmit();
    duplicate = result.current.confirmAndSubmit();
  });
  expect(request).toHaveBeenCalledTimes(1);
  await act(async () => {
    release({ json: async () => ({ success: false }) });
    await Promise.all([first, duplicate]);
  });
  act(() => result.current.handleSubmit());
  await act(() => result.current.confirmAndSubmit());
  expect(request.mock.calls[0][1].headers['x-idempotency-key']).toBe(
    request.mock.calls[1][1].headers['x-idempotency-key']
  );
  expect(JSON.parse(request.mock.calls[0][1].body).codigo).toBe(
    JSON.parse(request.mock.calls[1][1].body).codigo
  );
});

it('cuenta desde un pedido bloquea el doble envio y conserva el codigo al reintentar', async () => {
  let reject!: (error: Error) => void;
  const request = vi
    .fn()
    .mockImplementationOnce(
      () =>
        new Promise((_resolve, fail) => {
          reject = fail;
        })
    )
    .mockResolvedValue({ ok: false, json: async () => ({ success: false }) });
  vi.stubGlobal('fetch', request);
  const { result } = renderHook(() =>
    useOrderDetailModal({
      open: true,
      orderId: 'pedido',
      onClose: vi.fn(),
      detail: [{ id: 'bebida', producto_id: 'prod', precio: 5000, cantidad: 1 }],
      rooms: [],
      createVenta: vi.fn(),
      startTimer: vi.fn(),
      state: {
        isRegistering: false,
        metodoPago: 'efectivo',
        propina: 0,
        clienteSaldo: null,
        habitacionId: '',
        tiempoHabitacion: 0,
        showMetodoPagoError: false,
        confirmVentaModalOpen: false
      },
      setters: {
        setIsRegistering: vi.fn(),
        setMetodoPago: vi.fn(),
        setAgregarPropina: vi.fn(),
        setTiempoHabitacion: vi.fn(),
        setShowMetodoPagoError: vi.fn(),
        setConfirmVentaModalOpen: vi.fn()
      },
      derived: {
        hasChampagneProducts: false,
        cantidadAnfitrionas: 0,
        maxAnfitrionas: 1,
        otherCommissionQuantity: 0,
        champagneLimit: 1,
        recargoAnfitrionas: 0,
        anfitrionasFinal: [],
        habitacionesActivas: []
      }
    })
  );
  let first!: Promise<void>;
  let duplicate!: Promise<void>;
  await act(async () => {
    first = result.current.handleRegistrarCuenta();
    duplicate = result.current.handleRegistrarCuenta();
  });
  expect(first).toBe(duplicate);
  expect(request).toHaveBeenCalledTimes(1);
  await act(async () => {
    reject(new Error('Respuesta perdida'));
    await first;
  });
  await act(() => result.current.handleRegistrarCuenta());
  expect(request).toHaveBeenCalledTimes(2);
  expect(JSON.parse(request.mock.calls[0][1].body).codigo).toBe(
    JSON.parse(request.mock.calls[1][1].body).codigo
  );
});
