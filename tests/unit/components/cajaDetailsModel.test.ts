import { describe, expect, it } from 'vitest';
import { buildCajaDetailsNumbers } from '@/components/caja/details/cajaDetailsModel';

/**
 * `cajas.efectivo` ya viene neto de retiros y anticipos: `WithdrawalService.addRetiro` y
 * `grantAnticipo` lo restan al registrarlos. El modelo del detalle tiene que respetar eso:
 * si volviera a restarlos, el efectivo neto y el total real quedarían por debajo del cajón
 * real (y distintos del monto de cierre).
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

const retiros = [{ monto: 120000 }];
const sinFuentes = {
  ventasTragosChicas: {},
  ventasChampagne: {},
  ventasBarras: {}
};

const numeros = (caja: Record<string, unknown>, listaRetiros: any[] = retiros) =>
  buildCajaDetailsNumbers(caja, {}, sinFuentes, listaRetiros);

describe('buildCajaDetailsNumbers · efectivo neto', () => {
  it('no vuelve a descontar retiros ni anticipos', () => {
    const resultado = numeros(cajaBase);

    // Apertura y efectivo neto: los egresos ya se aplicaron.
    expect(resultado.efectivoNeto).toBe(585000);
    expect(resultado.egresosCaja).toBe(0);
    expect(resultado.totalReal).toBe(1050000);
  });

  it('descuenta los saldos prepago una sola vez', () => {
    const resultado = numeros({ ...cajaBase, saldo_clientes_descontado: 550000 });

    expect(resultado.egresosCaja).toBe(550000);
    expect(resultado.efectivoNeto).toBe(35000); // 585.000 − 550.000
  });

  it('expone el saldo de clientes que quedó pendiente de devolución en el cierre', () => {
    const resultado = numeros({
      ...cajaBase,
      saldo_clientes_descontado: 585000,
      saldo_clientes_por_devolver: 90000
    });

    expect(resultado.saldoClientesDescontado).toBe(585000);
    expect(resultado.saldoClientesPorDevolver).toBe(90000);
    expect(resultado.efectivoNeto).toBe(0);
  });

  it('el efectivo neto conserva las devoluciones ya aplicadas', () => {
    const resultado = numeros({ ...cajaBase, anticipo: 0 }, []);

    expect(resultado.efectivoNeto).toBe(585000);
    expect(resultado.totalEgresos).toBe(25000);
  });
});

describe('buildCajaDetailsNumbers · egresos del turno', () => {
  it('el resumen de ingresos/egresos sigue mostrando lo que salió del negocio', () => {
    const resultado = numeros(cajaBase);

    // 25.000 de devoluciones + 60.000 de anticipos + 120.000 de retiros + 0 de saldos
    expect(resultado.totalEgresos).toBe(205000);
    // La vista del cajón y la del turno no son la misma cosa.
    expect(resultado.totalEgresos).not.toBe(resultado.egresosCaja);
  });

  it('el reparto de dinero usa el efectivo neto ya corregido', () => {
    const resultado = numeros(cajaBase);

    const efectivo = resultado.distribucionDinero.find(fila => fila.concepto === 'Efectivo neto');
    expect(efectivo?.monto).toBe(resultado.efectivoNeto);
  });
});
