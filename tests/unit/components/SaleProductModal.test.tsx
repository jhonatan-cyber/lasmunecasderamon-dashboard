'use client';
import React from 'react';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
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
 * Formato de venta de `SaleProductModal`: qué viaja en el payload al agregar al
 * carrito. Las vistas (tabla/tarjetas, buscador de bebida) viven en
 * `SaleProductModal-vistas.test.tsx`; ambos archivos comparten
 * `./sale-product-modal-harness` y existen separados para no superar el
 * presupuesto de 30 s por archivo (ver `DurationBudgetReporter`).
 */
it('vende botella sin anfitriona al precio adicional con las bebidas configuradas', async () => {
  const add = vi.fn();
  render(
    <Harness
      productos={[
        {
          ...product,
          opciones_venta: [
            {
              tipo: 'botella',
              precio: 50000,
              comision: 5000,
              precio_sin_anfitriona: 35000,
              acompanamiento: { unidades: 3 }
            }
          ]
        }
      ]}
      onAdd={add}
    />
  );
  fireEvent.click(
    screen.getByRole('button', { name: /Botella sin anfitriona.*aumentar cantidad/ })
  );
  fireEvent.click(
    screen.getByRole('button', { name: /Botella sin anfitriona.*aumentar cantidad/ })
  );
  expect(screen.getByText('Consumo: 6 unidades')).toBeInTheDocument();
  await selectMixer();
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: 'Agregar producto' }));
  });
  expect(add).toHaveBeenCalledExactlyOnceWith(
    expect.objectContaining({
      tipo_venta: 'botella',
      cantidad: 2,
      precio: 35000,
      comision: 0,
      selectedHostesses: [],
      acompanamiento_botella: expect.objectContaining({ presentacion_id: 'sprite', unidades: 3 }),
      acompanamiento_corto: undefined
    })
  );
});

it.each(['botella', 'botella_sin_anfitriona'])(
  'con bebida cero oculta selector y no agrega bebida: %s',
  async format => {
    const add = vi.fn();
    render(
      <Harness
        productos={[
          {
            ...product,
            unidades_acompanamiento: 9,
            opciones_venta: [
              {
                tipo: 'botella',
                precio: 50000,
                comision: 5000,
                precio_sin_anfitriona: 35000,
                acompanamiento: { unidades: 0 }
              }
            ]
          }
        ]}
        onAdd={add}
      />
    );
    fireEvent.click(
      screen.getByRole('button', {
        name:
          format === 'botella'
            ? /^Botella(?! sin anfitriona).*aumentar cantidad/
            : /Botella sin anfitriona.*aumentar cantidad/
      })
    );
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Agregar producto' }));
    });
    expect(add).toHaveBeenCalledWith(
      expect.objectContaining({
        tipo_venta: 'botella',
        acompanamiento_botella: undefined,
        unidades_acompanamiento: 0,
        cantidad: 1
      })
    );
  }
);

it('requiere cantidad y permite agregar una botella con comisión sin anfitrionas', async () => {
  const add = vi.fn();
  render(
    <Harness
      productos={[
        {
          ...product,
          comision: 2000,
          opciones_venta: [{ tipo: 'botella', precio: 4000, comision: 2000 }]
        }
      ]}
      onAdd={add}
    />
  );
  const button = screen.getByRole('button', { name: 'Agregar producto' });
  expect(button).toBeDisabled();
  fireEvent.click(screen.getByRole('button', { name: 'Botella: aumentar cantidad' }));
  expect(button).toBeEnabled();
  await act(async () => {
    fireEvent.click(button);
  });
  expect(add).toHaveBeenCalledWith(expect.objectContaining({ selectedHostesses: [] }));
});

it('ofrece el shot al precio de anfitriona como formato independiente', async () => {
  const add = vi.fn();
  const conAnfitriona = {
    ...product,
    opciones_venta: [
      { tipo: 'botella', precio: 4000, comision: 0 },
      { tipo: 'shot', precio: 1000, comision: 0, precio_anfitriona: 800 }
    ]
  };
  render(<Harness productos={[conAnfitriona]} onAdd={add} />);

  // Con precio de anfitriona el shot se parte en dos opciones, cada una con su precio.
  expect(screen.getByText('Corto cliente · 50 ml y 1 unidad de bebida')).toBeInTheDocument();
  expect(screen.getByText('Corto anfitriona · 50 ml')).toBeInTheDocument();
  fireEvent.click(
    screen.getByRole('button', { name: 'Corto anfitriona · 50 ml: aumentar cantidad' })
  );
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: 'Agregar producto' }));
  });

  // Sigue siendo un shot por ml, solo cambia el precio que se cobra: la marca viaja
  // al detalle de la venta para poder separarlo en reportes y cierre de caja.
  expect(add).toHaveBeenLastCalledWith(
    expect.objectContaining({ tipo_venta: 'shot', shot_anfitriona: true, precio: 800 })
  );
});

