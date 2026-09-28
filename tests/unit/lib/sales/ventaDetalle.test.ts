import { describe, expect, it } from 'vitest';
import { esShot, etiquetaVentaDetalle } from '@/lib/sales/ventaDetalle';

describe('ventaDetalle', () => {
  it('una botella no es shot', () => {
    expect(esShot({ tipo_venta: 'botella' })).toBe(false);
    expect(etiquetaVentaDetalle({ tipo_venta: 'botella' })).toBe('Botella');
  });

  it('trata como botella los detalles sin tipo (ventas anteriores a la migración 039)', () => {
    expect(etiquetaVentaDetalle({})).toBe('Botella');
  });

  it('distingue el shot de cliente del de anfitriona', () => {
    expect(etiquetaVentaDetalle({ tipo_venta: 'shot' })).toBe('Shot cliente');
    expect(etiquetaVentaDetalle({ tipo_venta: 'shot', shot_anfitriona: true })).toBe(
      'Shot anfitriona'
    );
  });

  it('la bandera no convierte en shot a una botella', () => {
    expect(esShot({ tipo_venta: 'botella', shot_anfitriona: true })).toBe(false);
    expect(etiquetaVentaDetalle({ tipo_venta: 'botella', shot_anfitriona: true })).toBe('Botella');
  });
});
