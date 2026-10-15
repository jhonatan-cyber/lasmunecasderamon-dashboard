import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { AdvancesEmployeeList } from '@/components/advances/AdvancesEmployeeList';

const mocks = vi.hoisted(() => ({ user: vi.fn(), captureException: vi.fn() }));
vi.mock('@/hooks/auth/useCurrentUser', () => ({ useCurrentUser: mocks.user }));
vi.mock('@/lib/utils/logger', () => ({ default: { captureException: mocks.captureException } }));

const delivered = {
  id_anticipo: 1,
  monto: 8000,
  motivo: 'Transporte entregado',
  estado: 0,
  fecha_crea: '2026-10-01T12:00:00Z',
  fecha_mod: '2026-10-02T12:00:00Z'
};
const requested = {
  id_anticipo: 2,
  monto: 5000,
  motivo: 'Solicitud para transporte',
  estado: 2,
  fecha_crea: '2026-10-03T12:00:00Z'
};

beforeEach(() => {
  mocks.user.mockReturnValue({
    user: { id: 1, name: 'Ana', lastName: 'Prueba', role: 'anfitriona' },
    loading: false
  });
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

it('separa los entregados de las solicitudes y carga el formulario al abrir su pestaña', async () => {
  const fetcher = vi.fn(async (url: string) =>
    Response.json({
      success: true,
      data: url.endsWith('/maximo')
        ? { monto_maximo: 10000, tiene_solicitud_pendiente: true }
        : url.endsWith('/solicitudes')
          ? [requested]
          : [delivered, requested]
    })
  );
  vi.stubGlobal('fetch', fetcher);
  render(<AdvancesEmployeeList allowedRole='anfitriona' title='Mis anticipos' />);
  const table = await screen.findByRole('table', { name: 'Anticipos entregados' });
  await within(table).findByText('Transporte entregado');
  expect(within(table).queryByText('Solicitud para transporte')).not.toBeInTheDocument();
  expect(screen.queryByRole('form', { name: 'Solicitar anticipo' })).not.toBeInTheDocument();
  expect(fetcher.mock.calls.some(([url]) => url.endsWith('/solicitudes'))).toBe(false);
  fireEvent.mouseDown(screen.getByRole('tab', { name: 'Solicitudes' }), {
    button: 0,
    ctrlKey: false
  });
  expect(await screen.findByRole('form', { name: 'Solicitar anticipo' })).toBeInTheDocument();
  await screen.findByText('Solicitud para transporte');
  expect(screen.queryByRole('table', { name: 'Anticipos entregados' })).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Solicitar anticipo' })).toBeDisabled();
  fireEvent.mouseDown(screen.getByRole('tab', { name: 'Entregados' }), {
    button: 0,
    ctrlKey: false
  });
  expect(await screen.findByRole('table', { name: 'Anticipos entregados' })).toBeInTheDocument();
});

it('muestra y permite reintentar un error real en lugar de presentar un historial vacío', async () => {
  let failed = true;
  vi.stubGlobal(
    'fetch',
    vi.fn(async () =>
      failed
        ? Response.json(
            { success: false, message: 'No se pudieron cargar los anticipos.' },
            { status: 500 }
          )
        : Response.json({ success: true, data: [delivered] })
    )
  );
  render(<AdvancesEmployeeList allowedRole='anfitriona' />);
  await screen.findByRole('alert');
  expect(screen.queryByText('No hay anticipos para mostrar')).not.toBeInTheDocument();
  failed = false;
  fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
  expect(await screen.findByText('Transporte entregado')).toBeInTheDocument();
});

it.each(['cajero', 'barman', 'garzon'])(
  'permite abrir las solicitudes propias de %s como en Expo',
  async role => {
    mocks.user.mockReturnValue({ user: { id: 2, name: 'Luis', role }, loading: false });
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) =>
        Response.json({
          success: true,
          data: url.endsWith('/maximo')
            ? { monto_maximo: 10000, tiene_solicitud_pendiente: false }
            : url.endsWith('/user')
              ? [delivered, requested]
              : [requested]
        })
      )
    );
    render(<AdvancesEmployeeList allowedRole={role} />);
    expect(await screen.findByText('Transporte entregado')).toBeInTheDocument();
    expect(screen.queryByText('Solicitud para transporte')).not.toBeInTheDocument();
    fireEvent.mouseDown(screen.getByRole('tab', { name: 'Solicitudes' }), {
      button: 0,
      ctrlKey: false
    });
    expect(await screen.findByRole('form', { name: 'Solicitar anticipo' })).toBeInTheDocument();
    expect(await screen.findByText('Solicitud para transporte')).toBeInTheDocument();
  }
);
