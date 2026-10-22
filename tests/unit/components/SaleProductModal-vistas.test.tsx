'use client';
import React from 'react';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  Harness,
  presentacionesDePrueba,
  product,
  selectMixer
} from './sale-product-modal-harness';

vi.mock('next/image', () => ({
  default: ({ src, alt, onError }: React.ImgHTMLAttributes<HTMLImageElement>) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} onError={onError} />
  )
}));
vi.mock('@/hooks/shared/useConfigValue', () => ({ useConfigValue: () => 50 }));
vi.mock('@/components/orders', () => ({
  HostessMultiSelect: () => null,
  getActiveHostesses: () => [],
  getChampagneHostessLimit: () => 1,
  hasCommission: () => false,
  isChampagneProduct: () => false,
  getExplicitMaxAnfitrionas: () => null
}));
vi.mock('@/components/shared/selects', () => ({ IndividualHostessSelect: () => null }));

beforeEach(() => vi.stubGlobal('fetch', vi.fn().mockResolvedValue(presentacionesDePrueba)));
afterEach(async () => {
  await act(async () => {});
  cleanup();
  vi.unstubAllGlobals();
});

/**
 * Vistas de `SaleProductModal`: tabla/tarjetas, plegado de detalles y búsqueda
 * de la bebida de acompañamiento. Los formatos de venta y su payload viven en
 * `SaleProductModal.test.tsx`; ambos archivos comparten
 * `./sale-product-modal-harness` y existen separados para no superar el
 * presupuesto de 30 s por archivo (ver `DurationBudgetReporter`).
 */
