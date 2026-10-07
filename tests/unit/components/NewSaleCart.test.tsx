import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { NewSaleCart } from '@/components/sales/new/NewSaleCart';

afterEach(cleanup);

describe('anfitrionas en el carrito de nueva venta', () => {
  it('resuelve los nombres usando los UUID reales del carrito', () => {
    const id = '1b3a4f92-250b-4daf-bb5e-9809ee4b9088';
    render(
      <NewSaleCart
        productos={[
          {
            nombre: 'Hennessy',
            precio: 160000,
            cantidad: 1,
            subtotal: 160000,
            selectedHostesses: [id]
          }
        ]}
        anfitrionas={[{ id, nick: 'Ana' }]}
        handleCantidadChangeTable={vi.fn()}
        handleRemoveProducto={vi.fn()}
      />
    );
    expect(screen.getByText('Ana')).toBeInTheDocument();
  });
  it('muestra las anfitrionas seleccionadas con IDs numéricos o de texto', () => {
    render(
      <NewSaleCart
        productos={[
          {
            nombre: 'Absolut 750ml',
            categoria: 'Vodka',
            precio: 20000,
            cantidad: 1,
            subtotal: 20000,
            selectedHostesses: [12, '34']
          }
        ]}
        anfitrionas={[
          { id: '12', nick: 'Ana' },
          { id_usuario: 34, nick: 'María' }
        ]}
        handleCantidadChangeTable={vi.fn()}
        handleRemoveProducto={vi.fn()}
      />
    );
    expect(screen.getByText('Ana, María')).toBeInTheDocument();
    expect(screen.queryByText('N/A')).not.toBeInTheDocument();
  });
  it('muestra N/A cuando no se han seleccionado anfitrionas', () => {
    render(
      <NewSaleCart
        productos={[{ nombre: 'Agua', precio: 3000, cantidad: 1, subtotal: 3000 }]}
        anfitrionas={[]}
        handleCantidadChangeTable={vi.fn()}
        handleRemoveProducto={vi.fn()}
      />
    );
    expect(screen.getByText('N/A')).toBeInTheDocument();
  });
});
