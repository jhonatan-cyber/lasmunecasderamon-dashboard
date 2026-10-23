import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { ProductForm } from '@/components/products/ProductForm';

// El mock global de react-query devuelve un cliente nuevo en cada llamada; con
// `useProductForm` eso re-dispara su efecto en bucle. Acá se fija uno solo.
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

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

const mount = (onSubmit: (form: FormData) => void) =>
  render(
    <ProductForm
      open={true}
      onCancel={() => {}}
      onSubmit={onSubmit}
      categoryId='1'
      categoryName='Bebidas'
      isLoading={false}
    />
  );

/** Producto válido para que el submit pase la validación (código + presentación). */
const completarProducto = () => {
  fireEvent.change(screen.getByLabelText('Nombre del Producto'), {
    target: { value: 'Ron Habana' }
  });
  fireEvent.click(screen.getByRole('button', { name: /Agregar/ }));
  fireEvent.change(screen.getByLabelText('Cantidad de la presentación'), {
    target: { value: '750' }
  });
};

it('calcula el vencimiento con elaboración y duración y los tres datos viajan al guardar', () => {
  const onSubmit = vi.fn();
  mount(onSubmit);
  completarProducto();

  fireEvent.change(screen.getByLabelText('Fecha de elaboración'), {
    target: { value: '2026-01-31' }
  });
  fireEvent.change(screen.getByLabelText('Duración (meses)'), { target: { value: '6' } });

  // El vencimiento se completa solo (el día se recorta al fin del mes).
  expect(screen.getByLabelText('Fecha de vencimiento')).toHaveValue('2026-07-31');

  fireEvent.submit(document.getElementById('product-form')!);

  expect(onSubmit).toHaveBeenCalledTimes(1);
  const form = onSubmit.mock.calls[0][0] as FormData;
  expect(form.get('fecha_elaboracion')).toBe('2026-01-31');
  expect(form.get('duracion_meses')).toBe('6');
  expect(form.get('fecha_vencimiento')).toBe('2026-07-31');
});

it('acepta solo la fecha de vencimiento, sin elaboración ni duración', () => {
  const onSubmit = vi.fn();
  mount(onSubmit);
  completarProducto();

  fireEvent.change(screen.getByLabelText('Fecha de vencimiento'), {
    target: { value: '2026-11-20' }
  });
  expect(screen.getByLabelText('Fecha de elaboración')).toHaveValue('');
  expect(screen.getByLabelText('Duración (meses)')).toHaveValue('');
  expect(screen.getByLabelText('Fecha de vencimiento')).toHaveValue('2026-11-20');

  fireEvent.submit(document.getElementById('product-form')!);

  expect(onSubmit).toHaveBeenCalledTimes(1);
  const form = onSubmit.mock.calls[0][0] as FormData;
  expect(form.get('fecha_elaboracion')).toBe('');
  expect(form.get('duracion_meses')).toBe('');
  expect(form.get('fecha_vencimiento')).toBe('2026-11-20');
});

it('rechaza un vencimiento anterior a la elaboración', () => {
  const onSubmit = vi.fn();
  mount(onSubmit);
  completarProducto();

  fireEvent.change(screen.getByLabelText('Fecha de elaboración'), {
    target: { value: '2026-05-01' }
  });
  fireEvent.change(screen.getByLabelText('Fecha de vencimiento'), {
    target: { value: '2026-04-01' }
  });

  fireEvent.submit(document.getElementById('product-form')!);

  expect(screen.getByRole('alert')).toHaveTextContent(
    'El vencimiento no puede ser anterior a la elaboración'
  );
  expect(onSubmit).not.toHaveBeenCalled();
});