describe('vistas de productos en nueva venta', () => {
  it('cancelar limpia cantidades y bebidas sin agregar al carrito', async () => {
    const add = vi.fn();
    const close = vi.fn();
    render(<Harness productos={[product]} onAdd={add} onClose={close} />);
    fireEvent.click(screen.getByRole('button', { name: 'Corto · 50 ml: aumentar cantidad' }));
    await selectMixer();
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(close).toHaveBeenCalledTimes(1);
    expect(add).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Agregar producto' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Corto · 50 ml: aumentar cantidad' }));
    expect(screen.getByRole('combobox')).not.toHaveTextContent('Sprite');
    expect(screen.getByRole('button', { name: 'Agregar producto' })).toBeDisabled();
  });

  it('pliega la información, conserva la selección y muestra el importe encima de agregar', async () => {
    const add = vi.fn();
    render(
      <Harness
        productos={[
          {
            ...product,
            categoria: 'Licores',
            producto_nombre: 'Whisky',
            presentacion_nombre: '750 ml',
            modalCantidades: { shot: 2 }
          }
        ]}
        onAdd={add}
      />
    );
    await selectMixer();
    const amount = screen.getByText('$2.000');
    const button = screen.getByRole('button', { name: 'Agregar producto' });
    expect(amount.compareDocumentPosition(button) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: `Ocultar detalles de ${product.nombre}` }));
    expect(screen.getByText('Licores')).toBeInTheDocument();
    expect(screen.getByText('Whisky')).toBeInTheDocument();
    expect(screen.getByText('750 ml')).toBeInTheDocument();
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Agregar producto' })).toBeEnabled();
    fireEvent.click(screen.getByRole('radio', { name: 'Ver como tarjetas' }));
    fireEvent.click(screen.getByRole('button', { name: `Mostrar detalles de ${product.nombre}` }));
    screen
      .getAllByRole('combobox')
      .forEach(selector => expect(selector).toHaveTextContent('Sprite'));
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Agregar producto' }));
    });
    expect(add).toHaveBeenCalledWith(
      expect.objectContaining({
        cantidad: 1,
        acompanamiento_corto: expect.objectContaining({ presentacion_id: 'sprite' })
      })
    );
  });
  it('busca la bebida en el selector shadcn junto al producto', async () => {
    const add = vi.fn();
    render(<Harness productos={[{ ...product, modalCantidades: { shot: 1 } }]} onAdd={add} />);
    await waitFor(() => expect(screen.getByRole('combobox')).toBeEnabled());
    fireEvent.click(screen.getByRole('combobox'));
    const search = await screen.findByPlaceholderText('Buscar bebida o presentación…');
    expect(
      screen.queryByRole('option', { name: /Sin stock|Stock negativo/ })
    ).not.toBeInTheDocument();
    fireEvent.change(search, { target: { value: 'sprite' } });
    expect(screen.queryByRole('option', { name: /Coca-Cola/ })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('option', { name: /Sprite/ }));
    screen
      .getAllByRole('combobox')
      .forEach(selector => expect(selector).toHaveTextContent('Sprite'));
    expect(screen.getByRole('combobox')).toHaveTextContent('Stock: 20 unidades');
    expect(screen.getByRole('img', { name: 'Sprite · 350 ml' })).toHaveAttribute(
      'src',
      '/api/images/products/sprite.webp?sin_fondo=1&recorte=2'
    );
    expect(screen.getByText('Formato y cantidad')).toBeInTheDocument();
    expect(screen.getByText('Bebida')).toBeInTheDocument();
    expect(screen.getByText('Anfitrionas')).toBeInTheDocument();
  });
  it('incluye bebidas con stock cero y ml abiertos suficientes para corto anfitriona', async () => {
    render(
      <Harness
        productos={[
          {
            ...product,
            opciones_venta: [
              {
                tipo: 'shot',
                precio: 1000,
                precio_anfitriona: 800,
                comision: 0,
                ml_acompanamiento_anfitriona: 150
              }
            ],
            modalCantidades: { shot_anfitriona: 1 }
          }
        ]}
        onAdd={vi.fn()}
      />
    );
    await waitFor(() => expect(screen.getByRole('combobox')).toBeEnabled());
    fireEvent.click(screen.getByRole('combobox'));
    expect(await screen.findByRole('option', { name: /Sprite/ })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /Sin stock/ })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: /Stock negativo/ })).not.toBeInTheDocument();
  });
  it('conserva la cantidad del buscador al abrir la selección de bebida', async () => {
    const add = vi.fn();
    render(<Harness productos={[{ ...product, modalCantidades: { shot: 2 } }]} onAdd={add} />);
    await selectMixer();
    expect(screen.getAllByText('Consumo: 1 unidades')).toHaveLength(2);
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Agregar producto' }));
    });
    expect(add).toHaveBeenCalledWith(
      expect.objectContaining({
        cantidad: 1,
        tipo_venta: 'shot',
        acompanamiento_corto: expect.objectContaining({ presentacion_id: 'sprite', unidades: 1 })
      })
    );
  });
  it('conserva cantidades independientes al cambiar de tabla a tarjetas y agrega los formatos elegidos', async () => {
    const add = vi.fn();
    const close = vi.fn();
    render(<Harness productos={[product]} onAdd={add} onClose={close} />);
    expect(screen.getByRole('table')).toBeInTheDocument();
    const photo = screen.getByRole('img', { name: product.nombre });
    expect(photo).toHaveAttribute(
      'src',
      '/api/images/products/producto.webp?sin_fondo=1&recorte=2'
    );
    fireEvent.error(photo);
    expect(photo).toHaveAttribute('src', '/api/images/products/default.png');
    fireEvent.click(screen.getByRole('button', { name: 'Botella: aumentar cantidad' }));
    fireEvent.click(screen.getByRole('button', { name: 'Corto · 50 ml: aumentar cantidad' }));
    await selectMixer();
    fireEvent.click(screen.getByRole('radio', { name: 'Ver como tarjetas' }));
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    expect(screen.getAllByText('1')).toHaveLength(2);
    expect(screen.getByRole('img', { name: product.nombre })).toBeInTheDocument();
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Agregar producto' }));
    });
    expect(add).toHaveBeenCalledTimes(2);
    expect(close).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button', { name: 'Agregar producto' })).toBeDisabled();
    expect(screen.getAllByRole('button', { name: 'Agregar producto' })).toHaveLength(1);
    expect(add).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ id: product.id, tipo_venta: 'botella', precio: 4000, cantidad: 1 })
    );
    expect(add).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        id: product.id,
        tipo_venta: 'shot',
        shot_anfitriona: false,
        precio: 1000,
        cantidad: 1
      })
    );
    fireEvent.click(screen.getByRole('radio', { name: 'Ver como tabla' }));
    expect(screen.getByRole('table')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Agregar producto' })).toBeDisabled();
  });
});
