// @vitest-environment node
import { beforeEach, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ query: vi.fn(), trx: vi.fn(), transaction: vi.fn() }));
vi.mock('@/lib/database/db', () => ({
  query: mocks.query,
  generateUUID: () => 'new-room',
  withTransaction: mocks.transaction
}));
vi.mock('@/lib/business/timezoneService', () => ({
  getNowInBusinessTimezone: () => '2026-10-16 12:00:00'
}));
import { RoomRepository } from '@/modules/operacion/habitaciones/repositorio';
import { RoomService } from '@/modules/operacion/habitaciones/servicio';
import { RoomWriteSchema } from '@/lib/business/schemas/room';

beforeEach(() => {
  vi.clearAllMocks();
  mocks.transaction.mockImplementation(async callback => callback(mocks.trx));
  mocks.trx.mockImplementation(async (sql: string) =>
    sql.includes('MAX(display_order)') ? [{ last_order: 8 }] : []
  );
  mocks.query.mockImplementation(async (sql: string) =>
    sql.includes('SELECT *')
      ? [
          {
            id_habitacion: 'new-room',
            nombre: 'Sala',
            precio: 1000,
            tiempo: 30,
            estado: 1,
            display_order: 9
          }
        ]
      : []
  );
});

it('agrega habitaciones al final sin cambiar las posiciones existentes', async () => {
  await RoomRepository.create({ name: 'Sala', price: 1000, time: 30 });
  const insert = mocks.trx.mock.calls.find(([sql]) => sql.startsWith('INSERT'))!;
  expect(insert[0]).toContain('display_order');
  expect(insert[1].at(-1)).toBe(9);
  expect(mocks.trx.mock.calls.some(([sql]) => sql.startsWith('UPDATE'))).toBe(false);
});

it('edita los datos sin tocar display_order', async () => {
  await RoomRepository.update('new-room', { name: 'Sala editada', price: 2000, time: 40 });
  const update = mocks.query.mock.calls.find(([sql]) => sql.startsWith('UPDATE'))!;
  expect(update[0]).not.toContain('display_order');
});

it('persiste las posiciones display_order del drag and drop en una transacción', async () => {
  await RoomService.reorder([
    { id: 'b', display_order: 1 },
    { id: 'a', display_order: 2 }
  ]);
  expect(mocks.transaction).toHaveBeenCalledOnce();
  const updates = mocks.trx.mock.calls.filter(([sql]) => sql.startsWith('UPDATE'));
  expect(updates.map(([, params]) => [params[0], params.at(-1)])).toEqual([
    [1, 'b'],
    [2, 'a']
  ]);
});

it('rechaza el formato incorrecto antes de modificar posiciones', async () => {
  await expect(RoomService.reorder([{ id: 'a', orden: 1 }] as any)).rejects.toThrow();
  expect(mocks.transaction).not.toHaveBeenCalled();
});

it.each(['price', 'time', 'comision_anfitriona'])(
  'rechaza ceros en %s también en el servidor',
  field => {
    expect(
      RoomWriteSchema.safeParse({ name: 'Sala', price: 1000, time: 30, [field]: '000' }).success
    ).toBe(false);
  }
);
