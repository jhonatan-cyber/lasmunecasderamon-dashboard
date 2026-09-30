import { beforeEach, describe, expect, it, vi } from 'vitest';

const repositoryHarness = vi.hoisted(() => {
  const queryMock = vi.fn();
  const withTransactionMock = vi.fn(async (cb: any) => cb(queryMock));
  return { queryMock, withTransactionMock };
});

vi.mock('@/lib/database/db', () => ({
  generateUUID: () => 'caja-1',
  withTransaction: repositoryHarness.withTransactionMock,
  query: repositoryHarness.queryMock
}));

vi.mock('@/lib/business/timezoneService', () => ({
  getNowInBusinessTimezone: () => '2026-04-11 12:00:00',
  getSystemTimezone: () => 'America/Santiago'
}));

vi.mock('@/lib/business/schemas', () => ({
  CajaSchema: {
    parse: (value: any) => value
  }
}));

vi.mock('@/lib/repositories/BaseRepository', () => ({
  BaseRepository: {
    insert: vi.fn(),
    update: vi.fn(),
    findOne: vi.fn()
  }
}));

import { ConflictError } from '@/lib/errors/errors';
import { CashRegisterRepository } from '@/lib/repositories/CashRegisterRepository';
import { BaseRepository } from '@/lib/repositories/BaseRepository';
import { montoCierreCaja, totalCaja } from '@/lib/business/cajaEfectivo';

describe('CashRegisterRepository.open', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('bloquea segunda caja abierta aunque sea de otro usuario', async () => {
    repositoryHarness.queryMock.mockResolvedValueOnce([
      { id_caja: 'caja-abierta', usuario_id_apertura: 'user-1' }
    ]);

    await expect(CashRegisterRepository.open('user-2', 100)).rejects.toThrow(
      new ConflictError('Ya existe una caja abierta')
    );

    expect(BaseRepository.insert).not.toHaveBeenCalled();
  });

  it('abre caja cuando no existe ninguna abierta', async () => {
    repositoryHarness.queryMock
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        {
          id_caja: 'caja-1',
          fecha_apertura: '2026-04-11 12:00:00',
          usuario_id_apertura: 'user-1',
          monto_apertura: 100,
          estado: 1,
          fecha_cierre: null,
          usuario_id_cierre: null,
          monto_cierre: null,
          venta: 0,
          servicio: 0,
          efectivo: 0,
          tarjeta: 0,
          transferencia: 0,
          devolucion: 0,
          prepago: 0,
          propina: 0,
          cuenta: 0,
          anticipo: 0,
          iva: 0,
          comision: 0,
          usuario_apertura: 'Usuario Uno',
          cajero_nombre: 'Usuario Uno'
        }
      ])
      .mockResolvedValue([]);

    const result = await CashRegisterRepository.open('user-1', 100);

    expect(BaseRepository.insert).toHaveBeenCalledWith(
      repositoryHarness.queryMock,
      'cajas',
      expect.objectContaining({
        id_caja: 'caja-1',
        usuario_id_apertura: 'user-1',
        monto_apertura: 100,
        estado: 1
      })
    );
    expect(result).toEqual(
      expect.objectContaining({
        id_caja: 'caja-1',
        usuario_id_apertura: 'user-1',
        monto_apertura: 100,
        estado: 1
      })
    );
  });
});

/** Fila cruda de `cajas` con el turno ya cargado (100.000 + 50.000 + 20.000 + 5.000 − 3.000). */
const cajaConMovimiento = {
  id_caja: 'caja-1',
  fecha_apertura: '2026-04-11 08:00:00',
  usuario_id_apertura: 'user-1',
  monto_apertura: 100000,
  efectivo: 50000,
  tarjeta: 20000,
  transferencia: 5000,
  devolucion: 3000,
  estado: 1,
  cajero_nombre: 'Cajero Uno'
};

/**
 * El espejo del dinero: el monto de cierre descuenta los saldos prepago que los
 * clientes todavía tienen cargados, porque ese dinero no está en el cajón.
 */
