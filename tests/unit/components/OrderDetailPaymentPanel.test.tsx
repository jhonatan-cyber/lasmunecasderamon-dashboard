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

describe('Cobro de pedido', () => {
  it('conserva la propina que trae el pedido y muestra la habitación en solo lectura', () => {
    renderPanel();
    expect(screen.getByLabelText('Propina incluida (la eligió el garzón)')).toHaveAttribute(
      'readonly'
    );
    expect(screen.getByLabelText('Habitación')).toHaveAttribute('readonly');
    expect(screen.getByLabelText('Total Comisión')).toHaveAttribute('readonly');
    expect(screen.queryByRole('checkbox')).toBeNull();

    const duration = screen.getByLabelText('Tiempo de uso (minutos)');
    expect(duration).toHaveAttribute('readonly');
    expect(duration).toHaveValue('90');
  });

  it('mantiene el método de pago del pedido y no permite cambiarlo', () => {
    renderPanel();
    const paymentMethod = screen.getByRole('button', { name: /método de pago/i });
    expect(paymentMethod).toBeDisabled();
    expect(
      screen.queryByText(
        'Productos y comisiones son los del pedido. El método de pago y la propina los eliges tú al cobrar.'
      )
    ).not.toBeInTheDocument();
    fireEvent.click(paymentMethod);
    expect(baseProps.setMetodoPago).not.toHaveBeenCalled();
  });

  it('sin propina del pedido muestra el aviso sin ofrecer activarla', () => {
    renderPanel({ propina: 0, propinaOriginal: 0, agregarPropina: false, totalFinal: 20000 });
    expect(screen.queryByLabelText(/Propina incluida/)).toBeNull();
    expect(screen.getByText('Sin propina')).toBeInTheDocument();
    expect(screen.queryByRole('checkbox')).toBeNull();
  });

  it('muestra la propina activa en solo lectura con el porcentaje configurado', () => {
    renderPanel({
      propina: 2000,
      propinaOriginal: 0,
      agregarPropina: true,
      totalFinal: 20000
    });
    const propina = screen.getByLabelText('Propina (10%)');
    expect(propina).toHaveAttribute('readonly');
    expect(propina).toHaveValue('$2.000');
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

  it('un pedido prepago sin saldo avisa que no se puede registrar el cobro', () => {
    renderPanel({ metodoPago: 'prepago', clienteId: 'c1', clienteSaldo: 0 });
    expect(screen.getByRole('alert')).toHaveTextContent(/no se puede registrar el cobro/i);
  });

  it('sin habitacion no ofrece agregarla ni editar tiempo', () => {
    renderPanel({ habitacionId: '' });
    expect(screen.queryByLabelText('Habitación')).toBeNull();
    expect(screen.queryByRole('spinbutton')).toBeNull();
  });
});
