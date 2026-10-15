import { describe, expect, it } from 'vitest';
import { SaleCreateSchema, ServiceCreateSchema } from '@/lib/business/schemas';
import {
  calcularTotalComisionVenta,
  obtenerAnfitrionasVenta,
  repartirDetalleVenta,
  prepararDetallesVenta,
  calcularMovimientoCajaVenta,
  validarHabitacionVenta
} from '@/lib/business/registroVenta';
import { prepararPagoRegistro } from '@/lib/business/pagosMixtos';
import {
  calcularCondicionesServicio,
  prepararDetallesServicio,
  calcularMovimientoCajaServicio,
  obtenerClientesServicio
} from '@/modules/operacion/servicios/reglasCreacion';

const detalle = (cambios = {}) =>
  SaleCreateSchema.parse({
    total: 100,
    detalles: [
      {
        producto_id: 'p',
        precio: 10,
        cantidad: 3,
        comision: 7,
        hostesses: ['a', 'b', 'c'],
        ...cambios
      }
    ]
  }).detalles[0];
const venta = (cambios = {}) =>
  SaleCreateSchema.parse({ total: 101, propina: 1, detalles: [detalle()], ...cambios });
const servicio = (cambios = {}) =>
  ServiceCreateSchema.parse({
    habitacion_id: 'hab',
    precio_servicio: 10,
    sub_total: 100,
    total: 101,
    iva: 1,
    tiempo: 30,
    usuarios: ['a', 'b', 'c'],
    ...cambios
  });
const validas = new Set(['a', 'b', 'c']);

describe('reparto de ventas', () => {
  it('conserva cantidades, comisiones y subtotales para distintas cantidades y anfitrionas', () => {
    for (const champagne of [false, true]) {
      for (let cantidad = 1; cantidad <= 7; cantidad++) {
        for (let anfitrionas = 0; anfitrionas <= 5; anfitrionas++) {
          for (const comision of [0, 1, 7, 17.5]) {
            const ids = Array.from({ length: anfitrionas }, (_, i) => `a${i}`);
            const d = detalle({ cantidad, comision, hostesses: ids, isChampagne: champagne });
            const partes = repartirDetalleVenta(d, new Set(ids));
            expect(partes.reduce((s, p) => s + p.qtyPart, 0)).toBe(cantidad);
            expect(partes.reduce((s, p) => s + p.commPart, 0)).toBe(Math.round(comision));
            expect(partes.reduce((s, p) => s + p.subPart, 0)).toBe(10 * cantidad);
            expect(partes.every(p => p.qtyPart >= 0)).toBe(true);
            expect(partes).toHaveLength(
              champagne ? Math.max(1, anfitrionas) : Math.max(1, Math.min(cantidad, anfitrionas))
            );
          }
        }
      }
    }
  });
  it('champagne asigna cantidad y subtotal a la primera anfitriona y reparte la comision', () => {
    expect(
      repartirDetalleVenta(detalle({ cantidad: 1, isChampagne: true, sub_total: 99 }), validas)
    ).toEqual([
      { hostessId: 'a', qtyPart: 1, subPart: 99, commPart: 3 },
      { hostessId: 'b', qtyPart: 0, subPart: 0, commPart: 2 },
      { hostessId: 'c', qtyPart: 0, subPart: 0, commPart: 2 }
    ]);
  });
  it('conserva el fallback de subtotal cero en champagne y la cantidad fraccionaria de botella', () => {
    expect(
      repartirDetalleVenta(detalle({ cantidad: 1, isChampagne: true, sub_total: 0 }), validas)[0]
        .subPart
    ).toBe(10);
    expect(repartirDetalleVenta(detalle({ cantidad: 2.5 }), validas)).toEqual([
      { hostessId: 'a', qtyPart: 1, subPart: 10, commPart: 3 },
      { hostessId: 'b', qtyPart: 1.5, subPart: 15, commPart: 4 }
    ]);
  });
  it('prioriza hostesses y filtra las no confirmadas sin mutar los datos', () => {
    const v = venta({
      usuarios: ['b', 'a'],
      detalles: [detalle({ hostesses: ['c', 'x'], hostess_id: 'b' })]
    });
    const antes = structuredClone(v);
    expect(obtenerAnfitrionasVenta(v)).toEqual(['b', 'a', 'c', 'x']);
    const filas = prepararDetallesVenta(v.detalles, validas, 'v', 'fecha', () => 'id');
    expect(filas.detailRows).toHaveLength(1);
    expect(filas.detailRows[0].hostess_id).toBe('c');
    expect(v).toEqual(antes);
  });
  it('un shot de cliente conserva tipo y bebida sin generar comisiones', () => {
    const d = detalle({
      tipo_venta: 'shot',
      presentacion_id: 'p1',
      comision: 100,
      acompanamiento_corto: { presentacion_id: 'p2', ml_por_corto: 30 }
    });
    const filas = prepararDetallesVenta([d], validas, 'v', 'fecha', () => 'id');
    expect(filas.detailRows).toEqual([
      expect.objectContaining({
        tipo_venta: 'shot',
        shot_anfitriona: false,
        comision: 0,
        cantidad: 3,
        hostess_id: null,
        acompanamiento: JSON.stringify({ presentacion_id: 'p2', ml_por_corto: 30 })
      })
    ]);
    expect(filas.commissionMainRows).toEqual([]);
    expect(filas.commissionDetailRows).toEqual([]);
  });
  it.each([0, -1])('comision total %s usa la suma sin redondear los detalles', total_comision => {
    expect(
      calcularTotalComisionVenta(
        venta({
          total_comision,
          detalles: [detalle({ comision: 1.4 }), detalle({ comision: 2.4 })]
        })
      )
    ).toBe(3.8);
  });
  it('respeta una comision total positiva explicita aunque difiera de los detalles', () => {
    expect(calcularTotalComisionVenta(venta({ total_comision: 99 }))).toBe(99);
  });
});

