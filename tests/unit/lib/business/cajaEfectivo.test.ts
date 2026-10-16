import { describe, expect, it } from 'vitest';
import {
  devolucionesDe,
  disponibleParaRetiro,
  efectivoBaseCaja,
  efectivoNetoCaja,
  egresosPendientesCaja,
  calcularDevolucionSaldoClientes,
  montoCierreCaja,
  saldosClientesDe,
  totalCaja
} from '@/lib/business/cajaEfectivo';

/**
 * `cajas.efectivo` ya viene neto de retiros y anticipos (`WithdrawalService.addRetiro`
 * y `grantAnticipo` lo restan al registrarlos). Esta función es la única fuente de
 * verdad del cajón: la comparten la tarjeta de la lista (`CajaCard`), el detalle del
 * turno, el diálogo de retiro y `CashRegisterRepository.calcularMontoCierre`.
 */
const cajaBase = {
  monto_apertura: 100000,
  efectivo: 485000,
  tarjeta: 320000,
  transferencia: 145000,
  devoluciones: 25000,
  anticipo: 60000,
  saldo_clientes_descontado: 0
};

describe('cajaEfectivo · efectivo neto', () => {
  it('no vuelve a descontar retiros ni anticipos', () => {
    // 100.000 + 485.000: los egresos ya están aplicados.
    expect(efectivoNetoCaja(cajaBase)).toBe(585000);
    expect(egresosPendientesCaja(cajaBase)).toBe(0);
    // 585.000 + 320.000 + 145.000
    expect(totalCaja(cajaBase)).toBe(1050000);
  });

  it('descuenta los saldos prepago una sola vez', () => {
    const conSaldos = { ...cajaBase, saldo_clientes_descontado: 550000 };

    expect(saldosClientesDe(conSaldos)).toBe(550000);
    expect(egresosPendientesCaja(conSaldos)).toBe(550000); // Solo el saldo de clientes
    expect(efectivoNetoCaja(conSaldos)).toBe(35000); // 585.000 − 550.000
  });

  it('lee las devoluciones como `devoluciones` (dominio) y como `devolucion` (fila cruda)', () => {
    expect(devolucionesDe({ monto_apertura: 1000, devoluciones: 200 })).toBe(200);
    expect(devolucionesDe({ monto_apertura: 1000, devolucion: 200 })).toBe(200);
    expect(devolucionesDe(null)).toBe(0);
  });

  it('tolera caja sin datos sin inventar números', () => {
    expect(efectivoBaseCaja(null)).toBe(0);
    expect(totalCaja(null)).toBe(0);
  });
});

describe('cajaEfectivo · disponibleParaRetiro', () => {
  it('no descuenta los saldos prepago: no son plata de este cajón', () => {
    const conSaldos = { ...cajaBase, saldo_clientes_descontado: 550000 };

    // Mismo disponible con y sin saldos: el retiro no puede tocarlos.
    expect(disponibleParaRetiro(conSaldos)).toBe(disponibleParaRetiro(cajaBase));
    // 100.000 + 485.000
    expect(disponibleParaRetiro(cajaBase)).toBe(585000);
  });

  it('no vuelve a descontar las devoluciones aplicadas', () => {
    expect(disponibleParaRetiro({ ...cajaBase, devoluciones: 0 })).toBe(585000);
  });
});

describe('cajaEfectivo · montoCierreCaja', () => {
  it('es el total de la caja con los saldos leídos de clientes', () => {
    // 1.050.000 − 300.000 de saldos pendientes
    expect(montoCierreCaja(cajaBase, 300000)).toBe(750000);
  });

  it('coincide con totalCaja cuando los saldos ya vienen en la fila', () => {
    const conSaldos = { ...cajaBase, saldo_clientes_descontado: 300000 };

    expect(montoCierreCaja(conSaldos, 300000)).toBe(totalCaja(conSaldos));
  });

  it('los saldos pasados por parámetro mandan sobre los de la fila', () => {
    const conSaldos = { ...cajaBase, saldo_clientes_descontado: 300000 };

    expect(montoCierreCaja(conSaldos, 0)).toBe(
      totalCaja({ ...cajaBase, saldo_clientes_descontado: 0 })
    );
  });

  it('solo descuenta hasta el efectivo disponible y deja el resto pendiente de devolver', () => {
    const caja = { monto_apertura: 100, efectivo: 20, devoluciones: 10, tarjeta: 60 };

    expect(calcularDevolucionSaldoClientes(caja, 200)).toEqual({
      descontado: 120,
      pendiente: 80
    });
    expect(montoCierreCaja(caja, 200)).toBe(60);
  });

  it('conserva el efectivo neto aunque haya devoluciones históricas', () => {
    expect(montoCierreCaja({ monto_apertura: 100, efectivo: 20, devoluciones: 500 }, 100)).toBe(20);
  });
});
