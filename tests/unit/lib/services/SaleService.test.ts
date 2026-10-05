import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BusinessError, ValidationError } from '@/lib/errors/errors';

vi.mock('@/lib/database/db', () => ({
  generateUUID: () => 'mock-uuid',
  withTransaction: vi.fn(async (fn: any) => fn(vi.fn())),
  query: vi.fn()
}));

vi.mock('@/lib/repositories/SaleRepository', () => ({
  SaleRepository: { rawInsert: vi.fn(), insertDetail: vi.fn(), insertUserRelation: vi.fn() }
}));

vi.mock('@/modules/inventario', () => ({
  consumirStockBar: vi.fn().mockResolvedValue([])
}));

vi.mock('@/lib/business/shotAlerts', () => ({
  notifyBarShotAlerts: vi.fn().mockResolvedValue(undefined)
}));

vi.mock('@/lib/repositories/CashRegisterRepository', () => ({
  CashRegisterRepository: { getCurrentCajaId: vi.fn(), updateBalances: vi.fn() }
}));

vi.mock('@/lib/repositories/ClientRepository', () => ({
  ClientRepository: {}
}));

vi.mock('@/lib/repositories/CommissionRepository', () => ({
  CommissionRepository: { createWithDetail: vi.fn() }
}));

vi.mock('@/lib/repositories/AuditRepository', () => ({
  AuditRepository: { log: vi.fn() }
}));

vi.mock('@/lib/repositories/TipRepository', () => ({
  TipRepository: { register: vi.fn() }
}));

vi.mock('@/lib/services/RoomManager', () => ({
  RoomManager: {
    pauseConflictingServices: vi.fn(),
    updateHostessServiceStatus: vi.fn()
  }
}));

vi.mock('@/lib/api/sseService', () => ({
  sendNotificationToAll: vi.fn()
}));

const mockLogger = vi.hoisted(() => ({
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn()
}));
vi.mock('@/lib/utils/logger', () => ({
  logger: mockLogger,
  default: mockLogger
}));

vi.mock('@/lib/business/timezoneService', () => ({
  getNowInBusinessTimezone: () => '2026-04-10 10:00:00',
  getSystemTimezone: () => 'America/Santiago'
}));

import {
  parsePagosMixtos,
  validatePagosMixtos,
  calcularDeltasCaja
} from '@/lib/business/pagosMixtos';

describe('SaleService — lógica de pagos mixtos', () => {
  describe('parsePagosMixtos', () => {
    it('filtra pagos con monto 0', () => {
      const result = parsePagosMixtos([
        { metodo: 'efectivo', monto: 0 },
        { metodo: 'tarjeta', monto: 5000 }
      ]);
      expect(result).toHaveLength(1);
      expect(result[0].metodo).toBe('tarjeta');
    });

    it('retorna vacío para input no array', () => {
      expect(parsePagosMixtos(null)).toEqual([]);
      expect(parsePagosMixtos('string')).toEqual([]);
    });
  });

  describe('validatePagosMixtos', () => {
    it('lanza ValidationError con menos de 2 métodos', () => {
      expect(() => validatePagosMixtos([{ metodo: 'efectivo', monto: 5000 }], 5000)).toThrow(
        ValidationError
      );
    });

    it('lanza ValidationError si la suma no coincide', () => {
      expect(() =>
        validatePagosMixtos(
          [
            { metodo: 'efectivo', monto: 3000 },
            { metodo: 'tarjeta', monto: 1000 }
          ],
          5000
        )
      ).toThrow(ValidationError);
    });

    it('no lanza si la suma es correcta', () => {
      expect(() =>
        validatePagosMixtos(
          [
            { metodo: 'efectivo', monto: 3000 },
            { metodo: 'tarjeta', monto: 2000 }
          ],
          5000
        )
      ).not.toThrow();
    });
  });

  describe('calcularDeltasCaja', () => {
    it('suma correctamente por método', () => {
      const result = calcularDeltasCaja([
        { metodo: 'efectivo', monto: 3000 },
        { metodo: 'tarjeta', monto: 1500 },
        { metodo: 'transferencia', monto: 500 }
      ]);
      expect(result).toEqual({ efectivo: 3000, tarjeta: 1500, transferencia: 500 });
    });

    it('ignora métodos desconocidos como prepago', () => {
      const result = calcularDeltasCaja([
        { metodo: 'prepago', monto: 2000 },
        { metodo: 'efectivo', monto: 1000 }
      ]);
      expect(result.efectivo).toBe(1000);
      expect(result.tarjeta).toBe(0);
    });
  });
});

