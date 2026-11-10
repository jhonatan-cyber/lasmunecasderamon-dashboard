import { render, screen } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { ConfirmSaleDialog } from '@/components/orders/ConfirmSaleDialog';
import { formatCurrencyCLP } from '@/lib/utils/formatters';

vi.mock('@/hooks/shared/useConfigValue', () => ({
  useConfigValue: (_seccion: string, clave: string) =>
    clave === 'split_tarjeta_propina' ? '49' : '51'
}));

const baseProps = {
  open: true,
  onOpenChange: vi.fn(),
  onCancel: vi.fn(),
  onConfirm: vi.fn(),
  isRegistering: false,
  orderCode: 'PED-0001',
  totalPedido: 10000,
  propina: 1000,
  recargoAnfitrionas: 0,
  total: 11000,
  metodoPago: 'efectivo'
};

it('resume el cobro con total, desglose, pedido y método de pago', () => {
  render(<ConfirmSaleDialog {...baseProps} />);

  expect(screen.getByText('Confirmar registro de venta')).toBeInTheDocument();
  expect(screen.getByText('Total a cobrar')).toBeInTheDocument();
  expect(screen.getAllByText(formatCurrencyCLP(11000)).length).toBeGreaterThan(0);
  expect(screen.getByText(formatCurrencyCLP(10000))).toBeInTheDocument();
  expect(screen.getByText(formatCurrencyCLP(1000))).toBeInTheDocument();
  expect(screen.getByText('PED-0001')).toBeInTheDocument();
  expect(screen.getByText('Efectivo')).toBeInTheDocument();
  expect(screen.queryByText('Tarjetero')).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Confirmar venta' })).toBeEnabled();
  expect(screen.getByRole('button', { name: 'Volver' })).toBeEnabled();
});

it('muestra cliente, habitación con tiempo y el split de tarjeta', () => {
  render(
    <ConfirmSaleDialog
      {...baseProps}
      metodoPago='tarjeta'
      cliente='Camila Rojas'
      habitacion='Suite 2'
      tiempoHabitacion={60}
    />
  );

  expect(screen.getByText('Camila Rojas')).toBeInTheDocument();
  expect(screen.getByText('Suite 2 · 60 min')).toBeInTheDocument();
  expect(screen.getByText('Tarjeta')).toBeInTheDocument();
  expect(screen.getByText('Tarjetero')).toBeInTheDocument();
});

it('bloquea las acciones mientras la venta se está registrando', () => {
  render(<ConfirmSaleDialog {...baseProps} isRegistering />);

  expect(screen.getByRole('button', { name: 'Volver' })).toBeDisabled();
  expect(screen.getByRole('button', { name: /Registrando/ })).toBeDisabled();
});
