import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import { SaleProductHostess } from '@/components/sales/product-modal/SaleProductHostess';
import type { SaleProductItem } from '@/components/sales/product-modal/saleProductItems';

vi.mock('@/components/orders', () => ({
  HostessMultiSelect: ({
    maxSelection,
    onChange
  }: {
    maxSelection: number;
    onChange: (ids: string[]) => void;
  }) => (
    <div data-testid='multiple'>
      {maxSelection}
      <button
        type='button'
        aria-label={`Elegir ${maxSelection}`}
        onClick={() => onChange(['ana', 'bea', 'cami', 'dani'].slice(0, maxSelection))}
      />
    </div>
  ),
  getExplicitMaxAnfitrionas: (product: { max_anfitrionas: number }) => product.max_anfitrionas
}));
vi.mock('@/components/shared/selects', () => ({
  IndividualHostessSelect: ({
    value,
    onChange
  }: {
    value: string;
    onChange: (id: string) => void;
  }) => (
    <select aria-label='Anfitriona' value={value} onChange={event => onChange(event.target.value)}>
      <option value=''>Seleccionar</option>
      <option value='ana'>Ana</option>
    </select>
  )
}));
afterEach(cleanup);

it.each(['botella', 'shot_anfitriona'])(
  'no permite elegir ni mostrar una anfitriona para %s sin comisión',
  tipo => {
    const product = item(false, tipo);
    product.opcionesTipo[0].comision = 0;
    product.otherSelected = ['ana'];
    render(<SaleProductHostess item={product} availableHostesses={[{ id: 'ana' }]} />);
    expect(screen.getByText('Sin comisión')).toBeInTheDocument();
    expect(screen.queryByTestId('multiple')).toBeNull();
    expect(screen.queryByLabelText('Anfitriona')).toBeNull();
    expect(screen.queryByText(/Asignada:/)).toBeNull();
    expect(product.onOtherSelect).not.toHaveBeenCalled();
  }
);

function item(isChampagne: boolean, tipo = 'shot_anfitriona'): SaleProductItem {
  return {
    product: { precio: 60000, max_anfitrionas: 5 },
    muestraAnfitriona: true,
    isChampagne,
    opcionesTipo: [{ value: tipo, cantidad: 1, comision: 1000 }],
    champagneSelected: [],
    otherSelected: [],
    cantidadActual: 1,
    champagneHostessLimit: 5,
    onChampagneSelect: vi.fn(),
    onOtherSelect: vi.fn()
  } as unknown as SaleProductItem;
}

it.each([false, true])('usa selección individual para cortos (champagne: %s)', isChampagne => {
  const product = item(isChampagne);
  render(<SaleProductHostess item={product} availableHostesses={[{ id: 'ana', nombre: 'Ana' }]} />);
  expect(screen.queryByTestId('multiple')).toBeNull();
  fireEvent.change(screen.getByLabelText('Anfitriona'), { target: { value: 'ana' } });
  expect(isChampagne ? product.onChampagneSelect : product.onOtherSelect).toHaveBeenCalledWith([
    'ana'
  ]);
});

it.each([false, true])('conserva selección múltiple para botellas (champagne: %s)', isChampagne => {
  render(<SaleProductHostess item={item(isChampagne, 'botella')} availableHostesses={[]} />);
  expect(screen.getByTestId('multiple')).toBeTruthy();
});

it.each([false, true])('permite dos anfitrionas para dos cortos (champagne: %s)', isChampagne => {
  const product = item(isChampagne);
  product.opcionesTipo[0].cantidad = 2;
  render(<SaleProductHostess item={product} availableHostesses={[]} />);
  expect(screen.getByTestId('multiple').textContent).toBe('2');
});

it('usa un selector compartido y distribuye anfitrionas entre formatos de corto', () => {
  const product = item(false);
  const first = vi.fn();
  const second = vi.fn();
  product.opcionesTipo = [
    { value: 'shot_anfitriona', cantidad: 1, comision: 1000 },
    { value: 'shot_anfitriona:1', cantidad: 1, comision: 2000 }
  ] as any;
  product.hostessFormats = [
    {
      value: 'shot_anfitriona',
      label: 'Corto anfitriona · $10.000',
      cantidad: 1,
      comision: 1000,
      selected: [],
      onChange: first
    },
    {
      value: 'shot_anfitriona:1',
      label: 'Corto anfitriona · $20.000',
      cantidad: 1,
      comision: 2000,
      selected: [],
      onChange: second
    }
  ];
  render(<SaleProductHostess item={product} availableHostesses={[{ id: 'ana', nombre: 'Ana' }]} />);
  expect(screen.getByTestId('multiple')).toHaveTextContent('2');
  expect(screen.getAllByTestId('multiple')).toHaveLength(1);
  fireEvent.click(screen.getByRole('button', { name: 'Elegir 2' }));
  expect(first).toHaveBeenCalledWith(['ana']);
  expect(second).toHaveBeenCalledWith(['bea']);
});

it('multiplica el límite de champaña por la cantidad y lo mantiene en un selector', () => {
  const product = item(true, 'botella');
  product.product.max_anfitrionas = 2;
  product.champagneHostessLimit = 2;
  product.opcionesTipo[0].cantidad = 2;
  product.hostessFormats = [
    {
      value: 'botella',
      label: 'Botella',
      cantidad: 2,
      comision: 1000,
      selected: [],
      onChange: product.onChampagneSelect
    }
  ];
  render(<SaleProductHostess item={product} availableHostesses={[]} />);

  expect(screen.getAllByTestId('multiple')).toHaveLength(1);
  expect(screen.getByTestId('multiple')).toHaveTextContent('4');
  fireEvent.click(screen.getByRole('button', { name: 'Elegir 4' }));
  expect(product.onChampagneSelect).toHaveBeenCalledWith(['ana', 'bea', 'cami', 'dani']);
});

it('muestra la anfitriona asignada antes del selector', () => {
  const product = item(false);
  product.otherSelected = ['ana'];
  render(<SaleProductHostess item={product} availableHostesses={[{ id: 'ana', nombre: 'Ana' }]} />);
  const text = screen.getByText('Asignada: Ana');
  const selector = screen.getByLabelText('Anfitriona');
  expect(text.compareDocumentPosition(selector) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
});
