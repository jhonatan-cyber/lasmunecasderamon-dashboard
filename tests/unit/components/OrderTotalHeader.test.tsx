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