describe('habitacion de una venta', () => {
  it('conserva el orden de errores: ocupacion antes de tiempo invalido', () => {
    expect(() =>
      validarHabitacionVenta({ precio: 10, comision_anfitriona: 1, estado: 2 }, 0, false)
    ).toThrow('La habitación ya está ocupada');
    expect(() =>
      validarHabitacionVenta({ precio: 10, comision_anfitriona: 1, estado: 1 }, 0, false)
    ).toThrow('Selecciona un tiempo válido');
  });
  it('una venta asociada a servicio no exige habitacion libre ni otro temporizador', () => {
    expect(validarHabitacionVenta({ precio: 10, comision_anfitriona: 1, estado: 2 }, 0, true)).toBe(
      false
    );
  });
  it.each([
    { precio: 0, comision_anfitriona: 5 },
    { precio: 10, comision_anfitriona: 0 }
  ])('mantiene libre ingreso cuando uno de sus importes es cero: %j', habitacion => {
    expect(validarHabitacionVenta({ ...habitacion, estado: 2 }, 0, false)).toBe(true);
  });
});

describe('comisiones y clientes de servicios', () => {
  it.each([
    {
      nombre: 'VIP',
      datos: { producto_incluido_presentacion_id: 'incluido' },
      comisionHabitacion: 101,
      total: 101,
      partes: [35, 33, 33]
    },
    { nombre: 'normal', datos: {}, comisionHabitacion: 0, total: 30, partes: [10, 10, 10] },
    {
      nombre: 'adicional',
      datos: { es_temporal: true },
      comisionHabitacion: 101,
      total: 10,
      partes: [4, 3, 3]
    }
  ])('$nombre conserva la comision total y su resto', caso => {
    const v = servicio(caso.datos);
    const condiciones = calcularCondicionesServicio(v, {
      precio: 100,
      comision_anfitriona: caso.comisionHabitacion
    });
    const filas = prepararDetallesServicio(
      v.usuarios,
      's',
      'fecha',
      v.es_temporal,
      condiciones,
      () => 'id'
    );
    expect(condiciones.comisionTotal).toBe(caso.total);
    expect(filas.detalleComisionRows.map(f => f.comision)).toEqual(caso.partes);
    expect(filas.detalleServicioRows.map(f => f.comision)).toEqual(caso.partes);
    expect(filas.detalleComisionRows.reduce((s, f) => s + f.comision, 0)).toBe(caso.total);
  });
  it('conserva los errores del producto incluido segun la habitacion y el adicional', () => {
    expect(() =>
      calcularCondicionesServicio(servicio(), { precio: 100, comision_anfitriona: 1 })
    ).toThrow('Selecciona el producto incluido');
    expect(() =>
      calcularCondicionesServicio(servicio({ producto_incluido_presentacion_id: 'p' }), {
        precio: 100,
        comision_anfitriona: 0
      })
    ).toThrow('Esta habitación o extensión no incluye un producto');
    expect(() =>
      calcularCondicionesServicio(
        servicio({ es_temporal: true, producto_incluido_presentacion_id: 'p' }),
        { precio: 100, comision_anfitriona: 1 }
      )
    ).toThrow('Esta habitación o extensión no incluye un producto');
  });
  it('clientes explicitos conservan su prioridad y repeticiones; si faltan se usa el titular', () => {
    expect(
      obtenerClientesServicio(servicio({ cliente_id: 'titular', clientes: ['', 'otro', 'otro'] }))
    ).toEqual(['otro', 'otro']);
    expect(obtenerClientesServicio(servicio({ cliente_id: 'titular' }))).toEqual(['titular']);
  });
});

