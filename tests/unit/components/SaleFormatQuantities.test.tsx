import { fireEvent, render, screen } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { SaleFormatQuantities } from '@/components/sales/SaleFormatQuantities';

it('aplica el tono de la opción y conserva los controles de cantidad', () => {
  const onChange = vi.fn();
  const label = 'Corto anfitriona · 20 ml';
  render(
    <SaleFormatQuantities
      options={[
        {
          value: 'shot_anfitriona',
          label,
          precio: 10000,
          comision: 1000,
          cantidad: 1,
          maxCantidad: 5
        }
      ]}
      onChange={onChange}
      dense
      optionClassName='border-amber-200/70 bg-amber-50/80 dark:bg-amber-500/10'
    />
  );

  const card = screen.getByText(label).parentElement?.parentElement;

  expect(card).toHaveClass('border-amber-200/70', 'bg-amber-50/80', 'dark:bg-amber-500/10');
  expect(card).not.toHaveClass('bg-white', 'dark:bg-neutral-950');

  fireEvent.click(screen.getByRole('button', { name: `${label}: disminuir cantidad` }));
  fireEvent.click(screen.getByRole('button', { name: `${label}: aumentar cantidad` }));

  expect(onChange).toHaveBeenNthCalledWith(1, 'shot_anfitriona', 0);
  expect(onChange).toHaveBeenNthCalledWith(2, 'shot_anfitriona', 2);
});
