import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useOrderDetailModalState } from '@/hooks/orders/useOrderDetailModalState';
import { getOrderHostessIds } from '@/components/orders/orderDetailUtils';

vi.mock('@/hooks/shared/useConfigValue', () => ({ useConfigValue: () => '10' }));

describe('Aceptación de pedidos', () => {
  const ids = ['a9df26ba-849d-47da-9331-069281791a71', 'fa4d0931-fc78-40eb-ae7e-723679f735df'];
  it('recupera ambas anfitrionas UUID aunque el pedido solo tenga sus nombres visibles', () => {
    expect(
      getOrderHostessIds([{ anfitriona: 'Lola, Lizi', anfitrionaIds: ids.join(',') }])
    ).toEqual(ids);
    expect(
      getOrderHostessIds([{ anfitrionaIds: ids.join(','), anfitrionas_asignadas_ids: ids[0] }])
    ).toEqual(ids);
  });
  it('recupera pago y propina y conserva la propina original', () => {
    const detail = [
      {
        anfitrionaIds: ids.join(','),
        metodo_pago: 'tarjeta',
        propina: 2500,
        total: 25000,
        habitacion_id: 'room-1'
      }
    ];
    const { result } = renderHook(() =>
      useOrderDetailModalState({ open: true, detail, rooms: [], onClose: vi.fn() })
    );
    expect(result.current.derived.anfitrionasFinal).toEqual(ids);
    expect(result.current.state.metodoPago).toBe('tarjeta');
    expect(result.current.state.propina).toBe(2500);
    expect(result.current.setters).not.toHaveProperty('setAgregarPropina');
    expect(result.current.setters).not.toHaveProperty('setMetodoPago');
    expect(result.current.setters).not.toHaveProperty('setHabitacionId');
  });
});

it('no busca ni agrega una habitacion al abrir un pedido sin habitacion y conserva propina cero', () => {
  const fetch = vi.spyOn(globalThis, 'fetch');
  const detail = [
    {
      id_pedido: 'pedido',
      metodo_pago: 'efectivo',
      propina: 0,
      anfitrionas_asignadas_ids: 'ana',
      total: 20000
    }
  ];
  const { result, rerender } = renderHook(
    ({ rooms }) => useOrderDetailModalState({ open: true, detail, rooms, onClose: vi.fn() }),
    { initialProps: { rooms: [] as any[] } }
  );
  expect(result.current.state.habitacionId).toBe('');
  expect(result.current.state.propina).toBe(0);
  rerender({ rooms: [{ id: 'room', estado: 1, tiempo: 90 }] });
  expect(result.current.state.habitacionId).toBe('');
  expect(result.current.state.propina).toBe(0);
  expect(fetch).not.toHaveBeenCalled();
  fetch.mockRestore();
});

it('carga el tiempo configurado cuando llegan las habitaciones y conserva el ajuste del cajero al refrescar', () => {
  const detail = [{ id_pedido: 'pedido', habitacion_id: 'room', metodo_pago: 'efectivo' }];
  const { result, rerender } = renderHook(
    ({ rooms }) => useOrderDetailModalState({ open: true, detail, rooms, onClose: vi.fn() }),
    { initialProps: { rooms: [] as any[] } }
  );
  rerender({ rooms: [{ id: 'room', estado: 1, tiempo: 90 }] });
  expect(result.current.state.tiempoHabitacion).toBe(90);
  act(() => result.current.setters.setTiempoHabitacion(120));
  rerender({ rooms: [{ id: 'room', estado: 1, tiempo: 60 }] });
  expect(result.current.state.tiempoHabitacion).toBe(120);
});
