import { fireEvent, render, screen, cleanup, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { UnitLabelSelector } from '@/components/products/UnitLabelSelector';
import { printUnitLabels } from '@/lib/utils/printUnitLabels';

vi.mock('@/lib/utils/printUnitLabels', () => ({ printUnitLabels: vi.fn() }));
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  vi.unstubAllGlobals();
});

describe('seleccion de etiquetas', () => {
  it('imprime solo los codigos seleccionados, sin datos de compra', () => {
    render(
      <UnitLabelSelector
        units={[
          { id: '1', codigo: 'LM-1', codigo_barras: '5901234123457', compra_folio: 'C-0001' },
          { id: '2', codigo: 'LM-2', codigo_barras: '4006381333931' }
        ]}
      />
    );
    expect(screen.getByRole('button', { name: 'Imprimir (0)' })).toBeDisabled();
    fireEvent.click(screen.getByRole('checkbox', { name: 'Seleccionar código 5901234123457' }));
    fireEvent.click(screen.getByRole('button', { name: 'Imprimir (1)' }));
    expect(printUnitLabels).toHaveBeenLastCalledWith([{ code: '5901234123457' }]);
    fireEvent.click(screen.getByRole('button', { name: 'No se imprimieron' }));
    fireEvent.click(screen.getByRole('button', { name: 'Seleccionar todos' }));
    fireEvent.click(screen.getByRole('button', { name: 'Imprimir (2)' }));
    expect(printUnitLabels).toHaveBeenLastCalledWith([
      { code: '5901234123457' },
      { code: '4006381333931' }
    ]);
    fireEvent.click(screen.getByRole('button', { name: 'Limpiar selección' }));
    expect(screen.getByRole('button', { name: 'Imprimir (0)' })).toBeDisabled();
  });

  it('guarda solo el lote confirmado y permite filtrar pendientes', async () => {
    const request = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        data: [{ id: '1', fecha_impresion: '2026-09-22T17:00:00Z' }]
      })
    });
    vi.stubGlobal('fetch', request);
    render(
      <UnitLabelSelector
        units={[
          { id: '1', codigo: 'LM-1', compra_folio: 'C-0001', fecha_crea: '2026-09-22' },
          {
            id: '2',
            codigo: 'LM-2',
            fecha_impresion: '2026-09-21T17:00:00Z',
            fecha_crea: '2026-09-21'
          }
        ]}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: 'Seleccionar pendientes' }));
    fireEvent.click(screen.getByRole('button', { name: 'Imprimir (1)' }));
    expect(request).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Seleccionar todos' }));
    fireEvent.click(screen.getByRole('button', { name: 'Se imprimieron' }));
    await waitFor(() =>
      expect(screen.queryByRole('button', { name: 'Se imprimieron' })).not.toBeInTheDocument()
    );
    expect(request).toHaveBeenCalledWith(
      '/api/products/units/printed',
      expect.objectContaining({ body: JSON.stringify({ ids: ['1'] }) })
    );
    // El filtro es un Select shadcn (Radix): se abre el trigger y se elige la opción.
    fireEvent.click(screen.getByLabelText('Estado de impresión'));
    fireEvent.click(await screen.findByRole('option', { name: 'Pendientes' }));
    expect(screen.getByText('No hay códigos con este estado.')).toBeInTheDocument();
  });

  it('adjunta el producto y la presentación a cada etiqueta impresa', () => {
    render(
      <UnitLabelSelector
        units={[
          {
            id: '1',
            codigo: 'LM-1',
            codigo_barras: '2900000000001',
            producto_nombre: 'Ron Habana',
            presentacion_nombre: 'Botella 750ml'
          }
        ]}
      />
    );

    fireEvent.click(screen.getByRole('checkbox', { name: 'Seleccionar código 2900000000001' }));
    fireEvent.click(screen.getByRole('button', { name: 'Imprimir (1)' }));

    expect(printUnitLabels).toHaveBeenLastCalledWith([
      {
        code: '2900000000001',
        producto_nombre: 'Ron Habana',
        presentacion_nombre: 'Botella 750ml'
      }
    ]);
  });
});