import { SaleService } from '@/lib/services/SaleService';
import { CashRegisterRepository } from '@/lib/repositories/CashRegisterRepository';
import { SaleRepository } from '@/lib/repositories/SaleRepository';
import { consumirStockBar } from '@/modules/inventario';
import { notifyBarShotAlerts } from '@/lib/business/shotAlerts';
import { TipRepository } from '@/lib/repositories/TipRepository';
import { withTransaction } from '@/lib/database/db';
import { sendNotificationToAll } from '@/lib/api/sseService';

beforeEach(() => {
  vi.clearAllMocks();
});

const validSaleBody = {
  total: 15000,
  sub_total: 15000,
  metodo_pago: 'efectivo' as const,
  detalles: [{ producto_id: 'prod-1', precio: 15000, cantidad: 1, comision: 0 }],
  usuarios: []
};

describe('SaleService.createSale', () => {
  it('lanza ZodError si faltan campos requeridos (total)', async () => {
    await expect(SaleService.createSale({ detalles: [] } as any, 'user-1')).rejects.toThrow();
  });

  it('lanza ZodError si detalles está vacío', async () => {
    await expect(
      SaleService.createSale({ ...validSaleBody, detalles: [] }, 'user-1')
    ).rejects.toThrow();
  });

  it('lanza BusinessError si anfitrionas no están logueadas', async () => {
    vi.mocked(CashRegisterRepository.getCurrentCajaId).mockResolvedValue('caja-1');

    vi.mocked(withTransaction).mockImplementationOnce(async (fn: any) => {
      const trx = vi.fn().mockResolvedValueOnce([]).mockResolvedValue([]);
      return fn(trx);
    });

    await expect(
      SaleService.createSale({ ...validSaleBody, usuarios: ['hostess-1'] }, 'user-1')
    ).rejects.toThrow(BusinessError);
  });

  it('lanza ValidationError si pago mixto tiene menos de 2 métodos', async () => {
    vi.mocked(CashRegisterRepository.getCurrentCajaId).mockResolvedValue('caja-1');

    vi.mocked(withTransaction).mockImplementationOnce(async (fn: any) => {
      const trx = vi.fn().mockResolvedValue([]);
      return fn(trx);
    });

    await expect(
      SaleService.createSale(
        {
          ...validSaleBody,
          metodo_pago: 'mixto' as any,
          pagos_mixtos: [{ metodo: 'efectivo', monto: 15000 }]
        },
        'user-1'
      )
    ).rejects.toThrow(ValidationError);
  });

  it('lanza ValidationError si suma de pagos mixtos no coincide con total', async () => {
    vi.mocked(CashRegisterRepository.getCurrentCajaId).mockResolvedValue('caja-1');

    vi.mocked(withTransaction).mockImplementationOnce(async (fn: any) => {
      const trx = vi.fn().mockResolvedValue([]);
      return fn(trx);
    });

    await expect(
      SaleService.createSale(
        {
          ...validSaleBody,
          total: 15000,
          metodo_pago: 'mixto' as any,
          pagos_mixtos: [
            { metodo: 'efectivo', monto: 5000 },
            { metodo: 'tarjeta', monto: 5000 }
          ]
        },
        'user-1'
      )
    ).rejects.toThrow(ValidationError);
  });

  it('no vuelve a impactar caja cuando la venta viene de una cuenta', async () => {
    vi.mocked(CashRegisterRepository.getCurrentCajaId).mockResolvedValue('caja-1');

    vi.mocked(withTransaction).mockImplementationOnce(async (fn: any) => {
      const trx = vi.fn().mockResolvedValue([]);
      return fn(trx);
    });

    await SaleService.createSale(
      {
        ...validSaleBody,
        origen: 'cuenta',
        skip_client_prepago: true
      },
      'user-1'
    );

    expect(SaleRepository.rawInsert).toHaveBeenCalled();
    expect(CashRegisterRepository.updateBalances).not.toHaveBeenCalled();
  });

  it('emite updateSales por SSE al crear la venta (refetch en las apps)', async () => {
    vi.mocked(CashRegisterRepository.getCurrentCajaId).mockResolvedValue('caja-1');

    vi.mocked(withTransaction).mockImplementationOnce(async (fn: any) => {
      const trx = vi.fn().mockResolvedValue([]);
      return fn(trx);
    });

    await SaleService.createSale(
      { ...validSaleBody, origen: 'cuenta', skip_client_prepago: true },
      'user-1'
    );

    // Antes solo lo emitía el cron de timers: las apps no veían ventas nuevas
    // hasta un refetch manual. Payload informativo, misma forma que el cron.
    expect(sendNotificationToAll).toHaveBeenCalledWith('updateSales', {
      id: 'mock-uuid',
      type: 'venta'
    });
  });

  it('guarda la venta con propina, separa los balances de caja y registra la propina para distribucion', async () => {
    vi.mocked(CashRegisterRepository.getCurrentCajaId).mockResolvedValue('caja-1');

    await SaleService.createSale(
      {
        ...validSaleBody,
        total: 11000,
        sub_total: 10000,
        propina: 1000,
        codigo: 'V-100'
      },
      'user-1'
    );

    // Se inserta la venta con propina y total desglosado
    expect(SaleRepository.rawInsert).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        id_venta: 'mock-uuid',
        codigo: 'V-100',
        propina: 1000,
        sub_total: 10000,
        total: 11000,
        caja_id: 'caja-1',
        created_by: 'user-1'
      })
    );

    // En caja: venta sin propina + propina por separado
    expect(CashRegisterRepository.updateBalances).toHaveBeenCalledWith(
      expect.anything(),
      'caja-1',
      {
        venta: 10000,
        propina: 1000,
        efectivo: 11000,
        tarjeta: 0,
        transferencia: 0,
        prepago: 0,
        comision: 0
      }
    );

    // La propina se registra con la venta y el monto (el reparto lo hace TipRepository)
    expect(TipRepository.register).toHaveBeenCalledWith({
      venta_id: 'mock-uuid',
      monto: 1000
    });
  });

  it('con pago en tarjeta la caja registra venta sin propina y tarjeta = total pagado', async () => {
    vi.mocked(CashRegisterRepository.getCurrentCajaId).mockResolvedValue('caja-1');

    await SaleService.createSale(
      {
        ...validSaleBody,
        total: 11000,
        sub_total: 10000,
        propina: 1000,
        metodo_pago: 'tarjeta',
        codigo: 'V-101'
      },
      'user-1'
    );

    // En caja: venta = total - propina = 10000 (sin cargo extra) y
    // tarjeta = total pagado. No hay bucket de cargo por tarjeta.
    expect(CashRegisterRepository.updateBalances).toHaveBeenCalledWith(
      expect.anything(),
      'caja-1',
      {
        venta: 10000,
        propina: 1000,
        efectivo: 0,
        tarjeta: 11000,
        transferencia: 0,
        prepago: 0,
        comision: 0
      }
    );

    // El reparto sigue siendo solo la propina de venta
    expect(TipRepository.register).toHaveBeenCalledWith({
      venta_id: 'mock-uuid',
      monto: 1000
    });
  });

  it('no registra propina cuando la venta no trae propina', async () => {
    vi.mocked(CashRegisterRepository.getCurrentCajaId).mockResolvedValue('caja-1');

    await SaleService.createSale(
      { ...validSaleBody, total: 15000, sub_total: 15000, propina: 0 },
      'user-1'
    );

    expect(TipRepository.register).not.toHaveBeenCalled();
  });

  it('no falla la venta si el registro de la propina da error (try/catch)', async () => {
    vi.mocked(CashRegisterRepository.getCurrentCajaId).mockResolvedValue('caja-1');
    vi.mocked(TipRepository.register).mockRejectedValueOnce(new Error('DB caida'));

    const result = await SaleService.createSale(
      {
        ...validSaleBody,
        total: 11000,
        sub_total: 10000,
        propina: 1000
      },
      'user-1'
    );

    expect(TipRepository.register).toHaveBeenCalledWith({
      venta_id: 'mock-uuid',
      monto: 1000
    });
    expect(result).toEqual(expect.objectContaining({ total: 11000, estado: 1 }));
  });
});

