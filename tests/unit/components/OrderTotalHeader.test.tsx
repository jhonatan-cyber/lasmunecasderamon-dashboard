import { fireEvent, render, screen } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import OrderTotalHeader from '@/components/orders/OrderTotalHeader';
it('bloquea generar un pedido vacío y habilita el botón al agregar productos', () => {
  const onSubmit = vi.fn();
  const { rerender } = render(<OrderTotalHeader total={0} disabled onSubmit={onSubmit} />);
  const button = screen.getByRole('button', { name: /Generar pedido/i });
  expect(button).toBeDisabled();
  fireEvent.click(button);
  expect(onSubmit).not.toHaveBeenCalled();
  rerender(<OrderTotalHeader total={0} disabled={false} onSubmit={onSubmit} />);
  expect(button).toBeEnabled();
  fireEvent.click(button);
  expect(onSubmit).toHaveBeenCalledTimes(1);
});

it('presenta subtotal, propina y total en el resumen compartido', () => {
  render(
    <OrderTotalHeader
      subtotal={10000}
      total={11000}
      tipEnabled
      tipPercentage={10}
      disabled={false}
    />
  );

  expect(screen.getByText('Subtotal')).toBeInTheDocument();
  expect(screen.getByText('Propina')).toBeInTheDocument();
  expect(screen.getByText('$10.000')).toBeInTheDocument();
  expect(screen.getByText('$11.000')).toBeInTheDocument();
});
