import { beforeEach, describe, expect, it, vi } from 'vitest';

// Estado controlable para el fake de transacción: rol del trabajador y
// categoría protegida de la presentación elegida.
const state = vi.hoisted(() => ({
  workerRole: 'anfitriona' as string | null,
  systemKey: null as string | null,
  inserted: false,
  bottle: {
    tipo: 'botella',
    acompanamiento: { unidades: 0 }
  } as Record<string, unknown>
}));

vi.mock('@/lib/database/db', () => {
  type Trx = (sql: string) => Promise<unknown>;
  const trx: Trx = vi.fn(async (sql: string) => {
    if (sql.includes('SELECT u.id_usuario')) {
      return [{ id_usuario: 'w', rol: state.workerRole }];
    }
    if (sql.includes('p.opciones_venta')) {
      return [
        {
          id: 'p',
          opciones_venta: [state.bottle],
          system_key: state.systemKey,
          ml_botella: 750,
          presentacion_nombre: '750 ml',
          producto_nombre: 'Whisky'
        }
      ];
    }
    if (sql.includes('FROM cajas') && sql.includes('FOR UPDATE')) return [{ id_caja: 'c1' }];
    // Comprobación preliminar de duplicado: sin colación previa en la caja abierta.
    if (sql.includes('FROM colaciones') && sql.includes('caja_id = (SELECT')) return [];
    // Acompañamiento: bebida analcohólica con stock en el bar.
    if (sql.includes('AND c.system_key = ?')) return [{ id: 'mixer-1' }];
    if (sql.includes('INSERT INTO colaciones')) {
      state.inserted = true;
      return undefined;
    }
    if (sql.includes('SELECT id FROM colaciones WHERE usuario_id')) return [];
    if (sql.includes('SELECT id FROM colaciones WHERE id')) return [{ id: 'col-1' }];
    return [];
  });
  return {
    query: vi.fn(async () => []),
    withTransaction: vi.fn(async (callback: (transaction: Trx) => unknown) => callback(trx)),
    generateUUID: () => 'col-1'
  };
});

vi.mock('@/lib/business/timezoneService', () => ({
  getNowInBusinessTimezone: () => '2025-01-01 12:00:00'
}));

// El descuento de stock se prueba contra PostgreSQL (postgres/colaciones-flow);
// este caso aísla la regla rol → catálogo.
vi.mock('@/modules/inventario', () => ({
  consumirColacionBar: vi.fn().mockResolvedValue(undefined)
}));

import { registrarColacion } from '@/modules/colaciones';

const input = {
  usuarioId: 'w',
  registradoPor: 'r',
  presentacionId: 'p',
  acompanamiento: null as 'gaseosa' | 'soda' | null
};

beforeEach(() => {
  state.workerRole = 'anfitriona';
  state.systemKey = null;
  state.inserted = false;
  state.bottle = { tipo: 'botella', acompanamiento: { unidades: 0 } };
  vi.clearAllMocks();
});

describe('registrarColacion: producto según rol', () => {
  it('la anfitriona puede registrar productos habilitados para colación', async () => {
    state.workerRole = 'anfitriona';
    state.systemKey = 'licores';

    await expect(registrarColacion(input)).resolves.toEqual({
      id: 'col-1',
      caja_id: 'c1',
      fecha: '2025-01-01',
      ml_bebida: 750,
      nombre_bebida: 'Whisky 750 ml'
    });
    expect(state.inserted).toBe(true);
  });

  it.each(['cajero', 'garzon', 'barman'])(
    '%s puede registrar bebidas analcohólicas habilitadas',
    async rol => {
      state.workerRole = rol;
      state.systemKey = 'bebidas_analcoholicas';

      await expect(registrarColacion(input)).resolves.toMatchObject({ id: 'col-1' });
      expect(state.inserted).toBe(true);
    }
  );

  it.each(['cajero', 'garzon', 'barman'])(
    '%s no puede registrar un producto que no sea analcohólico',
    async rol => {
      state.workerRole = rol;
      state.systemKey = 'licores';

      await expect(registrarColacion(input)).rejects.toThrow(
        /Este rol solo recibe bebidas analcohólicas habilitadas para colación/
      );
      expect(state.inserted).toBe(false);
    }
  );

  it('acepta el acompañamiento propio de la colación', async () => {
    state.bottle = {
      tipo: 'botella',
      acompanamiento: { unidades: 0 },
      acompanamiento_colacion: { unidades: 2, ml: 150 }
    };

    await expect(
      registrarColacion({
        ...input,
        acompanamiento: 'gaseosa',
        acompanamientoPresentacionId: 'mixer-1'
      })
    ).resolves.toMatchObject({ id: 'col-1' });
    expect(state.inserted).toBe(true);
  });

  it('rechaza el acompañamiento cuando la colación no lo configura', async () => {
    await expect(
      registrarColacion({
        ...input,
        acompanamiento: 'gaseosa',
        acompanamientoPresentacionId: 'mixer-1'
      })
    ).rejects.toThrow('Esta bebida no tiene acompañamiento configurado');
    expect(state.inserted).toBe(false);
  });

  it('rechaza roles que no reciben colación', async () => {
    state.workerRole = 'supervisor';

    await expect(registrarColacion(input)).rejects.toThrow('Este rol no recibe colación');
    expect(state.inserted).toBe(false);
  });
});
