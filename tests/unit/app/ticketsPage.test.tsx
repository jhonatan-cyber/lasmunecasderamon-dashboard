import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import EntradasPage from '@/app/tickets/page';

const mocks = vi.hoisted(() => ({ fetch: vi.fn() }));

vi.mock('@/hooks/cash-register/useCashRegisterStatus', () => ({
  useCashRegisterStatus: () => ({ hasOpenCaja: true })
}));
vi.mock('@/hooks/auth/useUserPermissions', () => ({
  useUserPermissions: () => ({ hasPermission: () => true })
}));
vi.mock('@/hooks/realtime/useRealtimeRefresh', () => ({ useRealtimeRefresh: vi.fn() }));
vi.mock('@/hooks/shared/useConfigValue', () => ({
  useConfigValue: (_group: string, _key: string, defaultValue: number) => defaultValue
}));
vi.mock('@/components/shared/BaucherFileInput', () => ({ BaucherFileInput: () => null }));
vi.mock('@/components/shared/BaucherFoto', () => ({ BaucherFoto: () => null }));
vi.mock('@/components/sales/CajaStatusBanner', () => ({ CajaStatusBanner: () => null }));
vi.mock('@/components/shared/MetricCard', () => ({
  MetricCard: ({ label }: { label: string }) => <div>{label}</div>
}));
vi.mock('@/components/bar/EntregaCoversDialog', () => ({
  EntregaCoversDialog: ({ grupo }: { grupo: { filas: { id: string }[] } | null }) =>
    grupo ? (
      <div role='dialog' aria-label='Entrega de covers'>
        {grupo.filas.length} entradas
      </div>
    ) : null
}));

beforeEach(() => {
  vi.clearAllMocks();
  mocks.fetch.mockResolvedValue({
    ok: true,
    json: async () => ({
      success: true,
      data: [
        {
          id: 'entrada-1',
          grupo_registro_id: 'grupo-1',
          cliente_nombre: 'Ana Pérez',
          monto_entrada: 10000,
          monto_bebida_adicional: 0,
          metodo_pago: 'efectivo',
          baucher_foto: null,
          venta_id: null,
          bebida_cover_presentacion_id: null,
          bebida_cover: null,
          bebida_acompanamiento_presentacion_id: null,
          acompanamiento_bebida: null,
          cantidad_productos_cover: 0,
          fecha: '2026-11-25',
          hora: '22:00',
          registrado_por_nombre: 'Cajero',
          cover_estado: 'pendiente',
          anulacion_origen: null,
          cover_entregada_at: null,
          cover_entregada_por_nombre: null
        },
        {
          id: 'entrada-2',
          grupo_registro_id: 'grupo-1',
          cliente_nombre: 'Ana Pérez',
          monto_entrada: 10000,
          monto_bebida_adicional: 0,
          metodo_pago: 'efectivo',
          baucher_foto: null,
          venta_id: null,
          bebida_cover_presentacion_id: null,
          bebida_cover: null,
          bebida_acompanamiento_presentacion_id: null,
          acompanamiento_bebida: null,
          cantidad_productos_cover: 0,
          fecha: '2026-11-25',
          hora: '22:00',
          registrado_por_nombre: 'Cajero',
          cover_estado: 'pendiente',
          anulacion_origen: null,
          cover_entregada_at: null,
          cover_entregada_por_nombre: null
        }
      ]
    })
  });
  vi.stubGlobal('fetch', mocks.fetch);
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

it('muestra una sola acción para entregar el cover y abre el modal compartido', async () => {
  render(<EntradasPage />);

  const entregarCover = await screen.findAllByRole('button', { name: 'Entregar cover' });
  expect(entregarCover).toHaveLength(2);
  expect(screen.queryByRole('button', { name: 'Entrega individual' })).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Entrega grupal' })).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Gestionar' })).not.toBeInTheDocument();

  fireEvent.pointerMove(entregarCover[0]);
  expect(await screen.findByRole('tooltip')).toHaveTextContent('Entregar cover');

  fireEvent.click(entregarCover[0]);
  const modal = screen.getByRole('dialog', { name: 'Entrega de covers' });
  expect(modal).toHaveTextContent('2 entradas');
});

it('muestra el detalle de las entradas sin permitir acciones', async () => {
  render(<EntradasPage />);

  expect(
    await screen.findAllByRole('button', { name: /Solicitar anulación de las pendientes/i })
  ).toHaveLength(2);
  const verDetalle = await screen.findAllByRole('button', { name: 'Ver detalle' });
  fireEvent.click(verDetalle[0]);

  const detalle = await screen.findByRole('dialog');
  expect(within(detalle).getByText('Cliente')).toBeInTheDocument();
  expect(within(detalle).getByText('Método de pago')).toBeInTheDocument();
  expect(within(detalle).getByText('Detalle por entrada')).toBeInTheDocument();
  expect(
    within(detalle).queryByRole('button', { name: /Entregar todas las pendientes/i })
  ).not.toBeInTheDocument();
  expect(
    within(detalle).queryByRole('button', { name: /Solicitar anulación/i })
  ).not.toBeInTheDocument();
  expect(
    within(detalle).queryByRole('button', { name: 'Entregar bebida' })
  ).not.toBeInTheDocument();
});