describe('CashRegisterRepository.calcularMontoCierre', () => {
  it('descuenta los saldos de clientes del efectivo del turno', () => {
    const caja = {
      monto_apertura: 100000,
      efectivo: 50000,
      tarjeta: 20000,
      transferencia: 5000,
      devolucion: 3000
    };

    // 100.000 + 50.000 + 20.000 + 5.000 − 3.000 − 12.000
    expect(CashRegisterRepository.calcularMontoCierre(caja, 12000)).toBe(160000);
  });

  it('lee las devoluciones como vienen en la fila cruda (`devolucion`) y como las expone el dominio', () => {
    expect(
      CashRegisterRepository.calcularMontoCierre({ monto_apertura: 1000, devolucion: 200 }, 0)
    ).toBe(800);
    expect(
      CashRegisterRepository.calcularMontoCierre({ monto_apertura: 1000, devoluciones: 200 }, 0)
    ).toBe(800);
  });

  it('sin saldos pendientes el monto de cierre no cambia', () => {
    expect(
      CashRegisterRepository.calcularMontoCierre({ monto_apertura: 1000, efectivo: 500 }, 0)
    ).toBe(1500);
  });

  it('delega en la función compartida del cajón (misma cuenta que tarjeta y detalle)', () => {
    // El monto de cierre, la tarjeta (`Balance Actual`) y el detalle (`Total real`)
    // tienen que dar el mismo número: si alguno vuelve a armar su propia resta,
    // este test se rompe.
    expect(CashRegisterRepository.calcularMontoCierre(cajaConMovimiento, 12000)).toBe(
      montoCierreCaja(cajaConMovimiento, 12000)
    );
    expect(CashRegisterRepository.calcularMontoCierre(cajaConMovimiento, 12000)).toBe(
      totalCaja({ ...cajaConMovimiento, saldo_clientes_descontado: 12000 })
    );
  });
});

describe('CashRegisterRepository.solicitarCierre', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const simular = (opciones: { pendiente?: any; saldos?: number } = {}) => {
    repositoryHarness.queryMock.mockImplementation(async (sql: any) => {
      const texto = String(sql);
      // `getById` también menciona `solicitudes_cierre_caja` en su EXISTS, así que
      // la lectura de la caja va primero.
      if (texto.includes('FROM cajas')) return [cajaConMovimiento];
      if (texto.includes('SUM(saldo)')) return [{ saldo_pendiente: opciones.saldos ?? 0 }];
      if (texto.includes('FROM solicitudes_cierre_caja')) return opciones.pendiente ?? [];
      return [];
    });
  };

  it('crea la solicitud pendiente con el monto que descuenta los saldos, sin cerrar la caja', async () => {
    simular({ saldos: 12000 });

    const resultado = await CashRegisterRepository.solicitarCierre('caja-1', { nombre: 'Cajero' });

    expect(BaseRepository.insert).toHaveBeenCalledWith(
      repositoryHarness.queryMock,
      'solicitudes_cierre_caja',
      expect.objectContaining({
        caja_id: 'caja-1',
        estado: 'pendiente',
        solicitado_por: 'Cajero',
        monto_cierre_calculado: 160000,
        saldo_clientes_descontado: 12000
      })
    );
    expect(resultado.monto_cierre_calculado).toBe(160000);
    expect(resultado.saldo_clientes_descontado).toBe(12000);
    // La caja sigue abierta: sólo queda marcado cuándo se pidió el cierre.
    expect(repositoryHarness.queryMock).toHaveBeenCalledWith(
      'UPDATE cajas SET cierre_solicitado_en = ? WHERE id_caja = ?',
      [expect.any(String), 'caja-1']
    );
    expect(BaseRepository.update).not.toHaveBeenCalled();
  });

  it('rechaza pedir el cierre si ya hay una solicitud esperando autorización', async () => {
    simular({ pendiente: [{ id: 'sol-1', caja_id: 'caja-1', token: 'token-1' }], saldos: 12000 });

    await expect(
      CashRegisterRepository.solicitarCierre('caja-1', { nombre: 'Cajero' })
    ).rejects.toThrow(
      new ConflictError('Ya hay una solicitud de cierre de esta caja esperando autorización')
    );
    expect(BaseRepository.insert).not.toHaveBeenCalled();
  });
});

