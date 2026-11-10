import { describe, expect, it } from 'vitest';
import {
  precioUnitarioAcompanamiento,
  recargoAcompanamientoDeProducto,
  recargoAcompanamientoPorUnidad
} from '@/lib/sales/recargoAcompanamiento';

describe('recargoAcompanamientoPorUnidad', () => {
  it('cobra el exceso sobre el tope por cada unidad de bebida de la botella', () => {
    expect(
      recargoAcompanamientoPorUnidad({
        tope: 3000,
        tipoVenta: 'botella',
        acompanamiento_botella: [
          { presentacion_id: 'coca', unidades: 3, precio: 5000 },
          { presentacion_id: 'sprite', unidades: 1, precio: 2000 }
        ]
      })
    ).toBe(6000);
  });

  it('no cobra recargo cuando la bebida está bajo el tope', () => {
    expect(
      recargoAcompanamientoPorUnidad({
        tope: 3000,
        tipoVenta: 'botella',
        acompanamiento_botella: [{ presentacion_id: 'agua', unidades: 2, precio: 2500 }]
      })
    ).toBe(0);
  });

  it('desactiva la regla con tope cero o negativo', () => {
    const linea = {
      tipoVenta: 'botella' as const,
      acompanamiento_botella: [{ presentacion_id: 'coca', unidades: 3, precio: 5000 }]
    };
    expect(recargoAcompanamientoPorUnidad({ tope: 0, ...linea })).toBe(0);
    expect(recargoAcompanamientoPorUnidad({ tope: -1000, ...linea })).toBe(0);
  });

  it('aplica el recargo a los cortos de cliente', () => {
    expect(
      recargoAcompanamientoPorUnidad({
        tope: 3000,
        tipoVenta: 'shot',
        acompanamiento_corto: { unidades: 2, precio: 5000 }
      })
    ).toBe(4000);
  });

  it('cobra sólo el exceso sobre el tope (5000 de tope, 8000 de acompañamiento)', () => {
    expect(
      recargoAcompanamientoPorUnidad({
        tope: 5000,
        tipoVenta: 'shot',
        acompanamiento_corto: { unidades: 1, precio: 8000 }
      })
    ).toBe(3000);
  });

  it('no resta nada cuando el acompañamiento cuesta menos que el tope', () => {
    expect(
      recargoAcompanamientoPorUnidad({
        tope: 5000,
        tipoVenta: 'shot',
        acompanamiento_corto: { unidades: 1, precio: 3000 }
      })
    ).toBe(0);
  });

  it('no aplica el recargo a cortos de anfitriona (consumo en ml)', () => {
    expect(
      recargoAcompanamientoPorUnidad({
        tope: 3000,
        tipoVenta: 'shot',
        acompanamiento_corto: { ml_por_corto: 150 }
      })
    ).toBe(0);
  });

  it('ignora líneas sin acompañamiento o sin precio', () => {
    expect(recargoAcompanamientoPorUnidad({ tope: 3000, tipoVenta: 'shot' })).toBe(0);
    expect(
      recargoAcompanamientoPorUnidad({
        tope: 3000,
        tipoVenta: 'botella',
        acompanamiento_botella: [{ presentacion_id: 'coca', unidades: 5 }]
      })
    ).toBe(0);
  });

  it('redondea el precio del acompañamiento al peso', () => {
    expect(
      recargoAcompanamientoPorUnidad({
        tope: 3000,
        tipoVenta: 'botella',
        acompanamiento_botella: [{ presentacion_id: 'coca', unidades: 1, precio: 5000.6 }]
      })
    ).toBe(2001);
  });
});

describe('recargoAcompanamientoDeProducto', () => {
  it('lee el formato y la bebida de la línea tal como se armó en el carrito', () => {
    expect(
      recargoAcompanamientoDeProducto(
        {
          tipo_venta: 'botella',
          acompanamiento_botella: [{ presentacion_id: 'coca', unidades: 2, precio: 5000 }]
        },
        3000
      )
    ).toBe(4000);
    expect(
      recargoAcompanamientoDeProducto(
        {
          tipo_venta: 'shot',
          acompanamiento_corto: { ml_por_corto: 150 }
        },
        3000
      )
    ).toBe(0);
  });
});

describe('precioUnitarioAcompanamiento', () => {
  it('usa el precio de la presentación de botella', () => {
    expect(
      precioUnitarioAcompanamiento({
        opciones_venta: [{ tipo: 'botella', precio: 5000, comision: 0 }],
        precio_venta: 2000
      })
    ).toBe(5000);
  });

  it('cae al precio sin anfitriona cuando la opción de botella vale 0', () => {
    expect(
      precioUnitarioAcompanamiento({
        opciones_venta: [{ tipo: 'botella', precio: 0, comision: 0, precio_sin_anfitriona: 8000 }],
        precio_venta: 2000
      })
    ).toBe(8000);
  });

  it('cae al precio de venta de la presentación cuando la opción de botella vale 0', () => {
    expect(
      precioUnitarioAcompanamiento({
        opciones_venta: [{ tipo: 'botella', precio: 0, comision: 0 }],
        precio_venta: 8000,
        producto_precio: 7000
      })
    ).toBe(8000);
  });

  it('cae al precio del producto cuando no hay precio de presentación', () => {
    expect(
      precioUnitarioAcompanamiento({
        opciones_venta: [{ tipo: 'botella', precio: 0, comision: 0 }],
        precio_venta: 0,
        producto_precio: 7000
      })
    ).toBe(7000);
  });

  it('cae al precio de venta del producto cuando no hay opción de botella', () => {
    expect(precioUnitarioAcompanamiento({ opciones_venta: [], precio_venta: 2000 })).toBe(2000);
    expect(precioUnitarioAcompanamiento({ producto_precio: 1800 })).toBe(1800);
  });

  it('lee las opciones guardadas como JSON', () => {
    expect(
      precioUnitarioAcompanamiento({
        opciones_venta: JSON.stringify([{ tipo: 'botella', precio: 5000, comision: 0 }])
      })
    ).toBe(5000);
  });

  it('devuelve cero si el precio no es válido', () => {
    expect(precioUnitarioAcompanamiento(null)).toBe(0);
    expect(precioUnitarioAcompanamiento({ precio_venta: -100 })).toBe(0);
  });
});
