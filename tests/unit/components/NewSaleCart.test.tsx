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
      expect(screen.getByText('Whisky')).toBeInTheDocument();
      expect(screen.getByText('750 ml')).toBeInTheDocument();
      expect(screen.getByText('Licores')).toBeInTheDocument();
      expect(screen.getByText('Sprite 350 ml')).toBeInTheDocument();
      expect(screen.getByText(String(total))).toBeInTheDocument();
      expect(screen.getByText('Ana')).toBeInTheDocument();
      expect(screen.getByText('Comisión total: $2.000')).toBeInTheDocument();
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
    expect(screen.getByText('Ana')).toBeInTheDocument();
    expect(screen.getByText('María')).toBeInTheDocument();
    expect(screen.queryByText('N/A')).not.toBeInTheDocument();
  });
  it('muestra Sin asignación cuando no se han seleccionado anfitrionas', () => {
    render(
      <NewSaleCart
        productos={[{ nombre: 'Agua', precio: 3000, cantidad: 1, subtotal: 3000 }]}
        anfitrionas={[]}
        handleCantidadChangeTable={vi.fn()}
        handleRemoveProducto={vi.fn()}
      />
    );
    expect(screen.getByText('Sin asignación')).toBeInTheDocument();
  });
});
