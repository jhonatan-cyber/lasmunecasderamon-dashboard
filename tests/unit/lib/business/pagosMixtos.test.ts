import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  parsePagosMixtos,
  validatePagosMixtos,
  calcularDeltasCaja,
  procesarPrepago,
  type MixedPayment
} from '@/lib/business/pagosMixtos';
import { ValidationError, BusinessError } from '@/lib/errors/errors';

vi.mock('@/lib/database/db', () => ({
  generateUUID: () => 'mock-uuid-1234'
}));

describe('parsePagosMixtos', () => {
  it('retorna array vacío si el input no es array', () => {
    expect(parsePagosMixtos(null)).toEqual([]);
    expect(parsePagosMixtos(undefined)).toEqual([]);
    expect(parsePagosMixtos('string')).toEqual([]);
    expect(parsePagosMixtos(42)).toEqual([]);
  });

  it('filtra entradas con metodo vacío o monto 0', () => {
    const raw = [
      { metodo: '', monto: 1000 },
      { metodo: 'efectivo', monto: 0 },
      { metodo: null, monto: 500 }
    ];
    expect(parsePagosMixtos(raw)).toEqual([]);
  });

  it('normaliza y retorna pagos válidos', () => {
    const raw = [
      { metodo: 'efectivo', monto: 5000 },
      { metodo: 'tarjeta', monto: 3000 }
    ];
    expect(parsePagosMixtos(raw)).toEqual([
      { metodo: 'efectivo', monto: 5000 },
      { metodo: 'tarjeta', monto: 3000 }
    ]);
  });

  it('convierte strings numéricos a número', () => {
    const raw = [{ metodo: 'efectivo', monto: '2500' }];
    const result = parsePagosMixtos(raw);
    expect(result[0].monto).toBe(2500);
    expect(typeof result[0].monto).toBe('number');
  });

  it('ignora propiedades extra', () => {
    const raw = [{ metodo: 'transferencia', monto: 1000, extra: 'ignorado' }];
    const result = parsePagosMixtos(raw);
    expect(result[0]).toEqual({ metodo: 'transferencia', monto: 1000 });
  });
});

describe('validatePagosMixtos', () => {
  it('lanza ValidationError si hay menos de 2 métodos', () => {
    const pagos: MixedPayment[] = [{ metodo: 'efectivo', monto: 5000 }];
    expect(() => validatePagosMixtos(pagos, 5000)).toThrow(ValidationError);
    expect(() => validatePagosMixtos(pagos, 5000)).toThrow('al menos 2 metodos');
  });

  it('lanza ValidationError si la suma no coincide con el total (diferencia > 1)', () => {
    const pagos: MixedPayment[] = [
      { metodo: 'efectivo', monto: 3000 },
      { metodo: 'tarjeta', monto: 1000 }
    ];
    expect(() => validatePagosMixtos(pagos, 5000)).toThrow(ValidationError);
    expect(() => validatePagosMixtos(pagos, 5000)).toThrow('igual al total');
  });

  it('no lanza si la suma coincide exactamente', () => {
    const pagos: MixedPayment[] = [
      { metodo: 'efectivo', monto: 3000 },
      { metodo: 'tarjeta', monto: 2000 }
    ];
    expect(() => validatePagosMixtos(pagos, 5000)).not.toThrow();
  });

  it('no lanza si la diferencia es <= 1 (tolerancia de redondeo)', () => {
    const pagos: MixedPayment[] = [
      { metodo: 'efectivo', monto: 3000 },
      { metodo: 'tarjeta', monto: 2001 }
    ];
    expect(() => validatePagosMixtos(pagos, 5001)).not.toThrow();
  });

  it('acepta 3 o más métodos de pago', () => {
    const pagos: MixedPayment[] = [
      { metodo: 'efectivo', monto: 2000 },
      { metodo: 'tarjeta', monto: 2000 },
      { metodo: 'transferencia', monto: 1000 }
    ];
    expect(() => validatePagosMixtos(pagos, 5000)).not.toThrow();
  });
});

