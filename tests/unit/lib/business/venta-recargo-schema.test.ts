import { describe, expect, it } from 'vitest';
import { SaleCreateSchema } from '@/lib/business/schemas/sale';
import { buildSaleDetail } from '@/hooks/sales/salePayload';

const venta = (detalle: Record<string, unknown>) =>
  SaleCreateSchema.safeParse({
    total: 42000,
    sub_total: 42000,
    detalles: [
      {
        producto_id: 'botella',
        presentacion_id: 'botella-750',
        precio: 15000,
        cantidad: 2,
        ...detalle
      }
    ]
  });

describe('SaleCreateSchema y el recargo del acompañamiento', () => {
  it('acepta el subtotal que incluye el exceso sobre el tope', () => {
    expect(venta({ recargo_acompanamiento: 6000, sub_total: 42000 }).success).toBe(true);
  });

  it('rechaza un subtotal que ignora el recargo declarado', () => {
    const result = venta({ recargo_acompanamiento: 6000, sub_total: 30000 });
    if (result.success) throw new Error('La venta debía rechazarse');
    expect(result.error.issues.map(issue => issue.message)).toContain(
      'El subtotal del producto debe incluir el exceso del acompañamiento'
    );
  });

  it('acepta líneas sin subtotal: el servidor lo arma con el recargo', () => {
    expect(venta({ recargo_acompanamiento: 6000 }).success).toBe(true);
  });

  it('no bloquea líneas sin exceso, como entradas y ventas antiguas', () => {
    expect(venta({ sub_total: 30000 }).success).toBe(true);
    expect(venta({ recargo_acompanamiento: 0, sub_total: 30000 }).success).toBe(true);
  });

  it('valida el detalle que arma el carrito de ventas del dashboard', () => {
    const detalle = buildSaleDetail({
      producto_id: 'botella',
      presentacion_id: 'botella-750',
      tipo_venta: 'botella',
      precio: 15000,
      cantidad: 2,
      recargo_acompanamiento: 6000,
      subtotal: 42000,
      acompanamiento_botella: [{ presentacion_id: 'sprite', unidades: 2, precio: 8000 }]
    });
    expect(
      SaleCreateSchema.safeParse({ total: 42000, sub_total: 42000, detalles: [detalle] }).success
    ).toBe(true);
  });
});