describe('SaleService.createSale — inventario del bar', () => {
  const detallesBar = [
    { producto_id: 'prod-1', presentacion_id: 'pres-1', precio: 15000, cantidad: 2, comision: 0 }
  ];

  it('pasa los detalles a consume, que descuenta las botellas del bar', async () => {
    vi.mocked(CashRegisterRepository.getCurrentCajaId).mockResolvedValue('caja-1');

    await SaleService.createSale({ ...validSaleBody, detalles: detallesBar }, 'user-1');

    expect(consumirStockBar).toHaveBeenCalledWith(
      [expect.objectContaining({ presentacion_id: 'pres-1', cantidad: 2 })],
      // La venta que se está creando: sin ella el consumo no queda ligado a
      // nada y la anulación no puede devolver las botellas (migración 058).
      { usuarioId: 'user-1', fecha: expect.any(String), ventaId: 'mock-uuid' },
      { id: expect.any(String) }
    );
  });

  it('avisa al barman recién cuando la venta confirma y consume devuelve alertas', async () => {
    vi.mocked(CashRegisterRepository.getCurrentCajaId).mockResolvedValue('caja-1');
    const alertas = [
      { presentacion_id: 'pres-1', nombre: 'Whisky 750 ml', ml_restante: 60, shots_restantes: 1 }
    ];
    vi.mocked(consumirStockBar).mockResolvedValueOnce(alertas);

    await SaleService.createSale({ ...validSaleBody, detalles: detallesBar }, 'user-1');

    expect(notifyBarShotAlerts).toHaveBeenCalledWith(alertas);
  });

  it('sin alertas de shots no dispara el aviso al barman', async () => {
    vi.mocked(CashRegisterRepository.getCurrentCajaId).mockResolvedValue('caja-1');
    vi.mocked(consumirStockBar).mockResolvedValueOnce([]);

    await SaleService.createSale({ ...validSaleBody, detalles: detallesBar }, 'user-1');

    expect(notifyBarShotAlerts).toHaveBeenCalledWith([]);
  });

  it('conserva el tipo_venta shot en los detalles que descuenta el inventario', async () => {
    vi.mocked(CashRegisterRepository.getCurrentCajaId).mockResolvedValue('caja-1');

    await SaleService.createSale(
      {
        ...validSaleBody,
        detalles: [
          {
            producto_id: 'prod-1',
            presentacion_id: 'pres-1',
            precio: 3000,
            cantidad: 2,
            comision: 0,
            tipo_venta: 'shot' as const
          }
        ]
      },
      'user-1'
    );

    expect(consumirStockBar).toHaveBeenCalledWith(
      [expect.objectContaining({ presentacion_id: 'pres-1', cantidad: 2, tipo_venta: 'shot' })],
      { usuarioId: 'user-1', fecha: expect.any(String), ventaId: expect.any(String) },
      { id: expect.any(String) }
    );
  });

  it('guarda en detalle_ventas si fue shot y si se cobró a una anfitriona', async () => {
    vi.mocked(CashRegisterRepository.getCurrentCajaId).mockResolvedValue('caja-1');
    const trx = vi.fn().mockResolvedValue([]);
    vi.mocked(withTransaction).mockImplementationOnce(async (fn: any) => fn(trx));

    await SaleService.createSale(
      {
        ...validSaleBody,
        detalles: [
          {
            producto_id: 'prod-1',
            presentacion_id: 'pres-1',
            precio: 3000,
            cantidad: 2,
            comision: 0,
            tipo_venta: 'shot' as const,
            shot_anfitriona: true
          },
          {
            producto_id: 'prod-2',
            presentacion_id: 'pres-2',
            precio: 180000,
            cantidad: 1,
            comision: 0
          }
        ]
      },
      'user-1'
    );

    const insert = trx.mock.calls.find(([sql]) =>
      String(sql).includes('INSERT INTO detalle_ventas')
    );
    expect(insert).toBeTruthy();
    const [sql, values] = insert as [string, unknown[]];
    const columnas = String(sql)
      .slice(String(sql).indexOf('(') + 1, String(sql).indexOf(')'))
      .split(',')
      .map(columna => columna.trim());
    const fila = (indice: number) =>
      Object.fromEntries(
        columnas.map((columna, i) => [columna, values[indice * columnas.length + i]])
      );

    // El shot a anfitriona se guarda como shot + bandera; el precio queda en `precio`
    // (por eso el reporte puede sumar los dos precios por separado).
    expect(fila(0)).toMatchObject({ tipo_venta: 'shot', shot_anfitriona: true, cantidad: 2 });
    // Lo que no se marca es botella, igual que el default de la migración 039.
    expect(fila(1)).toMatchObject({ tipo_venta: 'botella', shot_anfitriona: false, cantidad: 1 });
  });

  it('aplica el mismo descuento al cobro de cuenta (origen cuenta)', async () => {
    vi.mocked(CashRegisterRepository.getCurrentCajaId).mockResolvedValue('caja-1');

    await SaleService.createSale(
      {
        ...validSaleBody,
        detalles: detallesBar,
        origen: 'cuenta',
        skip_client_prepago: true
      },
      'user-1'
    );

    expect(consumirStockBar).toHaveBeenCalledWith(
      expect.any(Array),
      { usuarioId: 'user-1', fecha: expect.any(String), ventaId: expect.any(String) },
      { id: expect.any(String) }
    );
  });

  it('propaga el rechazo cuando no alcanzan las botellas: la venta entera se revierte', async () => {
    vi.mocked(CashRegisterRepository.getCurrentCajaId).mockResolvedValue('caja-1');
    vi.mocked(consumirStockBar).mockRejectedValueOnce(
      new BusinessError('Quedan 1 de 2 botellas', 'INSUFFICIENT_BAR_STOCK')
    );

    await expect(
      SaleService.createSale({ ...validSaleBody, detalles: detallesBar }, 'user-1')
    ).rejects.toMatchObject({ code: 'INSUFFICIENT_BAR_STOCK' });

    expect(CashRegisterRepository.updateBalances).not.toHaveBeenCalled();
  });
});
