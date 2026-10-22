import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import CriticalMetrics from '@/components/dashboard/CriticalMetrics';
import { buildCajaStatsResult } from '@/modules/reportes/dashboard/builders';

const harness = vi.hoisted(() => ({ result: {} as any }));
vi.mock('@/hooks/statistics/useDashboardComposite', () => ({
  useDashboardComposite: () => harness.result
}));
afterEach(cleanup);

function show(opening: number, cash: number, card: number, transfer: number) {
  harness.result = {
    isLoading: false,
    data: {
      cajaStats: buildCajaStatsResult({
        cajaId: 'qa',
        cajaRow: {
          monto_apertura: opening,
          efectivo: cash,
          tarjeta: card,
          transferencia: transfer
        },
        cajaStats: {
          total_ventas: 0,
          cantidad_ventas: 0,
          total_servicios: 0,
          cantidad_servicios: 0
        }
      }),
      insights: { comparisons: {}, localStatus: { orders: {}, services: {} } }
    }
  };
  render(<CriticalMetrics />);
}

it('muestra el fondo inicial separado y lo excluye del flujo de caja', () => {
  show(100000, 20000, 5000, 3000);
  const openingCard = screen.getByText('Monto de apertura').parentElement!;
  const movementCard = screen.getByText('Flujo de Caja').parentElement!;
  expect(within(openingCard).getByText(/100.000/)).toBeInTheDocument();
  expect(within(movementCard).getByText(/28.000/)).toBeInTheDocument();
  expect(within(movementCard).queryByText(/128.000/)).not.toBeInTheDocument();
});

it('no presenta la apertura como movimiento cuando todavía no hay operaciones', () => {
  show(100000, 0, 0, 0);
  expect(
    within(screen.getByText('Flujo de Caja').parentElement!).getByRole('heading')
  ).toHaveTextContent('$0');
});
