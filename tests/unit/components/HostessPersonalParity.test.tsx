import type { ReactNode } from 'react';
import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import CommissionsPage from '@/app/hostess-commissions/page';
import ServicesPage from '@/components/hostess/AnfitrionaServiciosPageClient';
import { formatCurrencyCLP } from '@/lib/utils/formatters';
vi.mock('@/hooks/auth/useCurrentUser', () => ({
  useCurrentUser: () => ({ user, loading: false })
}));
vi.mock('boneyard-js/react', () => ({
  Skeleton: ({ children }: { children: ReactNode }) => children
}));
vi.mock('@/lib/utils/logger', () => ({
  default: {
    captureException: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn()
  }
}));
const user = { id: 1, name: 'Ana', role: 'anfitriona' };
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
it.each([
  ['comisiones', CommissionsPage],
  ['servicios', ServicesPage]
] as const)(
  'permite recuperar %s sin presentar un historial vacío por error',
  async (label, Page) => {
    let failed = true;
    const fetcher = vi.fn(async () =>
      failed
        ? Response.json({ success: false }, { status: 500 })
        : Response.json({ success: true, data: [] })
    );
    vi.stubGlobal('fetch', fetcher);
    render(<Page />);
    expect(await screen.findByRole('alert')).toHaveTextContent(label);
    failed = false;
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(screen.queryByRole('alert')).not.toBeInTheDocument());
  }
);
it('coincide con Expo al sumar las ventas pagadas y pendientes y excluir anulaciones y servicios', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () =>
      Response.json({
        success: true,
        data: [
          {
            id: 'a',
            codigo: 'VENTA-A',
            monto: '3000',
            estado: '1',
            tipo: 'venta',
            fecha_crea: '2026-10-14T12:00:00Z'
          },
          {
            id: 'b',
            codigo: 'VENTA-B',
            monto: '7000',
            estado: '2',
            tipo: 'venta',
            fecha_crea: '2026-10-14T12:00:00Z'
          },
          {
            id: 'c',
            codigo: 'ANULADA-C',
            monto: '9000',
            estado: '0',
            tipo: 'venta',
            fecha_crea: '2026-10-14T12:00:00Z'
          },
          {
            id: 'd',
            codigo: 'SERVICIO-D',
            monto: '9000',
            estado: '1',
            tipo: 'servicio',
            fecha_crea: '2026-10-14T12:00:00Z'
          }
        ]
      })
    )
  );
  render(<CommissionsPage />);
  expect(await screen.findByText(formatCurrencyCLP(10000))).toBeInTheDocument();
  const table = screen.getByRole('table');
  expect(within(table).getByText('VENTA-A')).toBeInTheDocument();
  expect(within(table).getByText('VENTA-B')).toBeInTheDocument();
  expect(within(table).queryByText('SERVICIO-D')).not.toBeInTheDocument();
});
