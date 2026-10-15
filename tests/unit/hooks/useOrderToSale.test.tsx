import { act, renderHook } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { useOrderDetailModal } from '@/hooks/orders/useOrderDetailModal';

it('vende el pedido completo una sola vez y no necesita otro cambio de estado por HTTP', async () => {
  let finish!: (value: any) => void;
  const createVenta = vi.fn(
    () =>
      new Promise(resolve => {
        finish = resolve;
      })
  );
  const fetch = vi.spyOn(globalThis, 'fetch');
  const onClose = vi.fn();
  const setConfirmVentaModalOpen = vi.fn();
  const { result } = renderHook(() =>
    useOrderDetailModal({
      open: true,
      orderId: 'pedido',
      onClose,
      rooms: [],
      createVenta,
      startTimer: vi.fn(),
      detail: [
        {
          producto_id: 'whisky',
          metodo_pago: 'efectivo',
          propina: 1000,
          precio: 20000,
          cantidad: 2,
          comision: 6000,
          genera_comision: 1,
          categoria: 'Licores',
          anfitrionas_asignadas_ids: 'ana,bea',
          configuracion_venta: {
            presentacion_id: 'whisky-750',
            tipo_venta: 'shot',
            shot_anfitriona: true,
            acompanamiento_corto: { presentacion_id: 'sprite', ml_por_corto: 150 }
          }
        }
      ],
      state: {
        isRegistering: false,
        metodoPago: 'efectivo',
        propina: 1000,
        habitacionId: '',
        tiempoHabitacion: 0,
        showMetodoPagoError: false,
        confirmVentaModalOpen: true
      },
      setters: {
        setIsRegistering: vi.fn(),
        setTiempoHabitacion: vi.fn(),
        setShowMetodoPagoError: vi.fn(),
        setConfirmVentaModalOpen
      },
      derived: {
        hasChampagneProducts: false,
        cantidadAnfitrionas: 2,
        maxAnfitrionas: 2,
        otherCommissionQuantity: 2,
        champagneLimit: 0,
        recargoAnfitrionas: 0,
        anfitrionasFinal: ['ana', 'bea'],
        habitacionesActivas: []
      }
    })
  );
  await act(async () => {
    const first = result.current.handleConfirmRegistrarVenta();
    const second = result.current.handleConfirmRegistrarVenta();
    expect(createVenta).toHaveBeenCalledTimes(1);
    finish({ success: true, data: { id: 'venta' } });
    await Promise.all([first, second]);
  });
  expect(createVenta).toHaveBeenCalledWith(
    expect.objectContaining({
      pedido_id: 'pedido',
      total: 41000,
      sub_total: 40000,
      propina: 1000,
      usuarios: ['ana', 'bea'],
      detalles: [
        expect.objectContaining({
          presentacion_id: 'whisky-750',
          cantidad: 2,
          comision: 6000,
          hostesses: ['ana', 'bea'],
          acompanamiento_corto: { presentacion_id: 'sprite', ml_por_corto: 150 }
        })
      ]
    })
  );
  expect(fetch).not.toHaveBeenCalled();
  expect(onClose).toHaveBeenCalledTimes(1);
  fetch.mockRestore();
});
