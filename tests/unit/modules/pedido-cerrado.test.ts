import { describe, expect, it } from 'vitest';
import { ventaDesdePedido } from '@/modules/operacion/pedidos/reglas';
import { OrderCreateSchema } from '@/lib/business/schemas/order';
const pedido = {
  id_pedido: 'pedido',
  estado: 1,
  cliente_id: 'cliente',
  metodo_pago: 'tarjeta',
  propina: 2000
};
const line = {
  producto_id: 'producto',
  precio: 10000,
  cantidad: 2,
  comision: 4000,
  genera_comision: 1,
  anfitrionas_asignadas_ids: 'ana,bea',
  habitacion_id: 'room',
  configuracion_venta: { tipo_venta: 'shot', shot_anfitriona: true, presentacion_id: 'pres' }
};
describe('Venta desde datos guardados del pedido', () => {
  it('conserva pago, propina, cliente, formato, comision y anfitrionas, y permite 90 minutos', () => {
    expect(ventaDesdePedido(pedido, [line], 90)).toMatchObject({
      pedido_id: 'pedido',
      cliente_id: 'cliente',
      metodo_pago: 'tarjeta',
      propina: 2000,
      sub_total: 20000,
      total: 22000,
      total_comision: 4000,
      usuarios: ['ana', 'bea'],
      habitacion_id: 'room',
      tiempo: 90,
      detalles: [
        {
          tipo_venta: 'shot',
          shot_anfitriona: true,
          cantidad: 2,
          precio: 10000,
          comision: 4000,
          hostesses: ['ana', 'bea']
        }
      ]
    });
  });
  it('sin habitacion guardada no agrega una ni inicia tiempo', () => {
    expect(ventaDesdePedido(pedido, [{ ...line, habitacion_id: null }], 90)).toMatchObject({
      habitacion_id: null,
      tiempo: 0
    });
  });
  it.each([0, -1, 1.5, 1441, NaN])('rechaza duracion invalida: %s', tiempo => {
    expect(() => ventaDesdePedido(pedido, [line], tiempo)).toThrow('tiempo');
  });
  it('rechaza pedidos procesados o incompletos', () => {
    expect(() => ventaDesdePedido({ ...pedido, estado: 0 }, [line], 90)).toThrow('procesado');
    expect(() => ventaDesdePedido({ ...pedido, metodo_pago: null }, [line], 90)).toThrow('pago');
    expect(() => ventaDesdePedido(pedido, [line, { ...line, habitacion_id: 'otra' }], 90)).toThrow(
      'habitacion'
    );
  });
  it('elimina anfitrionas en formatos sin comision', () => {
    expect(ventaDesdePedido(pedido, [{ ...line, comision: 0 }], 90)).toMatchObject({
      usuarios: [],
      total_comision: 0,
      detalles: [{ hostesses: [], hostess_id: null }]
    });
  });
});
const input = {
  codigo: 'PED',
  meseroId: 'user',
  metodoPago: 'efectivo',
  subtotal: 20000,
  total: 20000,
  detalles: [
    {
      productoId: 'prod',
      precio: 10000,
      cantidad: 2,
      subtotal: 20000,
      comision: 4000,
      selectedHostesses: ['ana']
    }
  ]
};
describe('Validacion al enviar pedido', () => {
  it('admite un pedido completo', () =>
    expect(OrderCreateSchema.safeParse(input).success).toBe(true));
  it.each([{ metodoPago: undefined }, { propina: -1 }, { total: 1 }, { subtotal: 1 }])(
    'rechaza datos incompletos o importes inconsistentes',
    changes => expect(OrderCreateSchema.safeParse({ ...input, ...changes }).success).toBe(false)
  );
  it.each([{ selectedHostesses: [] }, { generaComision: 0 }, { comision: 0 }, { subtotal: 5 }])(
    'rechaza asignaciones o subtotal incorrectos antes de guardar',
    changes =>
      expect(
        OrderCreateSchema.safeParse({ ...input, detalles: [{ ...input.detalles[0], ...changes }] })
          .success
      ).toBe(false)
  );
});
