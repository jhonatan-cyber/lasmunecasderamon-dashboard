import { afterEach, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { OrderBaucherPanel } from '@/components/orders/OrderBaucherPanel';

afterEach(cleanup);

it('pide la foto del baucher del pedido al endpoint autenticado', () => {
  render(<OrderBaucherPanel orderId='pedido-1' codigo='ABC123' />);

  expect(screen.getByText('Baucher de la transferencia')).toBeInTheDocument();
  expect(screen.getByRole('img', { name: 'Baucher de Pedido ABC123' })).toHaveAttribute(
    'src',
    '/api/orders/pedido-1/baucher'
  );
  expect(screen.getByRole('link', { name: /Ver completa/ })).toHaveAttribute(
    'href',
    '/api/orders/pedido-1/baucher'
  );
});

it('usa el id del pedido cuando el detalle no trae código', () => {
  render(<OrderBaucherPanel orderId='pedido-2' />);

  expect(screen.getByRole('img', { name: 'Baucher de Pedido pedido-2' })).toBeInTheDocument();
});