it('mantiene una sola opción de shot cuando no hay precio de anfitriona', async () => {
  render(<Harness productos={[product]} onAdd={vi.fn()} />);
  expect(screen.getByText('Corto · 50 ml y 1 unidad de bebida')).toBeInTheDocument();
  expect(screen.queryByText('Corto anfitriona · 50 ml')).not.toBeInTheDocument();
});

const conComisiones = {
  ...product,
  opciones_venta: [
    { tipo: 'botella', precio: 4000, comision: 1000 },
    { tipo: 'shot', precio: 1000, comision: 0 }
  ]
};

it('solo permite seleccionar anfitrionas en el formato con comisión', async () => {
  render(<Harness productos={[conComisiones]} onAdd={vi.fn()} />);
  expect(screen.getByText('Sin comisión')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Corto · 50 ml: aumentar cantidad' }));
  expect(screen.getByText('Sin comisión')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Botella: aumentar cantidad' }));
  await selectMixer();
  expect(document.querySelector('[data-sale-format="botella"]')).not.toHaveTextContent(
    'Sin comisión'
  );
  expect(screen.getByRole('button', { name: 'Agregar producto' })).toBeEnabled();
});

it('ofrece anfitriona opcional al vender el shot con comisión', async () => {
  const shotConComision = {
    ...product,
    opciones_venta: [
      { tipo: 'botella', precio: 4000, comision: 0 },
      { tipo: 'shot', precio: 1000, comision: 500 }
    ]
  };
  render(<Harness productos={[shotConComision]} onAdd={vi.fn()} />);
  expect(screen.getByRole('button', { name: 'Agregar producto' })).toBeDisabled();
  fireEvent.click(screen.getByRole('button', { name: 'Corto · 50 ml: aumentar cantidad' }));
  await selectMixer();
  expect(screen.getByRole('button', { name: 'Agregar producto' })).toBeEnabled();
});

it('muestra las unidades en carrito junto a los contadores independientes de formatos', async () => {
  const conAnfitriona = {
    ...product,
    opciones_venta: [
      { tipo: 'botella', precio: 4000, comision: 0 },
      { tipo: 'shot', precio: 1000, comision: 0, precio_anfitriona: 800 }
    ]
  };
  render(
    <Harness
      productos={[conAnfitriona]}
      onAdd={vi.fn()}
      // En el carrito hay shots servidos a precio de anfitriona.
      productosEnCarrito={[
        { id: 'presentation-1', tipo_venta: 'shot', shot_anfitriona: true, cantidad: 2 }
      ]}
    />
  );

  // La cantidad en carrito es un total del producto, independiente del formato.
  expect(screen.getByText('En carrito · 2')).toBeInTheDocument();

  expect(screen.getByText('Corto cliente · 50 ml y 1 unidad de bebida')).toBeInTheDocument();
});

// La bebida elegida viaja en el payload: lo que importa aquí es el campo de
// acompañamiento resultante, no la vista del selector.
it.each([
  ['Botella · 3 bebidas', 'acompanamiento_botella', { unidades: 3 }, '6 unidades'],
  ['Corto cliente · 50 ml', 'acompanamiento_corto', { unidades: 1 }, '2 unidades'],
  ['Corto anfitriona · 50 ml', 'acompanamiento_corto', { ml_por_corto: 150 }, '300 ml']
])(
  'elige la bebida de %s dentro del modal antes de agregar',
  async (label, field, consumption, total) => {
    const add = vi.fn();
    render(
      <Harness
        productos={[
          {
            ...product,
            opciones_venta: [
              { tipo: 'botella', precio: 4000, comision: 0, acompanamiento: { unidades: 3 } },
              {
                tipo: 'shot',
                precio: 1000,
                comision: 0,
                precio_anfitriona: 800,
                ml_acompanamiento_anfitriona: 150
              }
            ]
          }
        ]}
        onAdd={add}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: `${label}: aumentar cantidad` }));
    fireEvent.click(screen.getByRole('button', { name: `${label}: aumentar cantidad` }));
    expect(screen.getByRole('button', { name: 'Agregar producto' })).toBeDisabled();
    await selectMixer();
    expect(
      screen.getAllByText(
        `Consumo: ${label.startsWith('Botella') ? total : label.startsWith('Corto cliente') ? '1 unidades' : '150 ml'}`
      )
    ).toHaveLength(label.startsWith('Botella') ? 1 : 2);
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Agregar producto' }));
    });
    expect(add).toHaveBeenCalledWith(
      expect.objectContaining({
        cantidad: label.startsWith('Botella') ? 2 : 1,
        [String(field)]: expect.objectContaining({
          presentacion_id: 'sprite',
          ...(consumption as object)
        })
      })
    );
  }
);
