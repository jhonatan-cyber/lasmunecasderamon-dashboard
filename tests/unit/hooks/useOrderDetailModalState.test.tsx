import { renderHook, act } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useOrderDetailModalState } from '@/hooks/orders/useOrderDetailModalState';
import { getOrderHostessIds } from '@/components/orders/orderDetailUtils';

vi.mock('@/hooks/shared/useConfigValue', () => ({ useConfigValue: () => '10' }));

describe('Aceptación de pedidos', () => {
  const ids = ['a9df26ba-849d-47da-9331-069281791a71', 'fa4d0931-fc78-40eb-ae7e-723679f735df'];
  it('recupera ambas anfitrionas UUID aunque el pedido solo tenga sus nombres visibles', () => {
    expect(getOrderHostessIds([{ anfitriona: 'Lola, Lizi', anfitrionaIds: ids.join(',') }])).toEqual(ids);
    expect(getOrderHostessIds([{ anfitrionaIds: ids.join(','), anfitrionas_asignadas_ids: ids[0] }])).toEqual(ids);
  });
  it('recupera pago y propina y permite quitar la propina original', () => {
    const detail = [{ anfitrionaIds: ids.join(','), metodo_pago: 'tarjeta', propina: 2500, total: 25000, habitacion_id: 'room-1' }];
    const { result } = renderHook(() => useOrderDetailModalState({ open: true, detail, rooms: [], onClose: vi.fn() }));
    expect(result.current.derived.anfitrionasFinal).toEqual(ids);
    expect(result.current.state.metodoPago).toBe('tarjeta');
    expect(result.current.state.propina).toBe(2500);
    act(() => result.current.setters.setAgregarPropina(false));
    expect(result.current.state.propina).toBe(0);
  });
});
