import { describe, expect, it } from 'vitest';
import {
  calcularConsumoPrepago,
  prepararRecargaPrepago,
  prepararDevolucionSaldo
} from '@/modules/clientes/prepago/reglas';
import { calcularDeltasPagoSimple } from '@/lib/business/pagosMixtos';

describe('compatibilidad de reglas de prepago', () => {
  it.each([
    [0, 100, 200, null],
    [-1, 100, null, null],
    [100, 100, 0, null],
    [100, 200, null, 100],
    [200, 100, null, 100],
    [100, 0, null, 0],
    [100, 10, 50, 50]
  ])('saldo %s, total %s, solicitado %s', (saldo, total, solicitado, esperado) => {
    expect(calcularConsumoPrepago(saldo!, total!, solicitado)).toBe(esperado);
  });
  it('rechaza un monto solicitado superior al saldo positivo', () => {
    expect(() => calcularConsumoPrepago(10, 100, 20)).toThrow('Saldo insuficiente');
  });
  it('conserva efectivo por defecto y metadatos ausentes', () => {
    expect(prepararRecargaPrepago({ cliente_id: 'c', monto: 100 })).toEqual({
      metodoPago: 'efectivo',
      metadatos: null,
      deltas: { efectivo: 100, tarjeta: 0, transferencia: 0, prepago: 0 }
    });
  });
  it('conserva pagos mixtos en metadatos sin sumar prepago a caja', () => {
    const pagos = [
      { metodo: 'tarjeta', monto: 60 },
      { metodo: 'prepago', monto: 40 }
    ];
    const resultado = prepararRecargaPrepago({
      cliente_id: 'c',
      monto: 100,
      metodo_pago: 'mixto',
      pagos_mixtos: pagos,
      metadatos: { origen: 'test' }
    });
    expect(JSON.parse(resultado.metadatos!)).toEqual({ origen: 'test', pagos_mixtos: pagos });
    expect(resultado.deltas).toEqual({ efectivo: 0, tarjeta: 60, transferencia: 0, prepago: 0 });
  });
  it('mantiene la tolerancia de una unidad en pagos mixtos', () => {
    const entrada = {
      cliente_id: 'c',
      monto: 100,
      metodo_pago: 'mixto',
      pagos_mixtos: [
        { metodo: 'efectivo', monto: 50 },
        { metodo: 'tarjeta', monto: 51 }
      ]
    };
    expect(() => prepararRecargaPrepago(entrada)).not.toThrow();
    expect(() => prepararRecargaPrepago({ ...entrada, monto: 99 })).toThrow('igual al total');
  });
  it.each(['prepago', 'desconocido', 'EFECTIVO', undefined])(
    'no normaliza el metodo simple %s',
    metodo => {
      expect(calcularDeltasPagoSimple(metodo, 100)).toEqual({
        efectivo: 0,
        tarjeta: 0,
        transferencia: 0
      });
    }
  );
  it.each(['efectivo', 'tarjeta', 'transferencia'])(
    'distribuye %s conservando el monto',
    metodo => {
      expect(calcularDeltasPagoSimple(metodo, 12.5)).toEqual({
        efectivo: 0,
        tarjeta: 0,
        transferencia: 0,
        [metodo]: 12.5
      });
    }
  );
});

describe('preparacion de devoluciones', () => {
  it.each([undefined, ''])('conserva el motivo por defecto para %s', motivo => {
    expect(prepararDevolucionSaldo({ cliente_id: 'c', monto: 10.5, motivo })).toEqual({
      monto: 10.5,
      motivo: 'Devolucion de saldo'
    });
  });
  it('recorta espacios sin sustituir el motivo que queda vacio', () => {
    expect(prepararDevolucionSaldo({ cliente_id: 'c', monto: 10, motivo: '   ' }).motivo).toBe('');
  });
});
