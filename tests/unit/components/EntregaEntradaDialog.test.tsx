import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { EntregaEntradaDialog } from '@/components/entradas/EntregaEntradaDialog';

const { toastSuccess, toastError } = vi.hoisted(() => ({
  toastSuccess: vi.fn(),
  toastError: vi.fn()
}));

vi.mock('sonner', () => ({ toast: { success: toastSuccess, error: toastError } }));
vi.mock('@/hooks/shared/useConfigValue', () => ({
  useConfigValue: (_categoria: string, clave: string, respaldo: number) =>
    clave === 'monto_base_trago_cover_cliente' ? 3000 : respaldo
}));
vi.mock('@/components/shared/ProductPhoto', () => ({ ProductPhoto: () => null }));

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('EntregaEntradaDialog', () => {
  it('marca la bebida sobre el tope como venta en barra', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: [
            {
              presentacion_id: 'p1',
              producto_nombre: 'Whisky',
              presentacion_nombre: '700 ml',
              precio_venta: 9000,
              stock_bar: 1,
              categoria_nombre: 'Licores',
              opciones_venta: [{ tipo: 'botella', precio: 9000 }]
            }
          ]
        })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: { tipo: 'upgrade', montoCobrarBarra: 0 }
        })
      });
    vi.stubGlobal('fetch', fetchMock);

    render(
      <EntregaEntradaDialog
        entrada={{
          id: 'entrada-1',
          cliente_nombre: 'Cliente',
          monto_entrada: 10000,
          hora: '21:30'
        }}
        onClose={vi.fn()}
      />
    );

    fireEvent.click(await screen.findByRole('button', { name: /Whisky/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar entrega' }));

    await waitFor(() => expect(toastSuccess).toHaveBeenCalledWith('Venta en barra registrada'));
    expect(toastError).not.toHaveBeenCalled();
    expect(fetchMock).toHaveBeenLastCalledWith(
      '/api/tickets/entrada-1/entregar',
      expect.objectContaining({ method: 'POST' })
    );
  });
});
