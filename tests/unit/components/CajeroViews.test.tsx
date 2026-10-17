import BarmanAttendance from '@/app/barman-asistencias/page';
import BarmanAdvances from '@/app/barman-anticipos/page';
import BarmanTips from '@/app/barman-propinas/page';
import BarmanOvertime from '@/app/barman-horas-extras/page';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import DashboardStatsCards from '@/components/dashboard/DashboardStatsCards';
import { TipsEmployeeList } from '@/components/propinas/TipsEmployeeList';
import { OvertimeEmployeeList } from '@/components/overtime/OvertimeEmployeeList';
import { AttendanceEmployeeList } from '@/components/attendance/AttendanceEmployeeList';
import { AdvancesEmployeeList } from '@/components/advances/AdvancesEmployeeList';
const mocks = vi.hoisted(() => ({ user: vi.fn(), summary: vi.fn(), refetch: vi.fn() }));
vi.mock('@/hooks/auth/useCurrentUser', () => ({ useCurrentUser: mocks.user }));
vi.mock('@/hooks/stats/useDashboardSummary', () => ({ useDashboardSummary: mocks.summary }));
vi.mock('@/components/attendance/AsistenciaForm', () => ({ default: () => null }));
vi.mock('@/lib/utils/logger', () => ({
  default: {
    captureException: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn()
  }
}));
beforeEach(() => {
  mocks.user.mockReturnValue({ user: { id: 1, name: 'Cajero', role: 'cajero' }, loading: false });
  mocks.refetch.mockClear();
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
it('conserva las tarjetas del cajero si falla una actualización con datos previos', () => {
  mocks.summary.mockReturnValue({
    data: {
      totalAsistencias: 12,
      totalAnticipos: 3,
      totalPropinas: 4,
      totalHorasExtras: 2,
      totalPedidos: 8
    },
    error: new Error('offline'),
    isLoading: false,
    refetch: mocks.refetch
  });
  render(<DashboardStatsCards />);
  expect(screen.getByRole('link', { name: /Asistencias/ })).toHaveTextContent('12');
  expect(screen.queryByRole('alert')).not.toBeInTheDocument();
});
it('permite reintentar el resumen del cajero si no hay datos', () => {
  mocks.summary.mockReturnValue({
    data: undefined,
    error: new Error('offline'),
    isLoading: false,
    refetch: mocks.refetch
  });
  render(<DashboardStatsCards />);
  expect(screen.getByRole('alert')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
  expect(mocks.refetch).toHaveBeenCalledOnce();
});
it.each([
  ['propinas', () => <TipsEmployeeList allowedRole='cajero' />],
  ['asistencias', () => <AttendanceEmployeeList allowedRole='cajero' />],
  ['horas extras', () => <OvertimeEmployeeList allowedRole='cajero' />],
  ['anticipos', () => <AdvancesEmployeeList allowedRole='cajero' />]
] as const)('recupera el listado de %s del cajero después de un fallo', async (_label, view) => {
  let failed = true;
  const fetcher = vi.fn(async () =>
    failed
      ? Response.json({ success: false }, { status: 500 })
      : Response.json({ success: true, data: [] })
  );
  vi.stubGlobal('fetch', fetcher);
  render(view());
  await screen.findByRole('alert');
  failed = false;
  fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
  await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(2));
  await waitFor(() => expect(screen.queryByRole('alert')).not.toBeInTheDocument());
  expect(screen.queryByText('Acceso Denegado')).not.toBeInTheDocument();
});

it.each([BarmanAttendance, BarmanAdvances, BarmanTips, BarmanOvertime])(
  'carga la vista personal de barman con sus endpoints propios',
  async View => {
    mocks.user.mockReturnValue({ user: { id: 2, name: 'Luis', role: 'barman' }, loading: false });
    const fetcher = vi.fn(async (_url: string) => Response.json({ success: true, data: [] }));
    vi.stubGlobal('fetch', fetcher);
    render(<View />);
    await waitFor(() => expect(fetcher).toHaveBeenCalledOnce());
    await waitFor(() => expect(screen.queryByText('Cargando propinas...')).not.toBeInTheDocument());
    expect(screen.queryByText('Acceso Denegado')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Registrar Manual' })).not.toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(fetcher.mock.calls[0][0]).toMatch(/\/api\/(attendance|anticipos|tips|overtime)\/user/);
  }
);
