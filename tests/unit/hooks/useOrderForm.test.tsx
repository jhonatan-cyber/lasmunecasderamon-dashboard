import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useOrderForm, type OrderProducto } from '@/hooks/personal/useOrderForm';
const mocks = vi.hoisted(() => ({ user: { id: 'waiter' } as any, fetch: vi.fn(), push: vi.fn(), success: vi.fn(), error: vi.fn(), emit: vi.fn(), rooms: vi.fn() }));
vi.mock('@/hooks/auth/useCurrentUser', () => ({ useCurrentUser: () => ({ user: mocks.user }) }));
vi.mock('@/hooks/habitaciones/useRooms', () => ({ default: () => ({ rooms: [], fetchRooms: mocks.rooms }) }));
vi.mock('@/hooks/shared/useConfigValue', () => ({ useConfigValue: () => '10' }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: mocks.push }) }));
vi.mock('@/lib/utils/toastUtils', () => ({ showSuccessToast: mocks.success, showErrorToast: mocks.error }));
vi.mock('@/lib/utils/eventBus', () => ({ appEventBus: { emit: mocks.emit } }));
vi.mock('@/lib/utils/codeUtils', () => ({ generateRandomCode: () => 'ORDER' }));
vi.mock('@/components/orders/productModalRules', () => ({ isChampagneProduct: (p: any) => p.isChampagne === true, getHostessLimit: () => 2 }));
const drink: OrderProducto = { id: 'p1', nombre: 'Ron', precio: 100, cantidad: 1, subtotal: 100, generaComision: 0 };
function setup(productos: OrderProducto[] = [drink], selectedCliente = '') {
  const props = { productos, selectedCliente, setSelectedCliente: vi.fn(), onAddProducto: vi.fn(), onSubmit: vi.fn() };
  return { ...renderHook(() => useOrderForm(props)), props };
}
beforeEach(() => { vi.resetAllMocks(); mocks.user = { id: 'waiter' }; vi.stubGlobal('fetch', mocks.fetch); mocks.fetch.mockResolvedValue({ status: 201, json: async () => ({ success: true }) }); vi.useFakeTimers(); });
afterEach(() => { cleanup(); vi.useRealTimers(); vi.unstubAllGlobals(); });
describe('creación de pedidos', () => {
  it.each([
    [[], 'al menos un producto'],
    [[{ ...drink, generaComision: 1 }], 'al menos una anfitriona'],
    [[{ ...drink, generaComision: 1, selectedHostesses: [1] }, { ...drink, id: 'p2', generaComision: 1, selectedHostesses: [1] }], 'únicas'],
    [[{ ...drink, generaComision: 1, selectedHostesses: [1] }, { ...drink, isChampagne: true, generaComision: 1, selectedHostesses: [1] }], 'también a champañas'],
    [[{ ...drink, isChampagne: true, generaComision: 1, selectedHostesses: [1, 2, 3] }], 'límite'],
    [[{ ...drink, generaComision: 1, selectedHostesses: [1, 2] }], 'máximo'],
    [[{ ...drink, id: undefined }], 'identificador válido']
  ] as [OrderProducto[], string][])('bloquea el pedido inválido: %s', async (products, message) => {
    const h = setup(products); await act(async () => h.result.current.handleSubmitInternal());
    expect(h.result.current.error).toContain(message); expect(mocks.fetch).not.toHaveBeenCalled();
  });
  it.each([null, { id: '' }, { id: 'NaN' }, { id: 'undefined' }, { id: 'null' }])('no envía pedidos sin mesero válido: %s', async user => {
    mocks.user = user; const h = setup(); await act(async () => h.result.current.handleSubmitInternal()); expect(h.result.current.error).toContain('mesero'); expect(mocks.fetch).not.toHaveBeenCalled();
  });
  it('calcula propina y envía identificadores, comisiones y habitación normalizados', async () => {
    const h = setup([{ ...drink, selectedRoom: ' r1 ', generaComision: 1, comision: 20, selectedHostesses: [1] }], ' client ');
    act(() => h.result.current.handleTipChange(true, 15)); expect(h.result.current.total).toBe(115);
    await act(async () => h.result.current.handleSubmitInternal());
    const payload = JSON.parse(mocks.fetch.mock.calls[0][1].body);
    expect(payload).toMatchObject({ codigo: 'ORDER', clienteId: 'client', meseroId: 'waiter', subtotal: 100, propina: 15, totalComision: 20, usuarios: [{ usuarioId: '1' }] });
    expect(payload.detalles[0]).toMatchObject({ productoId: 'p1', hostessId: '1', roomId: 'r1' });
    expect(h.props.setSelectedCliente).toHaveBeenCalledWith(''); expect(h.props.onSubmit).toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(1500)); expect(mocks.push).toHaveBeenCalledWith('/orders');
  });
  it('recarga habitaciones si el servidor seleccionó una automáticamente', async () => {
    mocks.fetch.mockResolvedValueOnce({ status: 201, json: async () => ({ success: true, habitacion_auto_seleccionada: 'r1' }) });
    const h = setup([{ ...drink, id: undefined, id_producto: 'p1', precio: undefined, price: 10, generaComision: undefined, selectedHostesses: [1, 2] }, { ...drink, subtotal: undefined }]);
    await act(async () => h.result.current.handleSubmitInternal()); expect(mocks.rooms).toHaveBeenCalled(); expect(mocks.emit).toHaveBeenCalledWith('refreshRooms', { roomId: 'r1' });
  });
  it.each(['business', 'fallback', 'network'])('informa errores del servidor o conexión: %s', async mode => {
    if (mode === 'network') mocks.fetch.mockRejectedValueOnce(new Error('offline')); else mocks.fetch.mockResolvedValueOnce({ status: 400, json: async () => ({ success: false, message: mode === 'business' ? 'Saldo insuficiente' : undefined }) });
    const h = setup(); await act(async () => h.result.current.handleSubmitInternal()); expect(mocks.error).toHaveBeenCalled(); expect(h.props.onSubmit).not.toHaveBeenCalled();
  });
  it('mantiene cantidades y selecciones al añadir y limpia únicamente las del producto añadido', () => {
    const h = setup(); act(() => { h.result.current.handleCantidadChange('p1', '3'); h.result.current.handleCantidadChange('p2', 'x'); h.result.current.handleChampagneHostessChange('p1', ['1']); h.result.current.handleOtherProductHostessChange('p1', ['2']); h.result.current.handleRoomChange('p1', 'r1'); });
    act(() => h.result.current.handleAgregarProducto({ ...drink, commission: 20, selectedHostesses: [1], isChampagne: true, selectedRoom: 'r1', requiresRoom: true }));
    expect(h.props.onAddProducto).toHaveBeenCalledWith(expect.objectContaining({ cantidad: 3, comision: 60, subtotal: 300, generaComision: 1, isChampagne: true }));
    expect(h.result.current.cantidades).toEqual({ p1: 1, p2: 1 }); expect(h.result.current.roomSelections).toEqual({});
    act(() => h.result.current.handleAgregarProducto({ id_producto: 'p2', price: 50 }));
    expect(h.props.onAddProducto).toHaveBeenLastCalledWith(expect.objectContaining({ subtotal: 50, comision: 0, selectedHostesses: [], selectedRoom: null }));
  });
  it.each(['success', 'failure', 'network'])('carga categorías y siempre termina el indicador: %s', async mode => {
    if (mode === 'network') mocks.fetch.mockRejectedValueOnce(new Error('offline')); else mocks.fetch.mockResolvedValueOnce({ json: async () => ({ success: mode === 'success', data: [drink] }) });
    const h = setup(); await act(async () => h.result.current.handleOpenCategoria({ id: 2 })); expect(h.result.current.modalOpen).toBe(true); expect(h.result.current.loadingProductos).toBe(false); expect(h.result.current.productosCategoria).toEqual(mode === 'success' ? [drink] : []);
  });
});
