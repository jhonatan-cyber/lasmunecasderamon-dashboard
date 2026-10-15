import { beforeEach, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({
  trx: vi.fn(),
  insert: vi.fn(),
  local: vi.fn(),
  libres: vi.fn()
}));
vi.mock('@/lib/database/db', () => ({
  query: vi.fn(),
  generateUUID: () => 'uuid',
  withTransaction: async (fn: any) => fn(mocks.trx)
}));
vi.mock('@/lib/database/base-repository', () => ({ BaseRepository: { insert: mocks.insert } }));
vi.mock('@/modules/inventario', () => ({ validarConfiguracionPedido: vi.fn() }));
vi.mock('@/modules/identidad', () => ({
  validarAnfitrionasEnLocal: mocks.local,
  comprobarAnfitrionasLibresParaServicio: mocks.libres
}));
vi.mock('@/modules/comunicaciones', () => ({ sendPushByRole: vi.fn() }));
vi.mock('@/lib/api/sseService', () => ({ sendNotificationToAll: vi.fn() }));
import { OrderRepository } from '@/modules/operacion/pedidos/repositorio';
import { BusinessError } from '@/lib/errors/errors';
const body = {
  codigo: 'PED',
  meseroId: 'garzon',
  metodoPago: 'efectivo' as const,
  subtotal: 100,
  total: 100,
  detalles: [
    {
      productoId: 'prod',
      precio: 100,
      cantidad: 1,
      subtotal: 100,
      comision: 5,
      selectedHostesses: ['ana']
    }
  ]
};
beforeEach(() => {
  vi.clearAllMocks();
  mocks.trx.mockResolvedValue([]);
  mocks.local.mockResolvedValue(['ana']);
  mocks.libres.mockResolvedValue(undefined);
});
it('rechaza anfitrionas ocupadas antes de guardar cabecera o detalles', async () => {
  mocks.libres.mockRejectedValueOnce(new BusinessError('Anfitriona ocupada', 'HOSTESS_OCCUPIED'));
  await expect(OrderRepository.create(body)).rejects.toMatchObject({ code: 'HOSTESS_OCCUPIED' });
  expect(mocks.libres).toHaveBeenCalledWith(
    ['ana'],
    expect.objectContaining({ id: expect.any(String) })
  );
  expect(mocks.insert).not.toHaveBeenCalled();
});
it('rechaza anfitrionas fuera del local antes de comprobar ocupacion y guardar', async () => {
  mocks.local.mockResolvedValueOnce([]);
  await expect(OrderRepository.create(body)).rejects.toMatchObject({
    code: 'HOSTESS_NOT_LOGGED_IN'
  });
  expect(mocks.libres).not.toHaveBeenCalled();
  expect(mocks.insert).not.toHaveBeenCalled();
});
it('rechaza habitacion ocupada antes de guardar el pedido', async () => {
  mocks.trx.mockResolvedValue([
    { id_habitacion: 'room', estado: 2, precio: 100, comision_anfitriona: 10 }
  ]);
  await expect(
    OrderRepository.create({ ...body, detalles: [{ ...body.detalles[0], roomId: 'room' }] })
  ).rejects.toThrow('habitacion no esta disponible');
  expect(mocks.insert).not.toHaveBeenCalled();
});

it('detecta actividad real aunque la habitacion aparezca marcada libre', async () => {
  mocks.trx
    .mockResolvedValueOnce([{ estado: 1, precio: 100, comision_anfitriona: 10 }])
    .mockResolvedValueOnce([{ activa: 1 }]);
  await expect(
    OrderRepository.create({ ...body, detalles: [{ ...body.detalles[0], roomId: 'room' }] })
  ).rejects.toThrow('habitacion no esta disponible');
  expect(mocks.insert).not.toHaveBeenCalled();
});
