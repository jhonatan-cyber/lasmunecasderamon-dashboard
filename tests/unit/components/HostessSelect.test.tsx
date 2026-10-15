import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import HostessSelect from '@/components/shared/selects/HostessSelect';

afterEach(cleanup);

const anfitrionas = [
  { id_usuario: '1', nick: 'Lola', estado_servicio: 0 },
  { id_usuario: '2', nick: 'Sami', estado_servicio: 1 }
];

it('muestra las ocupadas sin permitir seleccionarlas al crear un servicio', async () => {
  const onChange = vi.fn();
  render(<HostessSelect anfitrionas={anfitrionas} value={[]} onChange={onChange} showAvailability showOccupied />);
  fireEvent.click(screen.getByRole('button'));
  expect(await screen.findByText('Sami')).toBeVisible();
  expect(screen.getByText('Ocupada')).toBeVisible();
  const checkboxes = screen.getAllByRole('checkbox');
  expect(checkboxes[1]).toBeDisabled();
  fireEvent.click(checkboxes[0]);
  expect(onChange).toHaveBeenCalledWith(['1']);
});

it('conserva el filtro de libres para los selectores existentes', async () => {
  render(<HostessSelect anfitrionas={anfitrionas} value={[]} onChange={vi.fn()} showAvailability />);
  fireEvent.click(screen.getByRole('button'));
  expect(await screen.findByText('Lola')).toBeVisible();
  expect(screen.queryByText('Sami')).not.toBeInTheDocument();
});
