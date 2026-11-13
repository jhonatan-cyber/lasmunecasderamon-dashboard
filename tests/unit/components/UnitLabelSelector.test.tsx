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
  it('excluye los codigos retirados o vendidos de la impresion', () => {
    render(
      <UnitLabelSelector
        units={[
          { id: '1', codigo: 'LM-A', codigo_barras: '2900000000001', estado: 'almacen' },
          { id: '2', codigo: 'LM-I', codigo_barras: '2900000000002', estado: 'inactivo' },
          { id: '3', codigo: 'LM-V', codigo_barras: '2900000000003', estado: 'vendida' }
        ]}
      />
    );

    expect(
      screen.queryByRole('checkbox', { name: 'Seleccionar código 2900000000002' })
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('checkbox', { name: 'Seleccionar código 2900000000003' })
    ).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('checkbox', { name: 'Seleccionar código 2900000000001' }));
    fireEvent.click(screen.getByRole('button', { name: 'Imprimir (1)' }));
    expect(printUnitLabels).toHaveBeenLastCalledWith([{ code: '2900000000001' }]);
  });

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

  it('solo muestra la baja manual cuando el detalle la habilita', () => {
    const { unmount } = render(
      <UnitLabelSelector units={[{ id: '1', codigo: 'LM-1', codigo_barras: '2900000000001' }]} />
    );
    expect(screen.queryByRole('button', { name: /Eliminar/ })).not.toBeInTheDocument();
    unmount();

    render(
      <UnitLabelSelector
        units={[{ id: '1', codigo: 'LM-1', codigo_barras: '2900000000001' }]}
        onDelete={vi.fn()}
      />
    );
    expect(screen.getByRole('button', { name: 'Eliminar (0)' })).toBeDisabled();
    expect(
      screen.getByRole('button', { name: 'Eliminar código 2900000000001' })
    ).toBeInTheDocument();
  });

  it('elimina el lote seleccionado o el código individual', () => {
    const onDelete = vi.fn();
    render(
      <UnitLabelSelector
        units={[
          { id: '1', codigo: 'LM-1', codigo_barras: '2900000000001' },
          { id: '2', codigo: 'LM-2', codigo_barras: '2900000000002' }
        ]}
        onDelete={onDelete}
      />
    );

    fireEvent.click(screen.getByRole('checkbox', { name: 'Seleccionar código 2900000000001' }));
    fireEvent.click(screen.getByRole('checkbox', { name: 'Seleccionar código 2900000000002' }));
    fireEvent.click(screen.getByRole('button', { name: 'Eliminar (2)' }));
    expect(onDelete).toHaveBeenLastCalledWith(['1', '2']);

    fireEvent.click(screen.getByRole('button', { name: 'Eliminar código 2900000000002' }));
    expect(onDelete).toHaveBeenLastCalledWith(['2']);
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
