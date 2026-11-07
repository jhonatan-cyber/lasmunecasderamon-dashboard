import { describe, expect, it } from 'vitest';
import { buildSaleReceiptHtml } from '@/lib/utils/printSaleReceipt';

describe('buildSaleReceiptHtml', () => {
  it('genera ticket de 80 mm y escapa datos del cliente y los productos', () => {
    const html = buildSaleReceiptHtml({
      code: 'V-1',
      date: '2026-11-07T10:00:00',
      customer: '<Cliente>',
      paymentMethod: 'Efectivo',
      origin: 'Barra',
      subtotal: 10000,
      tip: 0,
      total: 10000,
      lines: [
        {
          name: '<Producto>',
          detail: 'Botella',
          quantity: 1,
          unitPrice: 10000,
          subtotal: 10000
        }
      ]
    });

    expect(html).toContain('@page { size: 80mm auto;');
    expect(html).toContain('&lt;Cliente&gt;');
    expect(html).toContain('&lt;Producto&gt;');
    expect(html).not.toContain('<Cliente>');
    expect(html).not.toContain('<script>');
  });

  it('omite datos opcionales no informados y propina en cero', () => {
    const html = buildSaleReceiptHtml({
      subtotal: 5000,
      tip: 0,
      total: 5000,
      lines: []
    });

    expect(html).not.toContain('<span>Cliente</span>');
    expect(html).not.toContain('<span>Ubicación</span>');
    expect(html).not.toContain('<span>Propina</span>');
  });
});
