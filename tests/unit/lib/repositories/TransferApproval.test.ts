import { describe, expect, it, vi } from 'vitest';
import { aceptarTransferencia } from '@/modules/inventario';
import { conContextoOperacionExistente } from '@/tests/setup/contexto-operacion';
vi.mock('@/lib/database/db', () => ({
  query: vi.fn(),
  withTransaction: vi.fn(),
  generateUUID: vi.fn()
}));

function connection(
  overrides: {
    estado?: string;
    sender?: string;
    units?: number;
    /** Rol del usuario que intenta resolver y si su rol tiene el par concedido. */
    role?: string;
    authorized?: boolean;
  } = {}
) {
  return vi.fn(async (sql: string, _params?: unknown[]): Promise<any> => {
    if (sql.includes('INNER JOIN roles'))
      return [{ rol: overrides.role ?? 'barman', autorizado: overrides.authorized ?? true }];
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

  it('chequea el par products/accept_transfer del catálogo, no el nombre del rol', async () => {
    const trx = connection();
    await conContextoOperacionExistente(trx, contexto =>
      aceptarTransferencia('t1', 'encargado-1', contexto)
    );
    expect(trx.mock.calls[0][1]).toEqual(['products', 'accept_transfer', 'encargado-1']);
  });

  it('acepta a cualquier rol con el permiso, no solo al Barman', async () => {
    const trx = connection({ role: 'encargado_bar', authorized: true });
    await conContextoOperacionExistente(trx, contexto =>
      aceptarTransferencia('t1', 'encargado-1', contexto)
    );
    expect(trx).toHaveBeenCalledWith(expect.stringContaining("SET ubicacion = 'bar'"), ['t1']);
  });

  it('el administrador pasa aunque su rol no tenga el par concedido', async () => {
    const trx = connection({ role: 'administrador', authorized: false });
    await conContextoOperacionExistente(trx, contexto =>
      aceptarTransferencia('t1', 'admin-1', contexto)
    );
    expect(trx).toHaveBeenCalledWith(expect.stringContaining("SET ubicacion = 'bar'"), ['t1']);
  });

  it('el administrador puede aceptar su propia transferencia', async () => {
    const trx = connection({ role: 'administrador', sender: 'admin-1' });
    await conContextoOperacionExistente(trx, contexto =>
      aceptarTransferencia('t1', 'admin-1', contexto)
    );
    expect(trx).toHaveBeenCalledWith(expect.stringContaining("SET ubicacion = 'bar'"), ['t1']);
  });

  it('un Barman sin el permiso tampoco resuelve', async () => {
    const trx = connection({ role: 'barman', authorized: false });
    await expect(
      conContextoOperacionExistente(trx, contexto =>
        aceptarTransferencia('t1', 'barman-1', contexto)
      )
    ).rejects.toThrow('No tienes permiso para aceptar la transferencia');
    expect(trx.mock.calls.some(([sql]) => sql.startsWith('UPDATE'))).toBe(false);
  });
});
