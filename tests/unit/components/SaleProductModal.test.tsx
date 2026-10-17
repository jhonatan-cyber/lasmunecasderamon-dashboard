'use client';
import React, { useState } from 'react';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import SaleProductModal from '@/components/sales/SaleProductModal';

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

beforeEach(() =>
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        data: [
          {
            id: 'sprite',
            producto_nombre: 'Sprite',
            nombre: '350 ml',
            stock_bar: 20,
            foto: 'sprite.webp'
          },
          { id: 'cola', producto_nombre: 'Coca-Cola', nombre: '350 ml', stock_bar: 20 },
          {
            id: 'sin-stock',
            producto_nombre: 'Sin stock',
            nombre: '350 ml',
            stock_bar: 0,
            ml_abierta: 1000
          },
          { id: 'negativo', producto_nombre: 'Stock negativo', nombre: '350 ml', stock_bar: -1 }
        ]
      })
    })
  )
);
afterEach(async () => {
  await act(async () => {});
  cleanup();
  vi.unstubAllGlobals();
});

async function selectMixer() {
  await waitFor(() => expect(screen.getAllByRole('combobox')[0]).toBeEnabled());
  for (const selector of screen.getAllByRole('combobox')) {
    fireEvent.click(selector);
    await screen.findByRole('option', { name: /Sprite/ });
    fireEvent.click(screen.getByRole('option', { name: /Sprite/ }));
  }
}

const product = {
  id: 'presentation-1',
  nombre: 'Producto de prueba',
  foto: 'producto.webp',
  stock_bar: 5,
  precio: 4000,
  comision: 0,
  opciones_venta: [
    { tipo: 'botella', precio: 4000, comision: 0 },
    { tipo: 'shot', precio: 1000, comision: 0 }
  ]
};

function Harness({
  productos,
  onAdd,
  onClose = vi.fn(),
  productosEnCarrito = []
}: {
  productos: any[];
  onAdd: (p: any) => void;
  onClose?: () => void;
  productosEnCarrito?: any[];
}) {
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  return (
    <SaleProductModal
      open
      onClose={onClose}
      loading={false}
      productos={productos}
      cantidades={quantities}
      handleCantidadChange={(id, value) =>
        setQuantities(prev => ({ ...prev, [id]: Number(value) }))
      }
      handleAgregarProducto={onAdd}
      categoria={{ nombre: 'Bebidas' }}
      anfitrionas={[]}
      champagneHostessSelections={{}}
      onChampagneHostessChange={vi.fn()}
      otherProductHostessSelections={{}}
      onOtherProductHostessChange={vi.fn()}
      productosEnCarrito={productosEnCarrito}
    />
  );
}

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
});
