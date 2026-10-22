import { describe, expect, it } from 'vitest';

import {
  ORIGENES_VENTA,
  ORIGEN_VENTA_POR_DEFECTO,
  resolverOrigenVenta
} from '@/lib/business/ventasOrigen';

/**
 * Prioridad del origen de una venta. Los solapes son el caso que importa: si
 * alguien cambia el orden, dos ventas con las mismas columnas quedarían
 * clasificadas distinto que el histórico backfilleado por la migración 098.
 */
describe('resolverOrigenVenta', () => {
  it('una venta sin señales es de barra', () => {
    expect(resolverOrigenVenta({})).toBe('barra');
    expect(resolverOrigenVenta({})).toBe(ORIGEN_VENTA_POR_DEFECTO);
  });

  it('los ids vacíos no cuentan como señal', () => {
    expect(
      resolverOrigenVenta({ entradaId: '', servicioId: '', habitacionId: '', pedidoId: '' })
    ).toBe('barra');
  });

  it('cada señal sola resuelve su origen', () => {
    expect(resolverOrigenVenta({ entradaId: 'e1' })).toBe('entrada');
    expect(resolverOrigenVenta({ servicioId: 's1' })).toBe('servicio');
    expect(resolverOrigenVenta({ habitacionId: 'h1' })).toBe('habitacion');
    expect(resolverOrigenVenta({ pedidoId: 'p1' })).toBe('pedido');
  });

  it('la entrada gana sobre cualquier otro vínculo', () => {
    expect(
      resolverOrigenVenta({ entradaId: 'e1', servicioId: 's1', habitacionId: 'h1', pedidoId: 'p1' })
    ).toBe('entrada');
  });

  it('el servicio gana sobre la habitación que lo cobra', () => {
    expect(resolverOrigenVenta({ servicioId: 's1', habitacionId: 'h1' })).toBe('servicio');
  });

  it('la habitación gana sobre el pedido que la originó', () => {
    expect(resolverOrigenVenta({ habitacionId: 'h1', pedidoId: 'p1' })).toBe('habitacion');
  });

  it('el enum no incluye cuenta: el pospago ya no genera ventas', () => {
    expect(ORIGENES_VENTA).not.toContain('cuenta');
    expect([...ORIGENES_VENTA]).toEqual(['entrada', 'servicio', 'habitacion', 'pedido', 'barra']);
  });
});
