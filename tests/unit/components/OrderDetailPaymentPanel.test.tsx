import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { OrderDetailPaymentPanel } from '@/components/orders/OrderDetailPaymentPanel';
const props = {
  metodoPago: 'tarjeta',
  habitacionesActivas: [{ id: 'room', name: 'Privado 1' }],
  habitacionId: 'room',
  tiempoHabitacion: 90,
  setTiempoHabitacion: vi.fn(),
  propina: 2500,
  orderTotalCommission: 10000
};
describe('Pedido de solo lectura', () => {
  it('solo permite editar la duracion de la habitacion guardada', () => {
    render(<OrderDetailPaymentPanel {...props} />);
    for (const label of ['Método de pago', 'Habitación', 'Propina', 'Total Comisión'])
      expect(screen.getByLabelText(label)).toHaveAttribute('readonly');
    expect(screen.queryByRole('combobox')).toBeNull();
    expect(screen.queryByRole('checkbox')).toBeNull();
    const duration = screen.getByRole('spinbutton', { name: 'Tiempo de uso (minutos)' });
    expect(duration).toHaveValue(90);
    fireEvent.change(duration, { target: { value: '120' } });
    expect(props.setTiempoHabitacion).toHaveBeenCalledWith(120);
  });
  it('sin habitacion no ofrece agregarla ni editar tiempo', () => {
    render(<OrderDetailPaymentPanel {...props} habitacionId='' />);
    expect(screen.queryByLabelText('Habitación')).toBeNull();
    expect(screen.queryByRole('spinbutton')).toBeNull();
  });
});
