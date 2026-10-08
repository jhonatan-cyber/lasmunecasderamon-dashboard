import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useNotifications } from '@/hooks/notificaciones/useNotifications';
const mocks = vi.hoisted(() => ({
  user: { id: 1, role: 'cajero' } as any, pathname: '/dashboard' as string | null,
  query: null as any, receive: null as any, counts: { pedidosCount: 2, solicitudesCount: 3 } as any,
  refetch: vi.fn(), emit: vi.fn(), on: vi.fn(), stop: vi.fn(), reconnect: vi.fn(),
  success: vi.fn(), info: vi.fn(), error: vi.fn(), warning: vi.fn(), sound: vi.fn(), announce: vi.fn(), fetch: vi.fn()
}));
vi.mock('@/hooks/auth/useCurrentUser', () => ({ useCurrentUser: () => ({ user: mocks.user }) }));
vi.mock('next/navigation', () => ({ usePathname: () => mocks.pathname }));
vi.mock('@tanstack/react-query', () => ({ useQuery: (options: any) => { mocks.query = options; return { data: mocks.counts, refetch: mocks.refetch }; } }));
vi.mock('@/hooks/shared', () => ({ useSharedSSE: (_url: unknown, fn: any) => { mocks.receive = fn; return { reconnect: mocks.reconnect }; } }));
vi.mock('@/lib/utils/eventBus', () => ({ appEventBus: { emit: mocks.emit, on: mocks.on } }));
vi.mock('@/lib/utils/audioUtils', () => ({ playNotificationSound: mocks.sound, announcePriority: mocks.announce }));
vi.mock('sonner', () => ({ toast: { success: mocks.success, info: mocks.info, error: mocks.error, warning: mocks.warning } }));
beforeEach(() => { vi.resetAllMocks(); mocks.user = { id: 1, role: 'cajero' }; mocks.pathname = '/dashboard'; mocks.counts = { pedidosCount: 2, solicitudesCount: 3 }; mocks.on.mockReturnValue(mocks.stop); mocks.fetch.mockResolvedValue({ ok: true, json: async () => ({ pedidosCount: 4 }) }); vi.stubGlobal('fetch', mocks.fetch); });
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
const order = { id: 7, codigo: 'P7', cliente: 'Cliente', total: 100 };
describe('notificaciones por rol y eventos en vivo', () => {
  it.each([null, '/', '/login'])('evita consultas y SSE en una ruta pública: %s', async pathname => {
    mocks.pathname = pathname; const h = renderHook(useNotifications); expect(h.result.current.isConnected).toBe(false); expect(await mocks.query.queryFn()).toEqual({ pedidosCount: 0, solicitudesCount: 0 }); expect(mocks.fetch).not.toHaveBeenCalled();
  });
  it('no consulta sin sesión y actualiza contadores sin datos previos', async () => {
    mocks.user = null; mocks.counts = null; const h = renderHook(useNotifications); expect(await mocks.query.queryFn()).toEqual({ pedidosCount: 0, solicitudesCount: 0 }); expect(h.result.current.pendingOrdersCount).toBe(0);
    act(() => mocks.receive({ type: 'new_order', data: order })); expect(h.result.current.pendingOrdersCount).toBe(1); expect(mocks.sound).not.toHaveBeenCalled();
  });
  it('consulta los contadores, informa errores HTTP y libera suscripciones', async () => {
    mocks.counts = {}; const h = renderHook(useNotifications); expect(h.result.current.pendingOrdersCount).toBe(0); expect(await mocks.query.queryFn()).toEqual({ pedidosCount: 4 });
    mocks.fetch.mockResolvedValueOnce({ ok: false }); await expect(mocks.query.queryFn()).rejects.toThrow('Failed');
    for (const [, listener] of mocks.on.mock.calls) listener(); expect(mocks.refetch).toHaveBeenCalledTimes(2); h.unmount(); expect(mocks.stop).toHaveBeenCalledTimes(2);
  });
  it.each(['cajero', 'administrador', 'anfitriona', 'garzon', 'barman'])('avisa pedidos según rol %s sin duplicar pedidos propios', role => {
    mocks.user.role = role; const h = renderHook(useNotifications);
    act(() => mocks.receive({ type: 'new_order', data: { ...order, createdBy: 1 } })); expect(mocks.sound).not.toHaveBeenCalled();
    act(() => mocks.receive({ type: 'new_order', data: { ...order, createdBy: 2, mesero: 'Garzón', anfitriona: 'Ana' } }));
    expect(h.result.current.pendingOrdersCount).toBe(4);
    if (['cajero', 'administrador'].includes(role)) expect(mocks.success).toHaveBeenCalledWith('¡NUEVO PEDIDO! #P7', expect.any(Object)); else expect(mocks.success).not.toHaveBeenCalled();
  });
  it.each(['cajero', 'administrador', 'anfitriona', 'garzon', 'barman', { name: 'cajero' }])('avisa servicios según rol %s y admite campos opcionales', role => {
    mocks.user.role = role; const h = renderHook(useNotifications);
    act(() => mocks.receive({ type: 'new_service_request', data: { id: 1, createdBy: 1 } })); expect(mocks.sound).not.toHaveBeenCalled();
    act(() => mocks.receive({ type: 'new_service_request', data: { id: 2 } }));
    act(() => mocks.receive({ type: 'new_service_request', data: { id: 3, cliente: 'Luis', habitacion_nombre: 'Suite', solicitado_por_nombre: 'Pedro', total: 100 } }));
    act(() => mocks.receive({ type: 'new_service_request', data: { id: 4, habitacion_id: 'r1', solicitado_por_nick: 'P' } }));
    expect(h.result.current.pendingServiceRequestsCount).toBe(7);
    if (['cajero', 'administrador'].includes(typeof role === 'string' ? role : role.name)) expect(mocks.success).toHaveBeenCalled(); else expect(mocks.success).not.toHaveBeenCalled();
  });
  it('deduplica avisos biométricos y conserva nombre cuando está disponible', () => {
    renderHook(useNotifications);
    for (const user of [null, { nombre: 'Ana', apellido: 'Pérez' }, { nombre: 'Ana' }, {}]) {
      act(() => mocks.receive({ type: 'attendance_registered', data: { origen: 'biometrico', user } }));
      act(() => mocks.receive({ type: 'attendance_duplicate', data: { origen: 'biometrico', user } }));
    }
    expect(mocks.success).toHaveBeenCalledWith('Asistencia registrada', expect.objectContaining({ id: 'asistencia-biometrica', description: 'Ana Pérez' }));
    expect(mocks.info).toHaveBeenCalledTimes(4);
    act(() => mocks.receive({ type: 'attendance_registered', data: { origen: 'manual' } })); expect(mocks.success).toHaveBeenCalledTimes(4);
  });
  it.each(['cajero', 'administrador', 'garzon'])('presenta alertas de tiempo y asistencia para %s', role => {
    mocks.user.role = role; renderHook(useNotifications);
    for (const type of ['timer_warning_5m', 'timer_ended_event', 'service_assistance']) act(() => mocks.receive({ type, data: { room_name: 'Suite', roomName: 'Suite', assistanceType: 'limpieza' } }));
    expect(mocks.sound).toHaveBeenCalledTimes(3); expect(mocks.announce).toHaveBeenCalledTimes(role === 'garzon' ? 0 : 3);
  });
  it('los contadores nunca bajan de cero y actualiza las vistas de anulaciones', () => {
    const h = renderHook(useNotifications);
    for (let i = 0; i < 5; i++) for (const type of ['service_request_processed', 'order_updated', 'order_deleted']) act(() => mocks.receive({ type, data: { orderId: 7 } }));
    expect(h.result.current.pendingOrdersCount).toBe(0); expect(h.result.current.pendingServiceRequestsCount).toBe(0);
    for (const type of ['sale_cancelled', 'anulacion_confirmada', 'anulacion_rechazada']) act(() => mocks.receive({ type, data: {} }));
    for (const tipo of ['venta', 'servicio', 'otro']) for (const accion of ['confirmar', 'rechazar']) act(() => mocks.receive({ type: 'anulacion_processed', data: { tipo, accion, codigo: 'A1', clienteNombre: 'Luis' } }));
    expect(mocks.success).toHaveBeenCalledWith('Solicitud aprobada', expect.any(Object)); expect(mocks.error).toHaveBeenCalledWith('Solicitud rechazada', expect.any(Object));
    act(() => mocks.receive(null)); act(() => mocks.receive({ type: 'new_order' })); expect(h.result.current.lastNotification).toBeNull();
  });
});
