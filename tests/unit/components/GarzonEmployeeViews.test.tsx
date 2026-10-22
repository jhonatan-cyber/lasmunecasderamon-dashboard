import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { TipsEmployeeList } from '@/components/tips/TipsEmployeeList';
import { OvertimeEmployeeList } from '@/components/overtime/OvertimeEmployeeList';
import { AttendanceEmployeeList } from '@/components/attendance/AttendanceEmployeeList';
import GarzonPedidosPage from '@/components/waiters/GarzonPedidosPageClient';
import { formatCurrencyCLP } from '@/lib/utils/formatters';

const mocks = vi.hoisted(() => ({ user: vi.fn(), sse: vi.fn() }));
vi.mock('@/hooks/auth/useCurrentUser', () => ({ useCurrentUser: mocks.user }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ back: vi.fn() }) }));
vi.mock('@/hooks/orders/useOrdersSSE', () => ({ useOrdersSSE: mocks.sse }));
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
  mocks.user.mockReturnValue({ user: { id: 1, name: 'Juan', role: 'garzon' }, loading: false });
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

it.each([
  ['propinas', () => <TipsEmployeeList allowedRole='garzon' />],
  ['horas extras', () => <OvertimeEmployeeList allowedRole='garzon' />],
  ['asistencias', () => <AttendanceEmployeeList allowedRole='garzon' />],
  ['pedidos', () => <GarzonPedidosPage />]
] as const)('permite reintentar una carga fallida de %s', async (label, view) => {
  let failed = true;
  const fetcher = vi.fn(async () =>
    failed
      ? Response.json({ success: false }, { status: 500 })
      : Response.json({ success: true, data: [] })
  );
  vi.stubGlobal('fetch', fetcher);
  render(view());
  expect(await screen.findByRole('alert')).toHaveTextContent(label);
  failed = false;
  fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
  await screen.findByText(
    label === 'horas extras'
      ? 'No hay horas extras registradas'
      : label === 'pedidos'
        ? 'No se encontraron pedidos'
        : label === 'propinas'
          ? 'No se encontraron propinas'
          : 'Listado de Asistencias'
  );
  expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  expect(fetcher).toHaveBeenCalledTimes(2);
});

it('suma montos de propinas recibidos como texto y vuelve a la primera página al buscar', async () => {
  const rows = Array.from({ length: 11 }, (_, i) => ({
    id_detalle_propina: i + 1,
    monto: '1000',
    estado: '1',
    codigo_venta: `VENTA-${i}`,
    fecha_crea: '2026-10-01T12:00:00Z'
  }));
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => Response.json({ success: true, data: rows }))
  );
  render(<TipsEmployeeList allowedRole='garzon' />);
  await screen.findByText(formatCurrencyCLP(11000));
  fireEvent.click(screen.getByRole('button', { name: 'Siguiente' }));
  expect(screen.getByText('Página 2 de 2')).toBeInTheDocument();
  fireEvent.change(screen.getByRole('textbox', { name: 'Buscar' }), {
    target: { value: 'VENTA-0' }
  });
  const table = screen.getByRole('table');
  expect(await within(table).findByText('VENTA-0')).toBeInTheDocument();
  expect(within(table).getAllByRole('row')).toHaveLength(2);
});

it('actualiza únicamente el pedido identificado por el evento, usando el id del contrato de la API', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () =>
      Response.json({
        success: true,
        data: [
          {
            id: 'pedido-a',
            codigo: 'COD-A',
            cliente_nombre: 'Ana',
            total: '2000',
            subtotal: '2000',
            estado: '1'
          },
          {
            id: 'pedido-b',
            codigo: 'COD-B',
            cliente_nombre: 'Bea',
            total: '3000',
            subtotal: '3000',
            estado: '1'
          }
        ]
      })
    )
  );
  render(<GarzonPedidosPage />);
  const rowA = (await screen.findByText('COD-A')).closest('tr')!;
  const rowB = screen.getByText('COD-B').closest('tr')!;
  expect(within(rowA).getByText('Pendiente')).toBeInTheDocument();
  act(() => mocks.sse.mock.lastCall![0]({ type: 'order-processed', orderId: 'pedido-a' }));
  expect(within(rowA).getByText('Aprobado')).toBeInTheDocument();
  expect(within(rowB).getByText('Pendiente')).toBeInTheDocument();
  expect(screen.getByText(formatCurrencyCLP(5000))).toBeInTheDocument();
});
