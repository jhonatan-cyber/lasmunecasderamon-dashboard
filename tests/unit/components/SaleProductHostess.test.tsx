import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import { SaleProductHostess } from '@/components/sales/product-modal/SaleProductHostess';
import type { SaleProductItem } from '@/components/sales/product-modal/saleProductItems';

vi.mock('@/components/orders', () => ({
  HostessMultiSelect: ({ maxSelection }: { maxSelection: number }) => (
    <div data-testid='multiple'>{maxSelection}</div>
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

it('muestra selectores independientes para cada precio de corto de anfitriona', () => {
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
  expect(screen.getByText('Corto anfitriona · $10.000')).toBeInTheDocument();
  expect(screen.getByText('Corto anfitriona · $20.000')).toBeInTheDocument();
  const selects = screen.getAllByLabelText('Anfitriona');
  expect(selects).toHaveLength(2);
  fireEvent.change(selects[1], { target: { value: 'ana' } });
  expect(second).toHaveBeenCalledWith(['ana']);
  expect(first).not.toHaveBeenCalled();
});

it('muestra la anfitriona asignada antes del selector', () => {
  const product = item(false);
  product.otherSelected = ['ana'];
  render(<SaleProductHostess item={product} availableHostesses={[{ id: 'ana', nombre: 'Ana' }]} />);
  const text = screen.getByText('Asignada: Ana');
  const selector = screen.getByLabelText('Anfitriona');
  expect(text.compareDocumentPosition(selector) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
});
