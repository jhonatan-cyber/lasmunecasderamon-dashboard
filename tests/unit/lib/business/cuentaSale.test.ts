import { describe, expect, it } from 'vitest';

import {
  buildCuentaSalePayload,
  esMetodoPagoVenta,
  METODOS_PAGO_VENTA
} from '@/lib/business/cuentaSale';

const CUENTA = {
  codigo: 'CTA123',
  cliente_id: 'cli-1',
  pedido_id: 'ped-1',
  sub_total: 12000,
  total: 12000,
  total_comision: 1500
};

const DETALLES = [
  {
    producto_id: 'prod-1',
    precio: 6000,
    cantidad: 2,
    sub_total: 12000,
    comision: 1500,
    hostess_id: 'host-1'
  }
];

describe('buildCuentaSalePayload', () => {
  it('arma la venta de la cuenta igual que el paso que hacía la app', () => {
    const payload = buildCuentaSalePayload({
      cuenta: CUENTA,
      cobro: { montoFinal: 12000, propinaFinal: 1200, metodoPago: 'tarjeta' },
      detalles: DETALLES,
      usuarios: ['host-1']
    });

    // `origen: 'cuenta'` es lo que le dice al servicio que el cobro ya postuló
    // los saldos a caja y ya descontó el prepago: la venta no lo vuelve a hacer.
    expect(payload).toMatchObject({
      origen: 'cuenta',
      skip_client_prepago: true,
      codigo: 'CTA123',
      cliente_id: 'cli-1',
      pedido_id: 'ped-1',
      metodo_pago: 'tarjeta',
      sub_total: 12000,
      // Lo que paga el cliente: lo cobrado más la propina.
      total: 13200,
      propina: 1200,
      total_comision: 1500
    });

    expect(payload.detalles).toEqual([
      {
        producto_id: 'prod-1',
        precio: 6000,
        cantidad: 2,
        sub_total: 12000,
        comision: 1500,
        hostess_id: 'host-1'
      }
    ]);
    expect(payload.usuarios).toEqual(['host-1']);
  });

  it('sella la hora del dispositivo cuando el cobro vino de la cola', () => {
    const payload = buildCuentaSalePayload({
      cuenta: CUENTA,
      cobro: {
        montoFinal: 12000,
        propinaFinal: 0,
        metodoPago: 'efectivo',
        deviceDate: '2026-09-28T10:00:00.000Z'
      },
      detalles: DETALLES,
      usuarios: []
    });

    // Sin esto, la venta fecharía al sincronizar y se movería de turno.
    expect(payload.device_date).toBe('2026-09-28T10:00:00.000Z');
  });

  it('no inventa device_date si el cobro no trae uno', () => {
    const payload = buildCuentaSalePayload({
      cuenta: CUENTA,
      cobro: { montoFinal: 12000, propinaFinal: 0, metodoPago: 'efectivo' },
      detalles: DETALLES,
      usuarios: []
    });

    expect(payload).not.toHaveProperty('device_date');
  });

  it('descarta usuarios vacíos y respeta clientes y anfitrionas sin id', () => {
    const payload = buildCuentaSalePayload({
      cuenta: { ...CUENTA, cliente_id: null, pedido_id: null },
      cobro: { montoFinal: 12000, propinaFinal: 0, metodoPago: 'efectivo' },
      detalles: [{ ...DETALLES[0], hostess_id: null }],
      usuarios: [null, '', 'host-2', undefined]
    });

    expect(payload.cliente_id).toBeNull();
    expect(payload.pedido_id).toBeNull();
    expect(payload.usuarios).toEqual(['host-2']);
    expect(payload.detalles[0].hostess_id).toBeNull();
  });

  it('coerciona los números que la base devuelve como texto', () => {
    const payload = buildCuentaSalePayload({
      cuenta: {
        ...CUENTA,
        sub_total: '12000' as unknown as number,
        total_comision: '1500' as unknown as number
      },
      cobro: { montoFinal: 12000, propinaFinal: 0, metodoPago: 'efectivo' },
      detalles: [
        {
          producto_id: 'prod-1',
          precio: '6000',
          cantidad: '2',
          sub_total: '12000',
          comision: '1500'
        } as unknown as (typeof DETALLES)[number]
      ],
      usuarios: []
    });

    expect(payload.sub_total).toBe(12000);
    expect(payload.total_comision).toBe(1500);
    expect(payload.detalles[0]).toMatchObject({
      precio: 6000,
      cantidad: 2,
      sub_total: 12000,
      comision: 1500
    });
  });
});

describe('métodos de pago que la venta acepta', () => {
  it('cierra el conjunto igual que SaleCreateSchema', () => {
    expect([...METODOS_PAGO_VENTA]).toEqual([
      'efectivo',
      'tarjeta',
      'transferencia',
      'prepago',
      'mixto'
    ]);
    expect(esMetodoPagoVenta('efectivo')).toBe(true);
    expect(esMetodoPagoVenta('crypto')).toBe(false);
  });
});