describe('CashRegisterRepository.procesarSolicitudCierre', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (BaseRepository.findOne as any).mockResolvedValue(cajaConMovimiento);
  });

  const simularSolicitudPendiente = (saldoPendiente = 12000) => {
    repositoryHarness.queryMock.mockImplementation(async (sql: any) => {
      const texto = String(sql);
      if (texto.includes('FOR UPDATE')) return [{ id: 'sol-1', caja_id: 'caja-1' }];
      if (texto.includes('SUM(saldo)')) return [{ saldo_pendiente: saldoPendiente }];
      if (texto.includes('FROM cajas')) return [cajaConMovimiento];
      return [];
    });
  };

  it('al autorizar cierra la caja descontando los saldos de clientes del efectivo', async () => {
    simularSolicitudPendiente(12000);

    const resultado = await CashRegisterRepository.procesarSolicitudCierre('token-1', 'confirmar', {
      nombre: 'Admin'
    });

    expect(resultado.estado).toBe('aprobada');
    expect(resultado.saldo_clientes_descontado).toBe(12000);
    expect(BaseRepository.update).toHaveBeenCalledWith(
      repositoryHarness.queryMock,
      'cajas',
      'id_caja',
      'caja-1',
      expect.objectContaining({
        estado: 0,
        monto_cierre: 160000,
        saldo_clientes_descontado: 12000,
        cierre_solicitado_en: null
      })
    );
    // La solicitud queda resuelta a nombre de quien autorizó.
    expect(repositoryHarness.queryMock).toHaveBeenCalledWith(
      expect.stringContaining("estado = 'aprobada'"),
      ['2026-04-11 12:00:00', 'Admin', 12000, 160000, 'sol-1']
    );
  });

  it('al rechazar deja la caja abierta y limpia el aviso de cierre pendiente', async () => {
    repositoryHarness.queryMock.mockImplementation(async (sql: any) => {
      const texto = String(sql);
      if (texto.includes('FOR UPDATE')) return [{ id: 'sol-1', caja_id: 'caja-1' }];
      return [];
    });

    const resultado = await CashRegisterRepository.procesarSolicitudCierre('token-1', 'rechazar', {
      nombre: 'Admin'
    });

    expect(resultado.estado).toBe('rechazada');
    expect(resultado.saldo_clientes_descontado).toBe(0);
    // `close()` nunca corre: la caja sigue como estaba.
    expect(BaseRepository.update).not.toHaveBeenCalled();
    expect(repositoryHarness.queryMock).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE cajas SET cierre_solicitado_en = NULL'),
      ['caja-1']
    );
  });

  it('no cierra dos veces: con el token ya usado no toca la caja', async () => {
    repositoryHarness.queryMock.mockImplementation(async () => []);

    await expect(
      CashRegisterRepository.procesarSolicitudCierre('token-usado', 'confirmar', {
        nombre: 'Admin'
      })
    ).rejects.toThrow();
    expect(BaseRepository.update).not.toHaveBeenCalled();
  });
});

describe('CashRegisterRepository.summary', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('el resumen trae el total de retiros real, no un 0 inventado', async () => {
    // `summary` lee `SELECT c.*, (subselect retiros) as retiro_total`: si la fila que
    // devuelve ya trae `retiro_total`, el mapeo no tiene que inventarse un 0.
    repositoryHarness.queryMock.mockImplementation(async (sql: any) => {
      const texto = String(sql);
      if (texto.includes('FROM ventas')) return [{ cantidad: 2, promedio: 5000 }];
      if (texto.includes('FROM servicios')) return [{ cantidad: 1, promedio: 4000 }];
      if (texto.includes('retiros_caja')) {
        // El SQL de summary trae el subselect: la fila llega con los retiros sumados.
        expect(texto).toContain('FROM retiros_caja');
        return [{ retiro_total: 15000 }];
      }
      if (texto.includes('FROM cajas')) {
        return [
          {
            ...cajaConMovimiento,
            // Sin el subselect, el mapeo caería en `Number(row.retiro_total ?? 0)`.
            retiro_total: 15000
          }
        ];
      }
      if (texto.includes('prepago')) return { prepago_pendiente_clientes: 0 };
      return [];
    });

    const resumen = await CashRegisterRepository.summary();

    expect(resumen.retiro_total).toBe(15000);
  });
});
