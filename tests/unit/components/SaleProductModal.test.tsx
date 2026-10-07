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

function Harness({
  productos,
  onAdd,
  productosEnCarrito = []
}: {
  productos: any[];
  onAdd: (p: any) => void;
  productosEnCarrito?: any[];
}) {
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  return (
    <SaleProductModal
      open
      onClose={vi.fn()}
      loading={false}
      productos={productos}
      cantidades={quantities}
      handleCantidadChange={(id, value) =>
        setQuantities(prev => ({ ...prev, [id]: Number(value) }))
      }
      handleAgregarProducto={onAdd}
      categoria={{ nombre: 'Bebidas' }}
      anfitrionas={[]}
      champagneHostessSelections={{}}
      onChampagneHostessChange={vi.fn()}
      otherProductHostessSelections={{}}
      onOtherProductHostessChange={vi.fn()}
      productosEnCarrito={productosEnCarrito}
    />
  );
}

describe('vistas de productos en nueva venta', () => {
  it('permite agregar un producto con comisión sin seleccionar anfitrionas', () => {
    const add = vi.fn();
    render(
      <Harness
        productos={[
          {
            ...product,
            comision: 2000,
            opciones_venta: [{ tipo: 'botella', precio: 4000, comision: 2000 }]
          }
        ]}
        onAdd={add}
      />
    );
    const button = screen.getByRole('button', { name: 'Agregar producto' });
    expect(button).toBeEnabled();
    fireEvent.click(button);
    expect(add).toHaveBeenCalledWith(expect.objectContaining({ selectedHostesses: [] }));
  });
  it('conserva cantidad y tipo de venta al alternar tabla y tarjetas y permite agregar', () => {
    const add = vi.fn();
    render(<Harness productos={[product]} onAdd={add} />);
    expect(screen.getByRole('table')).toBeInTheDocument();
    const photo = screen.getByRole('img', { name: product.nombre });
    expect(photo).toHaveAttribute('src', '/api/images/products/producto.webp?sin_fondo=1&recorte=2');
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
      expect.objectContaining({
        id: product.id,
        tipo_venta: 'shot',
        shot_anfitriona: false,
        precio: 1000
      })
    );
    fireEvent.click(screen.getByRole('radio', { name: 'Ver como tabla' }));
    expect(screen.getByRole('table')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Agregar producto' }));
    expect(add).toHaveBeenLastCalledWith(
      expect.objectContaining({ tipo_venta: 'shot', precio: 1000 })
    );
  });

  it('ofrece el shot al precio de anfitriona cuando está configurado', () => {
    const add = vi.fn();
    const conAnfitriona = {
      ...product,
      opciones_venta: [
        { tipo: 'botella', precio: 4000, comision: 0 },
        { tipo: 'shot', precio: 1000, comision: 0, precio_anfitriona: 800 }
      ]
    };
    render(<Harness productos={[conAnfitriona]} onAdd={add} />);

    // Con precio de anfitriona el shot se parte en dos opciones, cada una con su precio.
    expect(
      screen.getByRole('button', { name: /^Shot cliente · 50 ml · \$1\.000$/ })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /^Shot anfitriona · 50 ml · \$800$/ })
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /^Shot anfitriona/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Agregar producto' }));

    // Sigue siendo un shot por ml, solo cambia el precio que se cobra: la marca viaja
    // al detalle de la venta para poder separarlo en reportes y cierre de caja.
    expect(add).toHaveBeenLastCalledWith(
      expect.objectContaining({ tipo_venta: 'shot', shot_anfitriona: true, precio: 800 })
    );
  });

  it('mantiene una sola opción de shot cuando no hay precio de anfitriona', () => {
    render(<Harness productos={[product]} onAdd={vi.fn()} />);
    expect(screen.getByRole('button', { name: /^Shot · 50 ml · \$1\.000$/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Shot anfitriona/ })).not.toBeInTheDocument();
  });

  const conComisiones = {
    ...product,
    opciones_venta: [
      { tipo: 'botella', precio: 4000, comision: 1000 },
      { tipo: 'shot', precio: 1000, comision: 0 }
    ]
  };

  it('oculta el select de anfitrionas cuando el shot no tiene comisión', () => {
    render(<Harness productos={[conComisiones]} onAdd={vi.fn()} />);
    // La botella sí genera comisión: con botella se pide anfitriona.
    expect(screen.queryByText('Sin comisión')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /^Shot · 50 ml/ }));
    // El shot no cobra comisión, así que no se pide anfitriona y se puede agregar.
    expect(screen.getByText('Sin comisión')).toBeInTheDocument();
    expect(screen.queryByText(/anfitrionas est/)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Agregar producto' })).not.toBeDisabled();
  });

  it('ofrece anfitriona opcional al vender el shot con comisión', () => {
    const shotConComision = {
      ...product,
      opciones_venta: [
        { tipo: 'botella', precio: 4000, comision: 0 },
        { tipo: 'shot', precio: 1000, comision: 500 }
      ]
    };
    render(<Harness productos={[shotConComision]} onAdd={vi.fn()} />);
    // La botella no cobra comisión: sin anfitriona y se puede agregar.
    expect(screen.getByText('Sin comisión')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Agregar producto' })).not.toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: /^Shot · 50 ml/ }));
    // El shot ofrece asignación, pero se puede agregar sin anfitriona.
    expect(screen.queryByText('Sin comisión')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Agregar producto' })).toBeEnabled();
  });

  it('el contador «En carrito» separa el shot de cliente del de anfitriona', () => {
    const conAnfitriona = {
      ...product,
      opciones_venta: [
        { tipo: 'botella', precio: 4000, comision: 0 },
        { tipo: 'shot', precio: 1000, comision: 0, precio_anfitriona: 800 }
      ]
    };
    render(
      <Harness
        productos={[conAnfitriona]}
        onAdd={vi.fn()}
        // En el carrito hay shots servidos a precio de anfitriona.
        productosEnCarrito={[
          { id: 'presentation-1', tipo_venta: 'shot', shot_anfitriona: true, cantidad: 2 }
        ]}
      />
    );

    // Viniendo de botella esas unidades no cuentan.
    expect(screen.queryByText(/En carrito/)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /^Shot anfitriona/ }));
    expect(screen.getByText('En carrito · 2')).toBeInTheDocument();

    // El shot de cliente es otra forma de venta: no hereda el contador.
    fireEvent.click(screen.getByRole('button', { name: /^Shot cliente/ }));
    expect(screen.queryByText(/En carrito/)).not.toBeInTheDocument();
  });
});
