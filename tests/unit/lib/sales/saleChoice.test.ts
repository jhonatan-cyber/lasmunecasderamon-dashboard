import { describe, expect, it } from 'vitest';
import { resolverVentaProducto } from '@/lib/sales/saleChoice';

const botella = { tipo: 'botella' as const, precio: 180000, comision: 20000 };
const shot = { tipo: 'shot' as const, precio: 5000, comision: 0 };

const soloBotella = {
  precio: 4000,
  comision: 0,
  stock_bar: 3,
  opciones_venta: [{ tipo: 'botella' as const, precio: 4000, comision: 0 }]
};

const conShot = {
  precio: 180000,
  comision: 20000,
  stock_bar: 5,
  opciones_venta: [botella, shot]
};

const conShotAnfitriona = {
  ...conShot,
  opciones_venta: [botella, { ...shot, precio_anfitriona: 3000 }]
};

describe('resolverVentaProducto', () => {
  it('sin opciones guardadas ofrece solo la botella con su precio y comisión', () => {
    const venta = resolverVentaProducto(soloBotella);

    expect(venta.opciones).toEqual([
      { value: 'botella', nombre: 'Botella', precio: 4000, comision: 0, esShot: false }
    ]);
    expect(venta.tieneShot).toBe(false);
    expect(venta.tipoVenta).toBe('botella');
    expect(venta.precio).toBe(4000);
    // Tope de unidades de la botella: el stock del bar.
    expect(venta.maxCantidad).toBe(3);
  });

  it('usa el precio de la presentación cuando no hay opciones guardadas (catálogo viejo)', () => {
    const venta = resolverVentaProducto({ precio: 9500, comision: 500, stock_bar: 4 });

    expect(venta.opciones[0]).toMatchObject({ precio: 9500, comision: 500 });
    expect(venta.tipoVenta).toBe('botella');
  });

  it('el precio guardado en la opción manda sobre el de la presentación', () => {
    const venta = resolverVentaProducto({ ...soloBotella, opciones_venta: [botella] });

    expect(venta.precioBotella).toBe(180000);
    expect(venta.comisionBotella).toBe(20000);
  });

  it('con precio de shot ofrece las dos formas de venta, cada una con su precio', () => {
    const venta = resolverVentaProducto(conShot);

    expect(venta.opciones.map(opcion => opcion.value)).toEqual(['botella', 'shot']);
    // Sin precio de anfitriona el shot es uno solo: no hay a quién diferenciar.
    expect(venta.opciones[1].nombre).toBe('Shot');
    expect(venta.tieneShotAnfitriona).toBe(false);
    expect(venta.precioBotella).toBe(180000);
    expect(venta.comisionBotella).toBe(20000);
  });

  it('con precio de anfitriona parte el shot en cliente y anfitriona', () => {
    const venta = resolverVentaProducto(conShotAnfitriona, 'shot_anfitriona');

    expect(venta.opciones.map(opcion => opcion.value)).toEqual([
      'botella',
      'shot',
      'shot_anfitriona'
    ]);
    expect(venta.opciones[1].nombre).toBe('Shot cliente');
    expect(venta.opciones[2]).toMatchObject({ nombre: 'Shot anfitriona', precio: 3000 });
    expect(venta.tieneShotAnfitriona).toBe(true);
    expect(venta.esShot).toBe(true);
    expect(venta.precio).toBe(3000);
    // Un shot sale de la botella abierta: no gasta botellas del bar.
    expect(venta.maxCantidad).toBe(99);
  });

  it('acepta las opciones guardadas como JSON string (Configuraciones)', () => {
    const venta = resolverVentaProducto({
      ...conShotAnfitriona,
      opciones_venta: JSON.stringify(conShotAnfitriona.opciones_venta)
    });

    expect(venta.tieneShot).toBe(true);
    expect(venta.tieneShotAnfitriona).toBe(true);
    expect(venta.opciones.map(opcion => opcion.value)).toEqual([
      'botella',
      'shot',
      'shot_anfitriona'
    ]);
  });

  it('cae a la opción más parecida cuando se elige algo que el producto no ofrece', () => {
    // Un producto sin precio de anfitriona no puede cobrar el shot como anfitriona.
    expect(resolverVentaProducto(conShot, 'shot_anfitriona').tipoVenta).toBe('shot');
    // Un producto sin shot no puede venderse por ml.
    expect(resolverVentaProducto(soloBotella, 'shot').tipoVenta).toBe('botella');
    expect(resolverVentaProducto(soloBotella, 'shot_anfitriona').tipoVenta).toBe('botella');
  });
});
