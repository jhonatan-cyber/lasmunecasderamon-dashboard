import { render } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { SaleProductFormatRows } from '@/components/sales/product-modal/SaleProductFormatRows';
vi.mock('@/components/sales/SaleFormatQuantities', () => ({
  SaleFormatQuantities: ({ options }: any) => (
    <div>{options[0].displayLabel ?? options[0].label}</div>
  )
}));
vi.mock('@/components/sales/product-modal/SaleProductMixers', () => ({
  SaleProductMixers: ({ item }: any) => <div>{item.mixers[0].selected.nombre}</div>
}));
vi.mock('@/components/sales/product-modal/SaleProductHostess', () => ({
  SaleProductHostess: ({ item }: any) => <div>{item.otherSelected.join(', ')}</div>
}));
it('mantiene formato, bebida y anfitriona dentro de la misma fila', () => {
  const item = {
    opcionesTipo: [
      { value: 'botella', label: 'Botella', cantidad: 1, comision: 100 },
      { value: 'shot_anfitriona:1', label: 'Corto anfitriona 2', cantidad: 1, comision: 200 }
    ],
    mixers: [
      { value: 'botella', selected: { nombre: 'Coca-Cola' } },
      { value: 'shot_anfitriona:1', selected: { nombre: 'Sprite' } }
    ],
    hostessFormats: [
      { value: 'botella', selected: ['Lola'], onChange: vi.fn() },
      { value: 'shot_anfitriona:1', selected: ['Ana'], onChange: vi.fn() }
    ]
  } as any;
  const { container } = render(<SaleProductFormatRows item={item} availableHostesses={[]} />);
  const bottle = container.querySelector('[data-sale-format="botella"]');
  const shot = container.querySelector('[data-sale-format="shot_anfitriona:1"]');
  expect(bottle).toHaveTextContent('Botella');
  expect(bottle).toHaveTextContent('Coca-Cola');
  expect(bottle).toHaveTextContent('Lola');
  expect(bottle).not.toHaveTextContent('Sprite');
  expect(bottle).not.toHaveTextContent('Ana');
  expect(shot).toHaveTextContent('Corto anfitriona 2');
  expect(shot).toHaveTextContent('Sprite');
  expect(shot).toHaveTextContent('Ana');
});

it.each([
  [4, 150],
  [6, 200]
])('usa las bebidas y ml guardados del producto (%s, %s)', (unidades, ml) => {
  const item = {
    product: {
      opciones_venta: JSON.stringify([
        { tipo: 'botella', acompanamiento: { unidades } },
        { tipo: 'shot', ml_acompanamiento_anfitriona: ml }
      ])
    },
    opcionesTipo: [
      { value: 'botella', label: 'Botella', cantidad: 0, comision: 0 },
      { value: 'shot_anfitriona', label: 'Corto anfitriona \u00b7 20 ml', cantidad: 0, comision: 0 }
    ]
  } as any;
  const { container, unmount } = render(
    <SaleProductFormatRows item={item} availableHostesses={[]} />
  );
  expect(container.querySelector('[data-sale-format="botella"]')).toHaveTextContent(
    `${unidades} unidades de bebida`
  );
  expect(container.querySelector('[data-sale-format="shot_anfitriona"]')).toHaveTextContent(
    `20 ml y ${ml} ml de bebida`
  );
  unmount();
});
