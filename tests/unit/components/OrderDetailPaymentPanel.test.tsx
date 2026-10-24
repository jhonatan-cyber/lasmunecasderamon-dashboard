import type { ComponentProps } from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { OrderDetailPaymentPanel } from '@/components/orders/OrderDetailPaymentPanel';

const baseProps: ComponentProps<typeof OrderDetailPaymentPanel> = {
  metodoPago: 'tarjeta',
  setMetodoPago: vi.fn(),
  habitacionesActivas: [{ id: 'room', name: 'Privado 1' }],
  habitacionId: 'room',
  tiempoHabitacion: 90,
  setTiempoHabitacion: vi.fn(),
  propina: 2500,
  propinaOriginal: 2500,
  propinaPct: 10,
  agregarPropina: true,
  setAgregarPropina: vi.fn(),
  clienteId: '',
  clienteSaldo: null,
  totalFinal: 12500,
  orderTotalCommission: 10000
};

function renderPanel(overrides: Partial<typeof baseProps> = {}) {
  return render(<OrderDetailPaymentPanel {...baseProps} {...overrides} />);
}

describe('Cobro de pedido: el cajero elige pago y propina', () => {
  it('conserva la propina que trae el pedido y sigue ajustando la habitación', () => {
    renderPanel();
    expect(screen.getByLabelText('Propina incluida (la eligió el garzón)')).toHaveAttribute(
      'readonly'
    );
    expect(screen.getByLabelText('Habitación')).toHaveAttribute('readonly');
    expect(screen.getByLabelText('Total Comisión')).toHaveAttribute('readonly');
    expect(screen.queryByRole('checkbox')).toBeNull();

    const duration = screen.getByRole('spinbutton', { name: 'Tiempo de uso (minutos)' });
    expect(duration).toHaveValue(90);
    fireEvent.change(duration, { target: { value: '120' } });
    expect(baseProps.setTiempoHabitacion).toHaveBeenCalledWith(120);
  });

  it('permite cambiar el método de pago en el selector', () => {
    renderPanel();
    fireEvent.click(screen.getByRole('button', { name: /método de pago/i }));
    fireEvent.click(screen.getByRole('button', { name: /efectivo/i }));
    expect(baseProps.setMetodoPago).toHaveBeenCalledWith('efectivo');
  });

  it('sin propina del pedido, el cajero la activa con el porcentaje configurado', () => {
    renderPanel({ propina: 0, propinaOriginal: 0, agregarPropina: false, totalFinal: 20000 });
    expect(screen.queryByLabelText(/Propina incluida/)).toBeNull();
    const checkbox = screen.getByRole('checkbox', { name: /agregar propina del 10%/i });
    expect(checkbox).not.toBeChecked();
    fireEvent.click(checkbox);
    expect(baseProps.setAgregarPropina).toHaveBeenCalledWith(true);
  });

  it('ofrece prepago con el saldo del cliente y avisa del pago mixto', () => {
    renderPanel({
      metodoPago: 'prepago',
      clienteId: 'c1',
      clienteSaldo: 5000,
      totalFinal: 12500,
      propina: 0,
      propinaOriginal: 0,
      agregarPropina: false
    });
    expect(screen.getByText(/prepago \(/i)).toBeInTheDocument();
    expect(screen.getByText('Pago mixto')).toBeInTheDocument();
    expect(screen.getByText('Restante:')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('sin saldo del cliente el prepago no aparece en el selector', () => {
    renderPanel({
      metodoPago: 'efectivo',
      clienteId: 'c1',
      clienteSaldo: 0,
      propina: 0,
      propinaOriginal: 0,
      agregarPropina: false
    });
    fireEvent.click(screen.getByRole('button', { name: /método de pago/i }));
    expect(screen.queryByText(/prepago/i)).toBeNull();
  });

  it('un pedido prepago sin saldo avisa al cajero que elija otro método', () => {
    renderPanel({ metodoPago: 'prepago', clienteId: 'c1', clienteSaldo: 0 });
    expect(screen.getByRole('alert')).toHaveTextContent(/no tiene saldo prepago/i);
  });

  it('sin habitacion no ofrece agregarla ni editar tiempo', () => {
    renderPanel({ habitacionId: '' });
    expect(screen.queryByLabelText('Habitación')).toBeNull();
    expect(screen.queryByRole('spinbutton')).toBeNull();
  });
});
