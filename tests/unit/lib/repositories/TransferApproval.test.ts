import { describe, expect, it, vi } from 'vitest';
import { aceptarTransferencia } from '@/modules/inventario';
import { conContextoOperacionExistente } from '@/tests/setup/contexto-operacion';
vi.mock('@/lib/database/db', () => ({
  query: vi.fn(),
  withTransaction: vi.fn(),
  generateUUID: vi.fn()
}));

function connection(
  overrides: { estado?: string; sender?: string; units?: number; authorized?: boolean } = {}
) {
  return vi.fn(async (sql: string, _params?: unknown[]): Promise<any> => {
    if (sql.includes('INNER JOIN roles'))
      return overrides.authorized === false ? [] : [{ id_usuario: 'barman-1' }];
    if (sql.includes('SELECT producto_id FROM inventario_movimientos'))
      return [{ producto_id: 'p1' }];
    if (sql.includes('SELECT * FROM inventario_movimientos'))
      return [
        {
          id: 't1',
          producto_id: 'p1',
          presentacion_id: 'pres1',
          estado: overrides.estado ?? 'pendiente',
          usuario_id: overrides.sender ?? 'sender1',
          cantidad: 2,
          precio_venta: 5000,
          comision: 0,
          opciones_venta: [{ tipo: 'botella', precio: 5000, comision: 0 }]
        }
      ];
    if (sql.includes('SELECT id FROM inventario_unidades'))
      return Array.from({ length: overrides.units ?? 2 }, (_, id) => ({ id }));
    return [];
  });
}

describe('aceptación de transferencias', () => {
  it('ingresa al bar y registra al receptor tras verificar la reserva', async () => {
    const trx = connection();
    await conContextoOperacionExistente(trx, contexto =>
      aceptarTransferencia('t1', 'barman-1', contexto)
    );
    expect(trx).toHaveBeenCalledWith(expect.stringContaining("SET ubicacion = 'bar'"), ['t1']);
    expect(trx).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE inventario_movimientos'),
      expect.arrayContaining(['aceptada', 'barman-1', 't1'])
    );
  });
  it.each([{ estado: 'aceptada' }, { sender: 'barman-1' }, { units: 1 }, { authorized: false }])(
    'rechaza sin modificar inventario: %j',
    async overrides => {
      const trx = connection(overrides);
      await expect(
        conContextoOperacionExistente(trx, contexto =>
          aceptarTransferencia('t1', 'barman-1', contexto)
        )
      ).rejects.toThrow();
      expect(trx.mock.calls.some(([sql]) => sql.startsWith('UPDATE'))).toBe(false);
    }
  );
});
