import React from 'react';
import { render, screen, cleanup } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ProductDetailsModal } from '@/components/products/ProductDetailsModal';
import { formatCurrencyCLP } from '@/lib/utils/formatters';

vi.mock('next/image', () => ({
  default: ({ alt }: { alt: string }) => <span role='img' aria-label={alt} />
}));
vi.mock('@/components/products/UnitLabelSelector', () => ({
  UnitLabelSelector: ({ units }: { units: unknown[] }) => (
    <div>{units.length} etiquetas disponibles</div>
  )
}));
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const product = {
  id: 'p1',
  name: 'Champagne prueba',
  code: 'P-1',
  category_id: 'c1',
  categoria: 'Champagne',
  price: 10000,
  commission: 1000,
  description: 'Descripción completa',
  status: 1
};
const presentations = [
  {
    id: 'pres1',
    producto_id: 'p1',
    nombre: '750 ml',
    stock: 4,
    stock_bar: 2,
    precio_compra: 5000,
    precio_venta: 0,
    comision: 0,
    opciones_venta: [
      { tipo: 'botella' as const, precio: 25000, comision: 5000 },
      { tipo: 'shot' as const, precio: 6000, comision: 0 }
    ]
  },
  { id: 'pres2', producto_id: 'p1', nombre: '1500 ml', stock: 3, stock_bar: 1, precio_compra: 8000 }
];

describe('detalle completo del producto', () => {
  it('muestra solo el stock y los codigos de la presentacion seleccionada', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => ({
        ok: true,
        json: async () => ({
          success: true,
          data: url.includes('/bar?')
            ? presentations
            : url.includes('/units?')
              ? {
                  total: 7,
                  unidades: [
                    { id: 'u1', presentacion_id: 'pres1' },
                    { id: 'u2', presentacion_id: 'pres2' }
                  ]
                }
              : url.endsWith('/tiers')
                ? [{ anfitrionas: 2, precio: 20000, comision: 4000 }]
                : { ...product, max_anfitrionas: 4, updated_at: '2026-09-22T17:00:00Z' }
        })
      }))
    );
    render(
      <ProductDetailsModal
        open
        onOpenChange={vi.fn()}
        product={product}
        presentation={presentations[0]}
      />
    );
    expect(await screen.findByRole('region', { name: 'Información general' })).toBeInTheDocument();
    expect(screen.getByText('Descripción completa')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: /1500 ml/ })).not.toBeInTheDocument();
    expect(screen.getByText('4 unidades')).toBeInTheDocument();
    expect(screen.queryByText('7 unidades')).not.toBeInTheDocument();
    expect(screen.getByText('Stock en bar')).toBeInTheDocument();
    expect(screen.getByText('Máximo de anfitrionas')).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Precios por anfitrionas' })).toBeInTheDocument();
    expect(screen.getByText('1 etiquetas disponibles')).toBeInTheDocument();
    expect(screen.getAllByText(formatCurrencyCLP(25000)).length).toBeGreaterThan(0);
    expect(screen.getAllByText(formatCurrencyCLP(5000)).length).toBeGreaterThan(0);
    expect(screen.getAllByText('Sin comisión').length).toBeGreaterThan(0);
    expect(fetch).toHaveBeenCalledWith('/api/bar?producto_id=p1', expect.anything());
    expect(fetch).toHaveBeenCalledWith(
      '/api/products/units?producto_id=p1&presentacion_id=pres1',
      expect.anything()
    );
  });

  it('informa un fallo de carga sin mostrar stock cero como si fuera real', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Error de conexión')));
    render(<ProductDetailsModal open onOpenChange={vi.fn()} product={product} />);
    expect(await screen.findByRole('alert')).toHaveTextContent('Error de conexión');
    expect(screen.getByRole('button', { name: 'Reintentar' })).toBeInTheDocument();
    expect(screen.queryByText('Stock en almacén')).not.toBeInTheDocument();
  });
});
