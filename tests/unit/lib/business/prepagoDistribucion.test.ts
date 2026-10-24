import { describe, expect, it } from 'vitest';
import {
  calcularDevolucionesPrepago,
  calcularDistribucionPrepago,
  normalizarDestinosPrepago
} from '@/lib/business/prepagoDistribucion';

describe('normalizarDestinosPrepago', () => {
  it('normaliza ids y montos descartando lo que no aporta', () => {
    expect(
      normalizarDestinosPrepago(
        [
          { cliente_id: 12, monto: '10000' },
          { cliente_id: 'c-2', monto: 0 },
          { cliente_id: '', monto: 5000 }
        ],
        20000
      )
    ).toEqual([{ cliente_id: '12', monto: 10000 }]);
  });

  it('acepta un reparto que cubre exactamente el total', () => {
    expect(
      normalizarDestinosPrepago(
        [
          { cliente_id: 'c-1', monto: 10000 },
          { cliente_id: 'c-2', monto: 10000 }
        ],
        20000
      )
    ).toHaveLength(2);
  });

  it('rechaza un reparto mayor al total antes de tocar saldos', () => {
    expect(() =>
      normalizarDestinosPrepago(
        [
          { cliente_id: 'c-1', monto: 20000 },
          { cliente_id: 'c-2', monto: 20000 }
        ],
        30000
      )
    ).toThrowError(/supera el total/);
  });

  it('sin destinos devuelve una lista vacía', () => {
    expect(normalizarDestinosPrepago(undefined, 10000)).toEqual([]);
  });
});

describe('calcularDistribucionPrepago', () => {
  const clientes = [
    { clienteId: 'c-1', nombre: 'Ana', saldo: 30000 },
    { clienteId: 'c-2', nombre: 'Bruno', saldo: 5000 }
  ];

  it('reparte mitad y mitad sin pasarse del saldo de cada cliente', () => {
    const { destinos, pagadoConSaldo, alCaja } = calcularDistribucionPrepago(
      40000,
      clientes,
      'ambos'
    );

    expect(destinos).toEqual([
      { cliente_id: 'c-1', monto: 20000 },
      { cliente_id: 'c-2', monto: 5000 }
    ]);
    expect(pagadoConSaldo).toBe(25000);
    expect(alCaja).toBe(15000);
  });

  it('con un solo cliente descuenta lo que alcance su saldo', () => {
    const { destinos, alCaja } = calcularDistribucionPrepago(40000, clientes, 'uno', 'c-1');

    expect(destinos).toEqual([{ cliente_id: 'c-1', monto: 30000 }]);
    expect(alCaja).toBe(10000);
  });
});

describe('calcularDevolucionesPrepago', () => {
  it('devuelve a cada cliente lo que aportó en una anulación total', () => {
    expect(
      calcularDevolucionesPrepago(
        [
          { cliente_id: 'c-1', monto: 25000 },
          { cliente_id: 'c-2', monto: 25000 }
        ],
        0
      )
    ).toEqual([
      { cliente_id: 'c-1', monto: 25000 },
      { cliente_id: 'c-2', monto: 25000 }
    ]);
  });

  it('reparte proporcionalmente en una anulación parcial', () => {
    expect(
      calcularDevolucionesPrepago(
        [
          { cliente_id: 'c-1', monto: 40000 },
          { cliente_id: 'c-2', monto: 10000 }
        ],
        25000
      )
    ).toEqual([
      { cliente_id: 'c-1', monto: 20000 },
      { cliente_id: 'c-2', monto: 5000 }
    ]);
  });

  it('no devuelve nada si el consumo se conserva completo', () => {
    expect(calcularDevolucionesPrepago([{ cliente_id: 'c-1', monto: 25000 }], 25000)).toEqual([]);
  });
});
