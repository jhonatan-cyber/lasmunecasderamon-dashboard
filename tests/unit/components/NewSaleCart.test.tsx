import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { NewSaleCart } from '@/components/sales/new/NewSaleCart';

afterEach(cleanup);
vi.mock('@/hooks/shared/useConfigValue', () => ({ useConfigValue: () => 50 }));

describe('anfitrionas en el carrito de nueva venta', () => {
  it.each([
    ['botella', false, { unidades: 3 }, 'Total: 6 unidades'],
    ['shot', false, { unidades: 1 }, 'Total: 2 unidades'],
    ['shot', true, { ml_por_corto: 150 }, 'Total: 300 ml']
  ])(
    'muestra formato, presentación, bebida y consumo para %s (anfitriona: %s)',
    (tipo, hostess, consumption, total) => {
      render(
        <NewSaleCart
          productos={[
            {
              nombre: 'Whisky 750 ml',
              producto_nombre: 'Whisky',
              presentacion_nombre: '750 ml',
              categoria: 'Licores',
              tipo_venta: tipo,
              shot_anfitriona: hostess,
              cantidad: 2,
              precio: 10000,
              subtotal: 20000,
              comision: 1000,
              selectedHostesses: ['ana'],
              ml_shot: 50,
              ml_shot_anfitriona: 40,
              [tipo === 'botella' ? 'acompanamiento_botella' : 'acompanamiento_corto']: {
                presentacion_id: 'sprite',
                nombre: 'Sprite 350 ml',
                ...(consumption as object)
              }
            }
          ]}
          anfitrionas={[{ id: 'ana', nombre: 'Ana' }]}
          handleCantidadChangeTable={vi.fn()}
          handleRemoveProducto={vi.fn()}
        />
      );
      expect(screen.getByText('Detalles de la venta')).toBeInTheDocument();
      expect(
        screen.getByText('Revisa cantidades, bebidas y comisiones antes de generar la venta')
      ).toBeInTheDocument();
      expect(screen.getByText('Whisky')).toBeInTheDocument();
      expect(screen.getByText('750 ml')).toBeInTheDocument();
      expect(screen.getByText('Licores')).toBeInTheDocument();
      expect(screen.getByText('Sprite 350 ml')).toBeInTheDocument();
      expect(screen.getByText(String(total))).toBeInTheDocument();
      if (tipo === 'botella' || hostess) {
        expect(screen.getByText('Ana')).toBeInTheDocument();
        expect(screen.getByText('Comisión total: $2.000')).toBeInTheDocument();
      } else {
        expect(screen.queryByText('Comisión total: $0')).not.toBeInTheDocument();
      }
      if (tipo === 'shot')
        expect(screen.getByText(`Consumo total: ${hostess ? 80 : 100} ml`)).toBeInTheDocument();
    }
  );
  it('resuelve los nombres usando los UUID reales del carrito', () => {
    const id = '1b3a4f92-250b-4daf-bb5e-9809ee4b9088';
    render(
      <NewSaleCart
        productos={[
          {
            nombre: 'Hennessy',
            comision: 1000,
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
            comision: 1000,
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
    expect(screen.getByText('Ana')).toBeInTheDocument();
    expect(screen.getByText('María')).toBeInTheDocument();
    expect(screen.queryByText('N/A')).not.toBeInTheDocument();
  });
  it('oculta las columnas de bebida y anfitrionas cuando no tienen datos', () => {
    render(
      <NewSaleCart
        productos={[{ nombre: 'Agua', precio: 3000, cantidad: 1, subtotal: 3000 }]}
        anfitrionas={[]}
        handleCantidadChangeTable={vi.fn()}
        handleRemoveProducto={vi.fn()}
      />
    );
    expect(screen.queryByRole('columnheader')).not.toBeInTheDocument();
    expect(screen.getByText('Agua')).toBeInTheDocument();
  });

  it('mantiene los controles de cantidad y eliminación en la tarjeta adaptable', () => {
    const handleCantidadChangeTable = vi.fn();
    const handleRemoveProducto = vi.fn();
    render(
      <NewSaleCart
        productos={[{ nombre: 'Agua', precio: 3000, cantidad: 1, subtotal: 3000 }]}
        anfitrionas={[]}
        handleCantidadChangeTable={handleCantidadChangeTable}
        handleRemoveProducto={handleRemoveProducto}
      />
    );

    screen.getByRole('button', { name: 'Aumentar cantidad de Agua' }).click();
    screen.getByRole('button', { name: 'Eliminar Agua' }).click();

    expect(handleCantidadChangeTable).toHaveBeenCalledWith(0, 2);
    expect(handleRemoveProducto).toHaveBeenCalledWith(0);
  });

  it('usa la tabla cuando el ancho del contenedor alcanza para mostrarla completa', () => {
    const originalDescriptor = Object.getOwnPropertyDescriptor(
      HTMLElement.prototype,
      'clientWidth'
    );
    Object.defineProperty(HTMLElement.prototype, 'clientWidth', {
      configurable: true,
      get: () => 2000
    });

    const { unmount } = render(
      <NewSaleCart
        productos={[
          {
            nombre: 'Whisky',
            precio: 10000,
            cantidad: 1,
            subtotal: 10000,
            comision: 1000,
            selectedHostesses: ['ana'],
            acompanamiento_botella: [{ presentacion_id: 'mixer', nombre: 'Bebida', unidades: 1 }]
          }
        ]}
        anfitrionas={[{ id: 'ana', nick: 'Ana' }]}
        handleCantidadChangeTable={vi.fn()}
        handleRemoveProducto={vi.fn()}
      />
    );

    try {
      expect(screen.getByRole('columnheader', { name: 'PRODUCTO' })).toBeInTheDocument();
      expect(screen.getByRole('columnheader', { name: 'BEBIDA' })).toBeInTheDocument();
      expect(screen.getByRole('columnheader', { name: 'ANFITRIONAS' })).toBeInTheDocument();
    } finally {
      unmount();
      if (originalDescriptor) {
        Object.defineProperty(HTMLElement.prototype, 'clientWidth', originalDescriptor);
      } else {
        delete (HTMLElement.prototype as { clientWidth?: number }).clientWidth;
      }
    }
  });
});
