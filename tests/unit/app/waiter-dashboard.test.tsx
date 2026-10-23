import type { ReactNode } from 'react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import GarzonDashboard from '@/app/waiter-dashboard/page';

vi.mock('@/hooks/auth/useCurrentUser', () => ({
  useCurrentUser: () => ({
    user: { id: 1, name: 'Ana', lastName: 'Prueba', role: 'garzon' },
    loading: false
  })
}));
vi.mock('@/hooks/statistics/useDashboardSummary', () => ({
  useDashboardSummary: () => ({
    data: { totalACobrar: 12000, totalPedidos: 2 },
    isLoading: false,
    error: null,
    refetch: vi.fn()
  })
}));
vi.mock('boneyard-js/react', () => ({
  Skeleton: ({ children }: { children: ReactNode }) => children
}));
vi.mock('@/components/attendance/MarcarAsistenciaCard', () => ({
  MarcarAsistenciaCard: () => <p>Registrar asistencia manual</p>
}));

beforeEach(() => {
  vi.clearAllMocks();
});
afterEach(cleanup);

it('muestra Entradas como card con enlace al módulo, como los otros módulos de garzon', () => {
  render(<GarzonDashboard />);

  const entrada = screen.getByRole('link', { name: /Entradas/ });
  expect(entrada).toHaveAttribute('href', '/tickets');
  expect(screen.getByRole('link', { name: /Pedidos/ })).toHaveAttribute('href', '/orders');
});
