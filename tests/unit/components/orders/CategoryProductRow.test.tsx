import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CategoryProductRow } from '@/components/orders/CategoryProductRow';

vi.mock('@/components/orders', async () => ({
  HostessMultiSelect: (await import('@/components/orders/HostessMultiSelect')).default
}));
vi.mock('@/components/shared/selects', () => ({
  IndividualHostessSelect: () => <span>Selector individual</span>,
  RoomSelect: () => null
}));

afterEach(cleanup);

describe('Anfitrionas por cantidad en pedidos', () => {
  it('envía el precio configurado al elegir botella sin anfitriona', () => {
    const onAdd = vi.fn();
    const hostesses = [{ id: 1, nombre: 'Anfitriona 1' }];
    render(
      <table>
        <tbody>
          <CategoryProductRow
            product={{
              id: 'pres',
              id_producto: 'prod',
              presentacion_id: 'pres',
              nombre: 'Botella',
              stock_bar: 2,
              opciones_venta: [
                {
                  tipo: 'botella',
                  precio: 60000,
                  comision: 12000,
                  precio_sin_anfitriona: 45000
                }
              ]
            }}
            cantidades={{ pres: 1 }}
            onCantidadChange={vi.fn()}
            onAgregarProducto={onAdd}
            champagneHostessSelections={{}}
            onChampagneHostessChange={vi.fn()}
            otherProductHostessSelections={{}}
            onOtherProductHostessChange={vi.fn()}
            habitaciones={[]}
            roomSelections={{}}
            onRoomChange={vi.fn()}
            productosCategoria={[]}
            debouncedSearchValues={{}}
            setHostessSearchValues={vi.fn()}
            availableHostesses={hostesses}
            getAvailableHostessesForChampagne={() => hostesses}
            getAvailableHostessesForOtherProducts={() => hostesses}
            requiresRoom={() => false}
          />
        </tbody>
      </table>
    );

    fireEvent.change(screen.getByRole('combobox', { name: 'Anfitriona de botella Botella' }), {
      target: { value: 'sin' }
    });
    fireEvent.click(screen.getByRole('button', { name: 'Agregar producto' }));

    expect(onAdd).toHaveBeenCalledWith(
      expect.objectContaining({
        precio: 45000,
        comision: 0,
        botella_anfitriona: false,
        selectedHostesses: []
      })
    );
  });

  it('permite elegir dos anfitrionas para dos cervezas y envía ambas al agregar', () => {
    const onAdd = vi.fn();
    const hostesses = [1, 2, 3].map(id => ({ id, nombre: `Anfitriona ${id}` }));
    function Harness() {
      const [selections, setSelections] = React.useState<string[]>([]);
      return (
        <table>
          <tbody>
            <CategoryProductRow
              product={{ id: 10, nombre: 'Cerveza', precio: 5000, comision: 1000 }}
              cantidades={{ '10': 2 }}
              onCantidadChange={vi.fn()}
              onAgregarProducto={onAdd}
              champagneHostessSelections={{}}
              onChampagneHostessChange={vi.fn()}
              otherProductHostessSelections={{ '10': selections }}
              onOtherProductHostessChange={(_, ids) => setSelections(ids)}
              habitaciones={[]}
              roomSelections={{}}
              onRoomChange={vi.fn()}
              productosCategoria={[]}
              debouncedSearchValues={{}}
              setHostessSearchValues={vi.fn()}
              availableHostesses={hostesses}
              getAvailableHostessesForChampagne={() => hostesses}
              getAvailableHostessesForOtherProducts={() => hostesses}
              requiresRoom={() => false}
            />
          </tbody>
        </table>
      );
    }
    render(<Harness />);
    fireEvent.click(screen.getByRole('button', { name: /Elegir/ }));
    fireEvent.click(screen.getByRole('checkbox', { name: 'Anfitriona 1' }));
    fireEvent.click(screen.getByRole('checkbox', { name: 'Anfitriona 2' }));
    expect(screen.getByRole('checkbox', { name: 'Anfitriona 3' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Agregar producto' }));
    expect(onAdd).toHaveBeenCalledWith(expect.objectContaining({ selectedHostesses: ['1', '2'] }));
  });
});
