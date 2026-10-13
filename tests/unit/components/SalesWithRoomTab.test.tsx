import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import SalesWithRoomTab from '@/components/sales/SalesWithRoomTab';
const timers = vi.hoisted(() => []);
vi.mock('@/contexts/TimerContext', () => ({
  useTimer: () => ({ timers, getTimerByServicioId: () => undefined })
}));
vi.mock('@/components/sales/SaleCard', () => ({
  default: ({ venta }: any) => <div>{venta.codigo}</div>
}));
describe('ventas con habitación', () => {
  it('muestra varias ventas de la misma habitación y las pausadas antes de sincronizar timers', () => {
    render(
      <SalesWithRoomTab
        ventas={
          [
            { id: 'a', codigo: 'VENTA-A', habitacion_id: 'libre', estado: 2 },
            { id: 'b', codigo: 'VENTA-B', habitacion_id: 'libre', estado: 2 },
            { id: 'c', codigo: 'PAUSADA', habitacion_id: 'vip', estado: 3 },
            { id: 'd', codigo: 'FINALIZADA', habitacion_id: 'libre', estado: 1 }
          ] as any
        }
        loading={false}
        onRefresh={vi.fn()}
      />
    );
    expect(screen.getByText('VENTA-A')).toBeInTheDocument();
    expect(screen.getByText('VENTA-B')).toBeInTheDocument();
    expect(screen.getByText('PAUSADA')).toBeInTheDocument();
    expect(screen.queryByText('FINALIZADA')).not.toBeInTheDocument();
  });
});
