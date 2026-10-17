import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import RoomSelect from '@/components/shared/selects/RoomSelect';

afterEach(cleanup);

it('muestra todas las habitaciones y conserva los bloqueos de selección en una lista con scroll', () => {
  const onChange = vi.fn();
  render(
    <RoomSelect
      habitaciones={Array.from({ length: 24 }, (_, i) => ({
        id: String(i),
        name: `Habitación ${i}`,
        status: i === 0 ? 0 : i === 1 ? 2 : 1,
        price: 100,
        time: 30,
        display_order: i
      }))}
      excludeStatuses={[0]}
      requireCompleteConfig
      value=''
      onChange={onChange}
    />
  );
  fireEvent.click(screen.getByRole('button'));
  const list = screen.getByRole('region', { name: 'Lista de habitaciones' });
  expect(list).toHaveStyle({ overflowY: 'scroll' });
  expect(screen.getAllByRole('button', { name: /^Habitación \d/ })).toHaveLength(24);
  expect(screen.getByText('Habitación 0').closest('button')).toBeDisabled();
  expect(screen.getByText('Habitación 1').closest('button')).toBeDisabled();
  fireEvent.click(screen.getByText('Habitación 23').closest('button')!);
  expect(onChange).toHaveBeenCalledWith('23');
});
const rooms = [
  { id: 'a', name: 'Alfa', display_order: 3, status: 1 },
  { id: 'z', name: 'Zeta', display_order: 1, status: 1 },
  { id: 'm', name: 'Medio', display_order: 2, status: 1 }
];
const options = () =>
  screen
    .getAllByRole('button')
    .filter(button => /^(Alfa|Zeta|Medio)/.test(button.textContent ?? ''))
    .map(button => button.textContent?.replace('LIBRE', ''));

it('usa el orden manual y recibe los cambios de posición sin ordenar por nombre', () => {
  const { rerender } = render(<RoomSelect habitaciones={rooms} value='' onChange={vi.fn()} />);
  fireEvent.click(screen.getByRole('button'));
  expect(options()).toEqual(['Zeta', 'Medio', 'Alfa']);
  rerender(
    <RoomSelect
      habitaciones={rooms.map(room => ({ ...room, display_order: 4 - room.display_order }))}
      value=''
      onChange={vi.fn()}
    />
  );
  expect(options()).toEqual(['Alfa', 'Medio', 'Zeta']);
});

it('mantiene el orden de la API si no hay posiciones y filtra sin reordenar', () => {
  render(
    <RoomSelect
      habitaciones={[rooms[1], rooms[2], rooms[0]].map(({ display_order, ...room }) => room)}
      value=''
      onChange={vi.fn()}
    />
  );
  fireEvent.click(screen.getByRole('button'));
  expect(options()).toEqual(['Zeta', 'Medio', 'Alfa']);
  fireEvent.change(screen.getByLabelText('Buscar habitación'), { target: { value: 'a' } });
  expect(options()).toEqual(['Zeta', 'Alfa']);
});
