import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { ProductForm } from '@/components/products/ProductForm';
import type { Product } from '@/types/product';
import { fechaCorta, seleccionarFecha } from '../helpers/datePicker';

const queryClient = vi.hoisted(() => ({
  fetchQuery: vi.fn().mockResolvedValue(null),
  setQueryData: vi.fn(),
  getQueryData: vi.fn(),
  invalidateQueries: vi.fn(),
  cancelQueries: vi.fn(),
  removeQueries: vi.fn()
}));
vi.mock('@tanstack/react-query', () => ({
  useQuery: () => ({ data: null, isLoading: false, error: null }),
  useMutation: () => ({ mutate: vi.fn(), mutateAsync: vi.fn() }),
  useQueryClient: () => queryClient,
  QueryClient: vi.fn(() => queryClient),
  QueryClientProvider: ({ children }: { children: React.ReactNode }) => children,
  keepPreviousData: (previous: unknown) => previous,
  isCancelledError: () => false
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() }
}));

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-05-05T15:00:00.000Z'));
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

const mount = (onSubmit: (form: FormData) => void, initialValues?: Product) =>
  render(
    <ProductForm
      open={true}
      onCancel={() => {}}
      onSubmit={onSubmit}
      initialValues={initialValues}
      categoryId='1'
      categoryName='Bebidas'
      isLoading={false}
    />
  );

const completarProducto = () => {
  fireEvent.change(screen.getByLabelText('Nombre del Producto'), {
    target: { value: 'Ron Habana' }
  });
  fireEvent.click(screen.getByRole('button', { name: /Agregar/ }));
  fireEvent.change(screen.getByLabelText('Cantidad de la presentación'), {
    target: { value: '750' }
  });
};

const presentacionesEnviadas = (form: FormData) => JSON.parse(String(form.get('presentaciones')));

it('calcula el vencimiento por presentación con elaboración y duración', () => {
  const onSubmit = vi.fn();
  mount(onSubmit);
  completarProducto();

  seleccionarFecha('Fecha de elaboración', '2026-01-31');
  fireEvent.change(screen.getByLabelText('Duración (meses)'), { target: { value: '6' } });
  expect(screen.getByLabelText('Fecha de vencimiento')).toHaveTextContent(fechaCorta('2026-07-31'));
  fireEvent.submit(document.getElementById('product-form')!);
  expect(onSubmit).toHaveBeenCalledTimes(1);
  const form = onSubmit.mock.calls[0][0] as FormData;
  const [presentacion] = presentacionesEnviadas(form);
  expect(presentacion.fecha_elaboracion).toBe('2026-01-31');
  expect(presentacion.duracion_meses).toBe(6);
  expect(presentacion.fecha_vencimiento).toBe('2026-07-31');
});

it('no manda fechas en el payload del producto', () => {
  const onSubmit = vi.fn();
  mount(onSubmit);
  completarProducto();
  seleccionarFecha('Fecha de vencimiento', '2026-11-20');
  fireEvent.submit(document.getElementById('product-form')!);
  const form = onSubmit.mock.calls[0][0] as FormData;
  expect(form.get('fecha_elaboracion')).toBeNull();
  expect(form.get('duracion_meses')).toBeNull();
  expect(form.get('fecha_vencimiento')).toBeNull();
});

it('acepta solo la fecha de vencimiento en la presentación', () => {
  const onSubmit = vi.fn();
  mount(onSubmit);
  completarProducto();
  seleccionarFecha('Fecha de vencimiento', '2026-11-20');
  expect(screen.getByLabelText('Fecha de elaboración')).toHaveTextContent('dd/mm/aaaa');
  expect(screen.getByLabelText('Duración (meses)')).toHaveValue('');
  expect(screen.getByLabelText('Fecha de vencimiento')).toHaveTextContent(fechaCorta('2026-11-20'));
  fireEvent.submit(document.getElementById('product-form')!);
  expect(onSubmit).toHaveBeenCalledTimes(1);
  const [presentacion] = presentacionesEnviadas(onSubmit.mock.calls[0][0] as FormData);
  expect(presentacion.fecha_elaboracion).toBeNull();
  expect(presentacion.duracion_meses).toBeNull();
  expect(presentacion.fecha_vencimiento).toBe('2026-11-20');
});

it('rechaza un vencimiento anterior a la elaboración de la presentación', () => {
  const onSubmit = vi.fn();
  mount(onSubmit);
  completarProducto();
  seleccionarFecha('Fecha de elaboración', '2026-05-01');
  seleccionarFecha('Fecha de vencimiento', '2026-04-01');
  fireEvent.submit(document.getElementById('product-form')!);
  expect(screen.getByRole('alert')).toHaveTextContent(
    'El vencimiento no puede ser anterior a la elaboración'
  );
  expect(onSubmit).not.toHaveBeenCalled();
});

it('guarda las fechas de lote al editar una presentación existente', async () => {
  const presentacion = {
    id: 'pres-1',
    producto_id: 'p-1',
    nombre: '750 ml',
    codigo_barras: null,
    precio_compra: 1000,
    precio_venta: 2000,
    comision: 0,
    stock: 5,
    stock_minimo: 1,
    stock_maximo: 10,
    fecha_elaboracion: '2026-01-15',
    duracion_meses: 12,
    fecha_vencimiento: '2027-01-15'
  };
  const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
    if (init?.method === 'PATCH')
      return { ok: true, json: async () => ({ success: true }) } as Response;
    if (String(url).includes('/api/products/presentations'))
      return { ok: true, json: async () => ({ success: true, data: [presentacion] }) } as Response;
    return {
      ok: true,
      json: async () => ({ success: true, data: { total: 5, inactivas: 0, unidades: [] } })
    } as Response;
  });
  vi.stubGlobal('fetch', fetchMock);

  mount(() => {}, {
    id: 'p-1',
    code: 'LM-1',
    name: 'Ron Habana',
    category_id: '1',
    price: 0,
    commission: 0,
    description: '',
    status: 1
  });

  fireEvent.click(await screen.findByTitle('Editar presentación'));
  expect(screen.getByLabelText('Fecha de elaboración')).toHaveTextContent(fechaCorta('2026-01-15'));

  seleccionarFecha('Fecha de elaboración', '2026-02-10');
  fireEvent.change(screen.getByLabelText('Duración (meses)'), { target: { value: '3' } });
  expect(screen.getByLabelText('Fecha de vencimiento')).toHaveTextContent(fechaCorta('2026-05-10'));

  fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));

  await waitFor(() => {
    const patch = fetchMock.mock.calls.find(([, init]) => init?.method === 'PATCH');
    expect(patch).toBeDefined();
    const body = JSON.parse(String(patch![1]!.body));
    expect(body.fecha_elaboracion).toBe('2026-02-10');
    expect(body.duracion_meses).toBe(3);
    expect(body.fecha_vencimiento).toBe('2026-05-10');
  });
});
