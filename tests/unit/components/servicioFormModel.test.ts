import { describe, expect, it } from 'vitest';
import {
  calcularDistribucionPrepago,
  buildServicioPayload,
  type ClienteConSaldo
} from '@/components/private-rooms/new/servicioFormModel';

const cliente = (clienteId: string, saldo: number): ClienteConSaldo => ({
  clienteId,
  nombre: `Cliente ${clienteId}`,
  saldo
});

describe('distribucion del descuento prepago', () => {
  it('opcion ninguno no trae destinos y deja el monto completo para caja', () => {
    const resultado = calcularDistribucionPrepago(50_000, [cliente('a', 10_000)], 'ninguno');
    expect(resultado).toEqual({ destinos: [], pagadoConSaldo: 0, alCaja: 50_000 });
  });

  it('con un solo candidato reparte todo el monto posible: min(saldo, monto)', () => {
    expect(calcularDistribucionPrepago(50_000, [cliente('a', 60_000)], 'uno')).toEqual({
      destinos: [{ cliente_id: 'a', monto: 50_000 }],
      pagadoConSaldo: 50_000,
      alCaja: 0
    });
    expect(calcularDistribucionPrepago(50_000, [cliente('a', 30_000)], 'uno')).toEqual({
      destinos: [{ cliente_id: 'a', monto: 30_000 }],
      pagadoConSaldo: 30_000,
      alCaja: 20_000
    });
  });

  it('la opcion uno respeta el titular elegido y excluye a los otros', () => {
    const resultado = calcularDistribucionPrepago(
      40_000,
      [cliente('a', 60_000), cliente('b', 60_000)],
      'uno',
      'b'
    );
    expect(resultado.destinos).toEqual([{ cliente_id: 'b', monto: 40_000 }]);
    expect(resultado.pagadoConSaldo).toBe(40_000);
    expect(resultado.alCaja).toBe(0);
  });

  it('ambos reparte mitad y mitad respetando el saldo de cada cliente', () => {
    expect(
      calcularDistribucionPrepago(50_000, [cliente('a', 60_000), cliente('b', 60_000)], 'ambos')
    ).toEqual({
      destinos: [
        { cliente_id: 'a', monto: 25_000 },
        { cliente_id: 'b', monto: 25_000 }
      ],
      pagadoConSaldo: 50_000,
      alCaja: 0
    });
  });

  it('ambos manda el resto a caja cuando los saldos no cubren el monto', () => {
    const resultado = calcularDistribucionPrepago(
      50_000,
      [cliente('a', 10_000), cliente('b', 20_000)],
      'ambos'
    );
    expect(resultado.destinos).toEqual([
      { cliente_id: 'a', monto: 10_000 },
      { cliente_id: 'b', monto: 20_000 }
    ]);
    expect(resultado.pagadoConSaldo).toBe(30_000);
    expect(resultado.alCaja).toBe(20_000);
  });

  it('ambos con saldo desigual: cada uno capado a su mitad y el resto va a caja', () => {
    const resultado = calcularDistribucionPrepago(
      50_000,
      [cliente('a', 5_000), cliente('b', 90_000)],
      'ambos'
    );
    expect(resultado.destinos).toEqual([
      { cliente_id: 'a', monto: 5_000 },
      { cliente_id: 'b', monto: 25_000 }
    ]);
    expect(resultado.pagadoConSaldo).toBe(30_000);
    expect(resultado.alCaja).toBe(20_000);
  });

  it('ambos redondea el reparto de montos impares sin perder ni avar centavos', () => {
    const resultado = calcularDistribucionPrepago(
      101,
      [cliente('a', 999), cliente('b', 999)],
      'ambos'
    );
    expect(resultado.destinos).toEqual([
      { cliente_id: 'a', monto: 51 },
      { cliente_id: 'b', monto: 50 }
    ]);
    expect(resultado.pagadoConSaldo).toBe(101);
    expect(resultado.alCaja).toBe(0);
  });

  it('con mas de dos candidatos limita ambos a los primeros dos', () => {
    const resultado = calcularDistribucionPrepago(
      40_000,
      [cliente('a', 60_000), cliente('b', 60_000), cliente('c', 60_000)],
      'ambos'
    );
    expect(resultado.destinos.map(d => d.cliente_id)).toEqual(['a', 'b']);
  });

  it('ignora montos cero y redondeos que dan cero sin crear destinos vacios', () => {
    const resultado = calcularDistribucionPrepago(0, [cliente('a', 60_000)], 'uno');
    expect(resultado).toEqual({ destinos: [], pagadoConSaldo: 0, alCaja: 0 });
  });
});

describe('payload del servicio con destinos prepago', () => {
  const formData = {
    clientes: ['1', '2'],
    usuarios: ['h1'],
    habitacion_id: 'hab',
    precio_habitacion: 0,
    tiempo_habitacion: 0,
    precio_servicio: 10_000,
    metodo_pago: 'prepago',
    iva: 0,
    tiempo: 30
  };

  it('incluye los destinos con ids normalizados cuando se elige repartir', () => {
    const payload = buildServicioPayload({
      formData,
      precioHabitacion: 0,
      subTotal: 10_000,
      total: 10_000,
      pagosMixtos: [],
      prepagoDestinos: [
        { cliente_id: '1', monto: 5_000 },
        { cliente_id: '2', monto: 5_000 }
      ]
    });
    expect(payload.prepago_destinos).toEqual([
      { cliente_id: 1, monto: 5_000 },
      { cliente_id: 2, monto: 5_000 }
    ]);
    expect(payload.cliente_id).toBe(1);
    expect(payload.metodo_pago).toBe('prepago');
  });

  it('sin distribucion elegida no envia la propiedad', () => {
    const payload = buildServicioPayload({
      formData,
      precioHabitacion: 0,
      subTotal: 10_000,
      total: 10_000,
      pagosMixtos: []
    });
    expect(payload.prepago_destinos).toBeUndefined();
  });

  it('envia arreglo vacio explicito cuando se decide no descontar saldo', () => {
    const payload = buildServicioPayload({
      formData,
      precioHabitacion: 0,
      subTotal: 10_000,
      total: 10_000,
      pagosMixtos: [],
      prepagoDestinos: []
    });
    expect(payload.prepago_destinos).toEqual([]);
  });
});
