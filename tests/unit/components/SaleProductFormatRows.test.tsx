import { fireEvent, render, within } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { SaleProductFormatRows } from '@/components/sales/product-modal/SaleProductFormatRows';
import type { SaleProductItem } from '@/components/sales/product-modal/saleProductItems';
vi.mock('@/components/sales/SaleFormatQuantities', () => ({
  SaleFormatQuantities: ({
    options,
    hideLabel,
    optionClassName
  }: {
    options: Array<{ displayLabel?: string; label: string; precio: number }>;
    hideLabel?: boolean;
    optionClassName?: string;
  }) => (
    <div data-testid='format-card' className={optionClassName}>
      {!hideLabel && (options[0].displayLabel ?? options[0].label)}
      <span>{options[0].precio}</span>
    </div>
  )
}));
vi.mock('@/components/sales/product-modal/SaleProductMixers', () => ({
  SaleProductMixers: ({ item }: any) => (
    <div data-testid='mixer'>{item.mixers[0].selected.nombre}</div>
  )
}));
vi.mock('@/components/sales/product-modal/SaleProductHostess', () => ({
  SaleProductHostess: ({ item }: any) => (
    <div data-testid='hostess'>
      {item.otherSelected.join(', ')}
      <button type='button' onClick={() => item.onOtherSelect(['Elegida'])}>
        Asignar
      </button>
    </div>
  )
}));
it('mantiene formato, bebida y anfitriona dentro de la misma fila', () => {
  const item = {
    product: { unidades_acompanamiento: 12 },
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

it('muestra un selector independiente de anfitriona por cada corto', () => {
  const item = {
    product: {
      opciones_venta: [{ tipo: 'shot', ml_acompanamiento_anfitriona: 100 }]
    },
    opcionesTipo: [
      {
        value: 'shot_anfitriona',
        label: 'Corto anfitriona · 20 ml',
        cantidad: 2,
        precio: 10000,
        comision: 1000
      }
    ],
    mixers: [
      {
        value: 'shot_anfitriona',
        unitIndex: 0,
        selected: { nombre: 'Cola 1' }
      },
      {
        value: 'shot_anfitriona',
        unitIndex: 1,
        selected: { nombre: 'Cola 2' }
      }
    ],
    hostessFormats: [
      { value: 'shot_anfitriona', unitIndex: 0, selected: ['Ana'], onChange: vi.fn() },
      { value: 'shot_anfitriona', unitIndex: 1, selected: ['Bia'], onChange: vi.fn() }
    ],
    otherSelected: ['Ana', 'Bia']
  } as unknown as SaleProductItem;

  const { container, getAllByTestId } = render(
    <SaleProductFormatRows item={item} availableHostesses={[]} />
  );
  const row = container.querySelector('[data-sale-format="shot_anfitriona"]');

  const columns = 'md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,0.85fr)]';
  const header = container.querySelector('.bg-muted');
  expect(header).toHaveClass(columns);
  expect(header).toHaveTextContent('Formato y cantidad');
  expect(header).toHaveTextContent('Bebida');
  expect(header).toHaveTextContent('Anfitrionas');
  expect(row).toHaveClass(columns);
  const controls = Array.from(row?.children ?? []).map(child => child.textContent?.trim() ?? '');
  expect(controls).toHaveLength(6);
  expect(row?.children[0]).toHaveClass('md:col-start-1');
  expect(row?.children[1]).toHaveClass('md:col-start-2');
  expect(row?.children[2]).toHaveClass('md:col-start-3');
  expect(row?.children[3]).toHaveClass('md:col-start-1');
  expect(row?.children[4]).toHaveClass('md:col-start-2');
  expect(row?.children[5]).toHaveClass('md:col-start-3');
  expect(controls[0]).toContain('Corto 1');
  expect(controls[1]).toContain('Bebida · Corto 1');
  expect(controls[1]).toContain('Cola 1');
  expect(controls[2]).toContain('Anfitriona · Corto 1');
  expect(controls[2]).toContain('Ana');
  expect(controls[3]).toContain('Corto 2');
  expect(controls[4]).toContain('Bebida · Corto 2');
  expect(controls[4]).toContain('Cola 2');
  expect(controls[5]).toContain('Anfitriona · Corto 2');
  expect(controls[5]).toContain('Bia');
  expect(getAllByTestId('format-card')[0]).toHaveClass(
    'bg-amber-50/80',
    'border-amber-200/70',
    'dark:bg-amber-500/10'
  );
  const secondFormatCard = row?.children[3]?.lastElementChild;
  expect(secondFormatCard).toHaveClass(
    'bg-amber-50/80',
    'border-amber-200/70',
    'dark:bg-amber-500/10'
  );
  expect(getAllByTestId('mixer')).toHaveLength(2);
  const selectors = getAllByTestId('hostess');
  expect(selectors).toHaveLength(2);
  fireEvent.click(within(selectors[0]).getByRole('button', { name: 'Asignar' }));
  fireEvent.click(within(selectors[1]).getByRole('button', { name: 'Asignar' }));
  expect(item.hostessFormats?.[0].onChange).toHaveBeenCalledWith(['Elegida']);
  expect(item.hostessFormats?.[1].onChange).toHaveBeenCalledWith(['Elegida']);
});

it('no aplica el tono de anfitriona a los cortos cliente', () => {
  const item = {
    product: { opciones_venta: [{ tipo: 'shot' }] },
    opcionesTipo: [
      {
        value: 'shot',
        label: 'Corto cliente · 20 ml',
        cantidad: 2,
        precio: 10000,
        comision: 0
      }
    ],
    mixers: [],
    hostessFormats: []
  } as unknown as SaleProductItem;

  const { container, getByTestId } = render(
    <SaleProductFormatRows item={item} availableHostesses={[]} />
  );
  const row = container.querySelector('[data-sale-format="shot"]');
  const secondFormatCard = row?.children[1]?.lastElementChild;

  expect(getByTestId('format-card')).not.toHaveClass('bg-amber-50/80');
  expect(secondFormatCard).not.toHaveClass('bg-amber-50/80');
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
      { value: 'shot_anfitriona', label: 'Corto anfitriona · 20 ml', cantidad: 0, comision: 0 }
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

it('oculta las columnas de bebida y anfitrionas cuando el formato no las necesita', () => {
  const item = {
    product: {
      opciones_venta: [{ tipo: 'botella', precio: 50000, comision: 0 }]
    },
    opcionesTipo: [
      {
        value: 'botella_sin_anfitriona',
        label: 'Botella sin anfitriona',
        precio: 45000,
        cantidad: 0,
        comision: 0
      }
    ],
    mixers: [],
    hostessFormats: []
  } as any;
  const { container, queryByText } = render(
    <SaleProductFormatRows item={item} availableHostesses={[]} />
  );
  const row = container.querySelector('[data-sale-format="botella_sin_anfitriona"]');

  expect(queryByText('Bebida')).not.toBeInTheDocument();
  expect(queryByText('Anfitrionas')).not.toBeInTheDocument();
  expect(queryByText('Trago')).not.toBeInTheDocument();
  expect(queryByText('Botella sin anfitriona')).not.toBeInTheDocument();
  expect(queryByText('Formato y cantidad')).not.toBeInTheDocument();
  expect(row).toHaveTextContent('45000');
  expect(row?.children).toHaveLength(1);
  expect(container.querySelector('.border-t')).not.toBeInTheDocument();
  expect(container.querySelector('.bg-muted')).not.toBeInTheDocument();
});

it('muestra la columna de bebida cuando está configurada y oculta anfitrionas sin comisión', () => {
  const item = {
    product: {
      opciones_venta: [
        {
          tipo: 'botella',
          precio: 50000,
          comision: 0,
          acompanamiento: { unidades: 3 }
        }
      ]
    },
    opcionesTipo: [{ value: 'botella', label: 'Botella', cantidad: 0, comision: 0 }],
    mixers: [],
    hostessFormats: []
  } as any;
  const { container, getByText, queryByText } = render(
    <SaleProductFormatRows item={item} availableHostesses={[]} />
  );
  const row = container.querySelector('[data-sale-format="botella"]');

  expect(getByText('Bebida')).toBeInTheDocument();
  expect(queryByText('Anfitrionas')).not.toBeInTheDocument();
  expect(row?.children).toHaveLength(2);
});
