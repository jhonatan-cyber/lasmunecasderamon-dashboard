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
  it('permite elegir dos anfitrionas para dos cervezas y envía ambas al agregar', () => {
    const onAdd = vi.fn();
    const hostesses = [1, 2, 3].map(id => ({ id, nombre: `Anfitriona ${id}` }));
    function Harness() {
      const [selections, setSelections] = React.useState<string[]>([]);
      return (
        <table><tbody><CategoryProductRow
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
        /></tbody></table>
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
