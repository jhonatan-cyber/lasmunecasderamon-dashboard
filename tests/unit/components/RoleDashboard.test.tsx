import type { ReactNode } from 'react';
import { Calendar } from 'lucide-react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { RoleDashboard } from '@/components/shared/RoleDashboard';

const mocks = vi.hoisted(() => ({ user: vi.fn(), summary: vi.fn(), refetch: vi.fn() }));
vi.mock('@/hooks/auth/useCurrentUser', () => ({ useCurrentUser: mocks.user }));
vi.mock('@/hooks/statistics/useDashboardSummary', () => ({ useDashboardSummary: mocks.summary }));
vi.mock('boneyard-js/react', () => ({
  Skeleton: ({ children }: { children: ReactNode }) => children
}));
vi.mock('@/components/attendance/MarcarAsistenciaCard', () => ({
  MarcarAsistenciaCard: () => <p>Registrar asistencia manual</p>
}));

const props = {
  role: 'anfitriona',
  roleLabel: 'Anfitriona',
  subtitle: 'Panel personal',
  skeletonName: 'test',
  items: [
    {
      title: 'Asistencia',
      description: 'Mis asistencias',
      icon: Calendar,
      href: '/hostess-attendance',
      color: 'text-blue-600',
      countKey: 'totalAsistencias' as const
    }
  ]
};
const summary = { totalACobrar: 12000, totalAsistencias: 3 };

beforeEach(() => {
  vi.clearAllMocks();
  mocks.user.mockReturnValue({
    user: { id: 1, name: 'Ana', lastName: 'Prueba', role: 'anfitriona' },
    loading: false
  });
});
afterEach(cleanup);

it('muestra carga mientras llega el resumen y después presenta los datos, sin un error intermedio', () => {
  mocks.summary.mockReturnValue({
    data: undefined,
    isLoading: true,
    error: null,
    refetch: mocks.refetch
  });
  const { rerender } = render(<RoleDashboard {...props} />);
  expect(screen.getByRole('status')).toHaveTextContent('Cargando dashboard');
  expect(screen.queryByText('Error al cargar el dashboard')).not.toBeInTheDocument();
  mocks.summary.mockReturnValue({
    data: summary,
    isLoading: false,
    error: null,
    refetch: mocks.refetch
  });
  rerender(<RoleDashboard {...props} />);
  expect(screen.queryByRole('status')).not.toBeInTheDocument();
  expect(screen.getByRole('link', { name: /Asistencia/ })).toHaveTextContent('3');
  expect(screen.getByText(/12.000/)).toBeInTheDocument();
  expect(screen.queryByText('Registrar asistencia manual')).not.toBeInTheDocument();
});

it('conserva el error y la acción de reintentar cuando la consulta falla sin datos', () => {
  mocks.summary.mockReturnValue({
    data: undefined,
    isLoading: false,
    error: new Error('Servidor sin respuesta'),
    refetch: mocks.refetch
  });
  render(<RoleDashboard {...props} />);
  expect(screen.getByText('Error al cargar el dashboard')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
  expect(mocks.refetch).toHaveBeenCalledOnce();
});

it('mantiene los últimos datos si falla una actualización en segundo plano', () => {
  mocks.summary.mockReturnValue({
    data: summary,
    isLoading: false,
    error: new Error('Red no disponible'),
    refetch: mocks.refetch
  });
  render(<RoleDashboard {...props} />);
  expect(screen.getByRole('link', { name: /Asistencia/ })).toBeInTheDocument();
  expect(screen.queryByText('Error al cargar el dashboard')).not.toBeInTheDocument();
});
