import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ExistingPresentacionCard } from '@/components/products/ExistingPresentacionCard';

afterEach(cleanup);

const renderCard = (activa: boolean) => {
  const deleteExistente = vi.fn();
  const agregarStock = vi.fn();
  render(
    <ExistingPresentacionCard
      presentacion={{
        id: 'pres-1',
        producto_id: 'prod-1',
        activa,
        nombre: '750 ml',
        stock: 2
      }}
      isEditing={false}
      editPresDraft={{
        nombre: '',
        codigo_barras: '',
        precio_compra: '',
        precio_venta: '',
        comision: '',
        stock_minimo: '',
        stock_maximo: '',
        stock: '',
        fecha_elaboracion: '',
        duracion_meses: '',
        fecha_vencimiento: ''
      }}
      changeEditPresDraft={vi.fn()}
      cancelEditPres={vi.fn()}
      saveEditPres={vi.fn()}
      guardandoPres={false}
      isLoading={false}
      unidadesCodigos={[]}
      codigosSeleccionados={[]}
      toggleCodigoSeleccionado={vi.fn()}
      startEditPres={vi.fn()}
      deleteExistente={deleteExistente}
      updateExistenteFoto={vi.fn()}
      updateExistenteFotoUrl={vi.fn()}
      stockExtra={{}}
      changeStockExtra={vi.fn()}
      agregarStock={agregarStock}
      agregandoStock={false}
    />
  );
  return { deleteExistente, agregarStock };
};

describe('ExistingPresentacionCard', () => {
  it('muestra el estado inactivo y bloquea borrar o generar más stock', async () => {
    const { agregarStock } = renderCard(false);

    expect(screen.getByText('750 ml (desactivada)')).toBeInTheDocument();
    expect(screen.queryByTitle('Eliminar presentación')).not.toBeInTheDocument();

    fireEvent.click(screen.getByTitle('Expandir'));

    expect(await screen.findByPlaceholderText('Cantidad a agregar')).toBeDisabled();
    const stockButton = screen.getByTitle('Generar códigos para esta presentación');
    expect(stockButton).toBeDisabled();
    fireEvent.click(stockButton);
    expect(agregarStock).not.toHaveBeenCalled();
  });

  it('mantiene borrar y generación de stock disponibles para las activas', async () => {
    const { deleteExistente, agregarStock } = renderCard(true);

    fireEvent.click(screen.getByTitle('Eliminar presentación'));
    expect(deleteExistente).toHaveBeenCalledWith('pres-1');

    fireEvent.click(screen.getByTitle('Expandir'));

    expect(await screen.findByPlaceholderText('Cantidad a agregar')).toBeEnabled();
    const stockButton = screen.getByTitle('Generar códigos para esta presentación');
    expect(stockButton).toBeEnabled();
    fireEvent.click(stockButton);
    expect(agregarStock).toHaveBeenCalledWith('pres-1');
  });
});