describe('calcularDeltasCaja', () => {
  it('suma correctamente por método', () => {
    const pagos: MixedPayment[] = [
      { metodo: 'efectivo', monto: 3000 },
      { metodo: 'tarjeta', monto: 1500 },
      { metodo: 'transferencia', monto: 500 }
    ];
    expect(calcularDeltasCaja(pagos)).toEqual({
      efectivo: 3000,
      tarjeta: 1500,
      transferencia: 500
    });
  });

  it('acumula múltiples pagos del mismo método', () => {
    const pagos: MixedPayment[] = [
      { metodo: 'efectivo', monto: 1000 },
      { metodo: 'efectivo', monto: 2000 },
      { metodo: 'tarjeta', monto: 500 }
    ];
    expect(calcularDeltasCaja(pagos)).toEqual({
      efectivo: 3000,
      tarjeta: 500,
      transferencia: 0
    });
  });

  it('ignora métodos desconocidos (prepago, etc.)', () => {
    const pagos: MixedPayment[] = [
      { metodo: 'prepago', monto: 2000 },
      { metodo: 'efectivo', monto: 1000 }
    ];
    expect(calcularDeltasCaja(pagos)).toEqual({
      efectivo: 1000,
      tarjeta: 0,
      transferencia: 0
    });
  });

  it('retorna ceros si no hay pagos', () => {
    expect(calcularDeltasCaja([])).toEqual({
      efectivo: 0,
      tarjeta: 0,
      transferencia: 0
    });
  });
});

describe('procesarPrepago', () => {
  const baseParams = {
    clienteId: 'cliente-1',
    total: 5000,
    prepagoSolicitado: null as number | null,
    ventaId: 'venta-1',
    createdBy: 'user-1',
    now: '2026-04-09 10:00:00',
    codigo: 'VNT-001',
    concepto: 'Pago venta VNT-001'
  };

  it('retorna 0 si el saldo disponible es 0', async () => {
    const trx = vi.fn().mockResolvedValueOnce([{ saldo: 0 }]);
    const result = await procesarPrepago(trx as any, baseParams);
    expect(result).toBe(0);
    expect(trx).toHaveBeenCalledTimes(1);
  });

  it('retorna 0 si prepagoSolicitado es 0', async () => {
    const trx = vi.fn().mockResolvedValueOnce([{ saldo: 5000 }]);
    const result = await procesarPrepago(trx as any, { ...baseParams, prepagoSolicitado: 0 });
    expect(result).toBe(0);
  });

  it('descuenta el saldo completo si prepagoSolicitado es null y saldo < total', async () => {
    const trx = vi
      .fn()
      .mockResolvedValueOnce([{ saldo: 2000 }])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);

    const result = await procesarPrepago(trx as any, {
      ...baseParams,
      total: 5000,
      prepagoSolicitado: null
    });
    expect(result).toBe(2000);
  });

  it('descuenta el total si prepagoSolicitado es null y saldo >= total', async () => {
    const trx = vi
      .fn()
      .mockResolvedValueOnce([{ saldo: 10000 }])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);

    const result = await procesarPrepago(trx as any, {
      ...baseParams,
      total: 5000,
      prepagoSolicitado: null
    });
    expect(result).toBe(5000);
  });

  it('descuenta el monto exacto si prepagoSolicitado está definido', async () => {
    const trx = vi
      .fn()
      .mockResolvedValueOnce([{ saldo: 10000 }])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);

    const result = await procesarPrepago(trx as any, { ...baseParams, prepagoSolicitado: 3000 });
    expect(result).toBe(3000);
  });

  it('lanza BusinessError si prepagoSolicitado > saldo disponible', async () => {
    const trx = vi
      .fn()
      .mockResolvedValueOnce([{ saldo: 1000 }])
      .mockResolvedValueOnce([{ saldo: 1000 }]);

    await expect(
      procesarPrepago(trx as any, { ...baseParams, prepagoSolicitado: 5000 })
    ).rejects.toThrow(BusinessError);

    const trx2 = vi.fn().mockResolvedValueOnce([{ saldo: 1000 }]);
    await expect(
      procesarPrepago(trx2 as any, { ...baseParams, prepagoSolicitado: 5000 })
    ).rejects.toThrow('Saldo insuficiente');
  });

  it('ejecuta UPDATE e INSERT cuando hay prepago', async () => {
    const trx = vi
      .fn()
      .mockResolvedValueOnce([{ saldo: 5000 }])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);

    await procesarPrepago(trx as any, { ...baseParams, prepagoSolicitado: 2000 });

    expect(trx).toHaveBeenCalledTimes(3);
    expect(trx.mock.calls[1][0]).toContain('UPDATE clientes');
    expect(trx.mock.calls[2][0]).toContain('INSERT INTO clientes_prepago_movimientos');
  });
});