describe('preparacion de pagos y movimientos de caja', () => {
  it('el pago no mixto conserva el consumo automatico y el mixto sin prepago lo omite', () => {
    expect(prepararPagoRegistro('prepago', 100, [])).toEqual({
      esMixto: false,
      prepagoSolicitado: null
    });
    expect(
      prepararPagoRegistro('mixto', 100, [
        { metodo: 'efectivo', monto: 50 },
        { metodo: 'tarjeta', monto: 50 }
      ])
    ).toEqual({ esMixto: true, prepagoSolicitado: 0 });
  });
  it('suma prepago y conserva la tolerancia de una unidad antes de consumir saldo', () => {
    const pagos = [
      { metodo: 'prepago', monto: 10 },
      { metodo: 'prepago', monto: 20 },
      { metodo: 'tarjeta', monto: 71 }
    ];
    expect(prepararPagoRegistro('mixto', 100, pagos).prepagoSolicitado).toBe(30);
    expect(() => prepararPagoRegistro('mixto', 99, pagos)).toThrow(
      'la suma debe ser igual al total'
    );
  });
  it.each(['efectivo', 'tarjeta', 'transferencia'] as const)(
    'pago %s descuenta prepago una sola vez',
    metodo_pago => {
      expect(calcularMovimientoCajaVenta(venta({ metodo_pago }), [], 10, 7)).toEqual({
        venta: 100,
        propina: 1,
        efectivo: 0,
        tarjeta: 0,
        transferencia: 0,
        [metodo_pago]: 91,
        prepago: 10,
        comision: 7
      });
      expect(calcularMovimientoCajaServicio(servicio({ metodo_pago }), [], 10, 30)).toEqual({
        servicio: 100,
        efectivo: 0,
        tarjeta: 0,
        transferencia: 0,
        [metodo_pago]: 91,
        prepago: 10,
        iva: 1,
        comision: 30
      });
    }
  );
  it('el mixto conserva sus importes sin descontar prepago del metodo principal otra vez', () => {
    const pagos = [
      { metodo: 'prepago', monto: 10 },
      { metodo: 'tarjeta', monto: 91 }
    ];
    expect(
      calcularMovimientoCajaVenta(venta({ metodo_pago: 'mixto' }), pagos, 10, 7)
    ).toMatchObject({ venta: 100, tarjeta: 91, prepago: 10 });
    expect(
      calcularMovimientoCajaServicio(servicio({ metodo_pago: 'mixto' }), pagos, 10, 30)
    ).toMatchObject({ servicio: 100, tarjeta: 91, prepago: 10 });
  });
});
