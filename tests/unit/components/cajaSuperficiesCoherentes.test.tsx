import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

// Importar el repositorio abre `@/lib/database/db`, que los unit no cargan (sin `.env`
// no hay `JWT_SECRET`): se mockea el módulo entero, igual que en su propia suite.
vi.mock('@/lib/database/db', () => ({
  generateUUID: () => 'caja-test',
  withTransaction: vi.fn(async (cb: any) => cb(vi.fn())),
  query: vi.fn()
}));

import { CajaCard } from '@/components/caja/CajaCard';
import { buildCajaDetailsNumbers } from '@/components/caja/details/cajaDetailsModel';
import { CashRegisterRepository } from '@/modules/caja/turnos/repositorio';
import { totalCaja } from '@/lib/business/cajaEfectivo';
import type { CajaWithUser } from '@/types/caja';

afterEach(cleanup);

/**
 * Tres superficies miran la misma fila de `cajas` y tienen que dar **exactamente el
 * mismo número**: el `Balance Actual` de la tarjeta de la lista, el `Total real` del
 * detalle del turno y el monto de cierre del repositorio. Antes cada una armaba su
 * propia resta y divergían (el detalle descontaba dos veces retiros y anticipos).
 *
 * Este test es el hand-off: si alguien vuelve a escribir la fórmula a mano en una de
 * las tres, el número cambia y esto se rompe.
 */
const fila: CajaWithUser = {
  id_caja: 'caja-1',
  fecha_apertura: '2026-09-28 08:00:00',
  usuario_id_apertura: 'user-1',
  monto_apertura: 100000,
  ventas: 500000,
  efectivo: 485000,
  tarjeta: 320000,
  transferencia: 145000,
  servicios: 0,
  devoluciones: 25000,
  iva: 0,
  propina: 0,
  // Ya salieron del cajón (`efectivo` los trae descontados): restarlos otra vez es el bug.
  anticipo: 60000,
  retiro_total: 120000,
  comision: 0,
  monto_cierre: null,
  usuario_id_cierre: null,
  fecha_cierre: null,
  estado: 1,
  cajero_nombre: 'CajeroTest',
  // Con la caja abierta es 0: los saldos se descuentan recién al autorizar el cierre.
  saldo_clientes_descontado: 0
};

const fuentes = { ventasTragosChicas: {}, ventasChampagne: {}, ventasBarras: {} };

/**
 * Lee de la tarjeta renderizada el número que ve el cajero: el valor de la celda de
 * «Balance Actual». No se calcula con la función compartida a propósito: si la tarjeta
 * se desvía de `totalCaja`, este número deja de coincidir con el detalle y con el monto.
 */
const balanceDeLaTarjeta = (caja: CajaWithUser): number => {
  const { container } = render(
    <CajaCard caja={caja} onViewDetails={vi.fn()} onCloseCaja={vi.fn()} />
  );
  const etiqueta = Array.from(container.querySelectorAll('span')).find(
    span => span.textContent?.trim() === 'Balance Actual'
  );
  const celda = etiqueta?.parentElement?.lastElementChild?.textContent ?? '';
  // "$1.025.000" / "-$8.000" → número.
  return Number(celda.replace(/[^\d-]/g, ''));
};

describe('CajaCard · detalle · monto de cierre dan el mismo número', () => {
  it('para una misma fila, las tres superficies cuadran al peso', () => {
    // 100.000 + 485.000 − 25.000 + 320.000 + 145.000 (sin volver a restar anticipo ni retiros)
    const esperado = 1025000;

    const tarjeta = balanceDeLaTarjeta(fila);
    const detalle = buildCajaDetailsNumbers(fila, {}, fuentes, []).totalReal;
    const monto = CashRegisterRepository.calcularMontoCierre(
      fila,
      fila.saldo_clientes_descontado ?? 0
    );

    expect(tarjeta).toBe(esperado);
    expect(detalle).toBe(esperado);
    expect(monto).toBe(esperado);
  });

  it('las devoluciones bajan las tres juntas, ni una más que otra', () => {
    const conDevolucion: CajaWithUser = { ...fila, devoluciones: 90000 };

    const tarjeta = balanceDeLaTarjeta(conDevolucion);
    const detalle = buildCajaDetailsNumbers(conDevolucion, {}, fuentes, []).totalReal;
    const monto = CashRegisterRepository.calcularMontoCierre(conDevolucion, 0);

    // 100.000 + 485.000 − 90.000 + 320.000 + 145.000
    expect(tarjeta).toBe(960000);
    expect(detalle).toBe(tarjeta);
    expect(monto).toBe(tarjeta);
  });

  it('el detalle no vuelve a descontar lo que la tarjeta ya descontó', () => {
    const numeros = buildCajaDetailsNumbers(fila, {}, fuentes, [{ monto: 120000 }]);

    // El Total real de la tarjeta: ni el retiro de 120.000 ni el anticipo de 60.000
    // aparecen de nuevo en el cajón.
    expect(numeros.totalReal).toBe(totalCaja(fila));
    expect(numeros.efectivoNeto).toBe(100000 + 485000 - 25000);
    expect(numeros.egresosCaja).toBe(25000);
  });

  it('cuando el cierre descuenta saldos, las tres bajan el mismo descuento', () => {
    const cerrada: CajaWithUser = { ...fila, saldo_clientes_descontado: 300000 };

    const tarjeta = balanceDeLaTarjeta(cerrada);
    const detalle = buildCajaDetailsNumbers(cerrada, {}, fuentes, []).totalReal;
    const monto = CashRegisterRepository.calcularMontoCierre(cerrada, 300000);

    // 1.025.000 − 300.000
    expect(tarjeta).toBe(725000);
    expect(detalle).toBe(tarjeta);
    expect(monto).toBe(tarjeta);
  });
});
