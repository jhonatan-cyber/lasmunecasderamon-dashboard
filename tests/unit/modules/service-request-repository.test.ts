// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ServiceRequestRepository as requests } from '@/modules/operacion/solicitudes/repositorio';
const mocks = vi.hoisted(() => ({ query: vi.fn(), create: vi.fn(), details: vi.fn(), effects: vi.fn() }));
vi.mock('@/lib/database/db', () => ({ query: mocks.query, generateUUID: () => 'id' }));
vi.mock('@/lib/transaccion/contrato', () => ({ enUnaUnidad: (fn: any) => fn({ ejecutar: (operation: any) => operation({}) }) }));
vi.mock('@/lib/transaccion/infraestructura', () => ({ resolverTransaccion: () => mocks.query }));
vi.mock('@/lib/transaccion/efectos', () => ({ ejecutarEfectosConfirmados: mocks.effects }));
vi.mock('@/modules/operacion/servicios/creacion', () => ({ crearServicioEnUnidad: mocks.create }));
vi.mock('@/modules/operacion/servicios/servicio', () => ({ obtenerServicioDetallado: mocks.details }));
vi.mock('@/lib/utils/logger', () => ({ logger: { error: vi.fn() } }));
const pending = { id_solicitud: 'q1', estado: 'pendiente', total: 100, iva: 10, anfitrionas_ids: ['a1'], habitacion_id: 'r1', tiempo: 30 };
beforeEach(() => { vi.resetAllMocks(); mocks.query.mockResolvedValue([]); mocks.create.mockResolvedValue({ id: 's1', codigo: 'S1' }); mocks.details.mockResolvedValue(null); });
describe('solicitudes de servicio', () => {
  it('consulta y normaliza IDs heredados, con filtro opcional', async () => {
    mocks.query.mockResolvedValue([{ ...pending, anfitrionas_ids: '["a1"]' }, pending]);
    expect((await requests.getAll('pendiente'))[0].anfitrionas_ids).toEqual(['a1']); expect(mocks.query.mock.calls[0][1]).toEqual(['pendiente']);
    await requests.getAll(); expect(mocks.query.mock.calls[1][1]).toEqual([]);
    expect((await requests.getById('q1')).anfitrionas_ids).toEqual(['a1']);
    mocks.query.mockResolvedValue([pending]); expect((await requests.getById('q1')).anfitrionas_ids).toEqual(['a1']);
  });
  it('informa solicitudes inexistentes y evita ocultar JSON corrupto', async () => {
    await expect(requests.getById('missing')).rejects.toThrow(); mocks.query.mockResolvedValue([{ anfitrionas_ids: 'invalid' }]); await expect(requests.getById('q1')).rejects.toThrow('Error al obtener');
  });
  it('mapea el panel pendiente con campos opcionales y cuenta cero sin filas', async () => {
    expect(await requests.getPendingCount()).toBe(0); mocks.query.mockResolvedValue([{ count: 3 }]); expect(await requests.getPendingCount()).toBe(3);
    mocks.query.mockResolvedValue([{ ...pending, codigo: 'Q1', habitacion_nombre: 'Suite', cliente_nombre: 'Ana' }, { id_solicitud: 2 }]);
    const rows = await requests.getPendingServiceRequests(10); expect(rows[0]).toMatchObject({ id: 'q1', code: 'Q1', amount: 100 }); expect(rows[1]).toMatchObject({ id: '2', title: 'Sin habitación', subtitle: 'Sin cliente registrado', amount: 0 });
    await requests.getPendingServiceRequests(); await requests.delete('q1'); expect(mocks.query).toHaveBeenLastCalledWith(expect.stringContaining('DELETE'), ['q1']);
  });
  it.each(['getAll', 'getPendingCount', 'getPendingServiceRequests', 'getById', 'delete'] as const)('propaga errores de infraestructura en %s', async method => {
    mocks.query.mockRejectedValue(new Error('offline')); await expect((requests[method] as any)('q1')).rejects.toThrow('Error');
  });
  it.each([
    [null, 'Solicitud'], [{ ...pending, estado: 'aprobada' }, 'ya fue procesada'],
    [{ ...pending, total: 101 }, 'monto cambió'], [{ ...pending, anfitrionas_ids: [] }, 'anfitrionas'],
    [{ ...pending, anfitrionas_ids: {} }, 'anfitrionas'], [{ ...pending, habitacion_id: null }, 'habitación']
  ])('no aprueba solicitudes inválidas ni modifica sus filas: %s', async (row, message) => {
    mocks.query.mockResolvedValue(row ? [row] : []); await expect(requests.approve('q1', 'admin', undefined, 100)).rejects.toThrow(String(message)); expect(mocks.create).not.toHaveBeenCalled();
  });
  it.each([true, false])('aprueba con datos completos o mínimos y confirma efectos después: %s', async complete => {
    const row = complete ? { ...pending, cliente_id: 'c1', anfitrionas_ids: '["a1"]', precio_habitacion: 50, precio_servicio: 40 } : { ...pending, total: undefined, iva: undefined, tiempo: undefined };
    mocks.query.mockResolvedValue([row]); mocks.create.mockImplementation(async (_body, _user, _context, enqueue) => { enqueue(vi.fn()); return { id: 's1', codigo: 'S1' }; });
    if (complete) mocks.details.mockResolvedValue({ codigo: 'S2', habitacion_nombre: 'Suite', cliente_nombre: 'Ana', anfitrionas_nombres: 'Lola' });
    const result = await requests.approve('q1', 'admin', complete ? 'r2' : undefined);
    expect(result).toMatchObject({ servicio_id: 's1', codigo: complete ? 'S2' : 'S1', habitacion_id: complete ? 'r2' : 'r1' });
    expect(mocks.create.mock.calls[0][0]).toMatchObject({ usuarios: ['a1'], cliente_id: complete ? 'c1' : null, sub_total: complete ? 90 : 0 });
    expect(mocks.effects).toHaveBeenCalledWith([expect.any(Function)]);
    expect(mocks.query).toHaveBeenLastCalledWith(expect.stringContaining("estado = 'aprobada'"), expect.arrayContaining(['admin', 'q1']));
  });
  it.each([null, { ...pending, estado: 'rechazada' }, { ...pending, total: 101 }])('rechazo exige pendiente y monto sin cambios: %s', async row => {
    mocks.query.mockResolvedValue(row ? [row] : []); await expect(requests.reject('q1', 'admin', 'Motivo', 100)).rejects.toThrow(); expect(mocks.query).toHaveBeenCalledTimes(1);
  });
  it('registra el motivo de rechazo, incluyendo el control opcional de monto', async () => {
    mocks.query.mockResolvedValue([pending]); expect(await requests.reject('q1', 'admin', 'Sin disponibilidad', 100)).toMatchObject({ estado: 'rechazada', motivo_rechazo: 'Sin disponibilidad' });
    await requests.reject('q1', 'admin', 'Otro'); expect(mocks.query).toHaveBeenLastCalledWith(expect.stringContaining("estado = 'rechazada'"), expect.arrayContaining(['Otro', 'admin', 'q1']));
  });
});
