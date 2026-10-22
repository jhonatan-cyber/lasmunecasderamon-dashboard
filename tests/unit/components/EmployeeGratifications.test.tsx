import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { AttendanceEmployeeList } from '@/components/attendance/AttendanceEmployeeList';
const mocks = vi.hoisted(() => ({ user: vi.fn() }));
vi.mock('@/hooks/auth/useCurrentUser', () => ({ useCurrentUser: mocks.user }));
vi.mock('@/components/attendance/AsistenciaForm', () => ({ default: () => null }));
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
beforeEach(() =>
  mocks.user.mockReturnValue({ user: { id: 1, name: 'Ana', role: 'anfitriona' }, loading: false })
);
it.each(['cajero', 'barman', 'garzon', 'anfitriona'])(
  'carga las gratificaciones propias de %s desde asistencias',
  async role => {
    mocks.user.mockReturnValue({ user: { id: 1, name: 'Ana', role }, loading: false });
    const fetcher = vi.fn(async (url: string) =>
      Response.json({
        success: true,
        data:
          url === '/api/gratifications/me'
            ? [
                {
                  id: 'g1',
                  fecha_hora: '2026-10-14T12:00:00Z',
                  descripcion: 'Bono propio',
                  monto: '10000',
                  estado_texto: 'Entregado'
                }
              ]
            : []
      })
    );
    vi.stubGlobal('fetch', fetcher);
    render(<AttendanceEmployeeList allowedRole={role} />);
    fireEvent.mouseDown(screen.getByRole('tab', { name: 'Gratificaciones' }), {
      button: 0,
      ctrlKey: false
    });
    const table = await screen.findByRole('table', { name: 'Mis gratificaciones' });
    expect(within(table).getByText('Bono propio')).toBeInTheDocument();
    expect(fetcher.mock.calls.some(([url]) => url === '/api/gratifications/me')).toBe(true);
  }
);
it('reintenta un fallo de gratificaciones sin mostrar una tabla vacía', async () => {
  let failed = true;
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string) =>
      url.includes('gratifications') && failed
        ? Response.json({ success: false }, { status: 500 })
        : Response.json({ success: true, data: [] })
    )
  );
  render(<AttendanceEmployeeList allowedRole='anfitriona' />);
  fireEvent.mouseDown(screen.getByRole('tab', { name: 'Gratificaciones' }), {
    button: 0,
    ctrlKey: false
  });
  await screen.findByRole('alert');
  expect(screen.queryByText('No hay gratificaciones para mostrar')).not.toBeInTheDocument();
  failed = false;
  fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
  expect(await screen.findByText('No hay gratificaciones para mostrar')).toBeInTheDocument();
});
