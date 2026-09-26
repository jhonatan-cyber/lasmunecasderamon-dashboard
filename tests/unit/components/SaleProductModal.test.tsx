'use client';
import React, { useState } from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import SaleProductModal from '@/components/sales/SaleProductModal';

vi.mock('next/image', () => ({
  default: ({ src, alt, onError }: React.ImgHTMLAttributes<HTMLImageElement>) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} onError={onError} />
  )
}));
vi.mock('@/hooks/shared/useConfigValue', () => ({ useConfigValue: () => 50 }));
vi.mock('@/components/orders', () => ({
  HostessMultiSelect: () => null,
  getActiveHostesses: () => [],
  getChampagneHostessLimit: () => 1,
  hasCommission: () => false,
  isChampagneProduct: () => false
}));
vi.mock('@/components/shared/selects', () => ({ IndividualHostessSelect: () => null }));

afterEach(cleanup);

const product = {
  id: 'presentation-1',
  nombre: 'Producto de prueba',
  foto: 'producto.webp',
  stock_bar: 5,
  precio: 4000,
  comision: 0,
  opciones_venta: [
    { tipo: 'botella', precio: 4000, comision: 0 },
    { tipo: 'shot', precio: 1000, comision: 0 }
  ]
};

describe('vistas de productos en nueva venta', () => {
  it('conserva cantidad y tipo de venta al alternar tabla y tarjetas y permite agregar', () => {
    const add = vi.fn();
    function Harness() {
      const [quantities, setQuantities] = useState<Record<string, number>>({});
      return (
        <SaleProductModal
          open
          onClose={vi.fn()}
          loading={false}
          productos={[product]}
          cantidades={quantities}
          handleCantidadChange={(id, value) =>
            setQuantities(prev => ({ ...prev, [id]: Number(value) }))
          }
          handleAgregarProducto={add}
          categoria={{ nombre: 'Bebidas' }}
          anfitrionas={[]}
          champagneHostessSelections={{}}
          onChampagneHostessChange={vi.fn()}
          otherProductHostessSelections={{}}
          onOtherProductHostessChange={vi.fn()}
          productosEnCarrito={[]}
        />
      );
    }
    render(<Harness />);
    expect(screen.getByRole('table')).toBeInTheDocument();
    const photo = screen.getByRole('img', { name: product.nombre });
    expect(photo).toHaveAttribute('src', '/api/images/products/producto.webp');
    fireEvent.error(photo);
    expect(photo).toHaveAttribute('src', '/api/images/products/default.png');
    fireEvent.click(screen.getByRole('button', { name: 'Aumentar' }));
    fireEvent.click(screen.getByRole('button', { name: /Shot/ }));
    fireEvent.click(screen.getByRole('radio', { name: 'Ver como tarjetas' }));
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: product.nombre })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Agregar producto' }));
    expect(add).toHaveBeenLastCalledWith(
      expect.objectContaining({ id: product.id, tipo_venta: 'shot', precio: 1000 })
    );
    fireEvent.click(screen.getByRole('radio', { name: 'Ver como tabla' }));
    expect(screen.getByRole('table')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Agregar producto' }));
    expect(add).toHaveBeenLastCalledWith(
      expect.objectContaining({ tipo_venta: 'shot', precio: 1000 })
    );
  });
});
