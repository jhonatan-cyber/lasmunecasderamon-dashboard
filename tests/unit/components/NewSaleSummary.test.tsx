import { render, screen } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { NewSaleSummary } from '@/components/sales/new/NewSaleSummary';

vi.mock('@/hooks/shared/useConfigValue', () => ({ useConfigValue: () => '51' }));

it('usa la misma estructura de subtotal, propina y total que el resumen de pedidos', () => {
  const onTipToggle = vi.fn();
  render(
    <NewSaleSummary
      subtotal={10000}
      propina={1000}
      metodoPago='efectivo'
      total={11000}
      loading={false}
      disabled={false}
      onSubmit={vi.fn()}
      enableTip={false}
      onTipToggle={onTipToggle}
    />
  );

  expect(screen.getByText('Subtotal')).toBeInTheDocument();
  expect(screen.getByText('Propina')).toBeInTheDocument();
  expect(screen.getByText('$10.000')).toBeInTheDocument();
  expect(screen.getByText('$11.000')).toBeInTheDocument();
  const tipLabel = screen.getByText(/Propina sugerida/);
  expect(tipLabel).toBeInTheDocument();
  const totalBlock = screen.getByText('Total a pagar').parentElement;
  const tipBlock = tipLabel.parentElement?.parentElement;
  expect(totalBlock?.parentElement).toHaveClass('flex-col');
  expect(totalBlock?.nextElementSibling).toBe(tipBlock);
  screen.getByRole('button', { name: 'Activar propina' }).click();
  expect(onTipToggle).toHaveBeenCalledWith(true);
  expect(screen.getByRole('button', { name: /Generar venta/i })).toBeEnabled();
});
