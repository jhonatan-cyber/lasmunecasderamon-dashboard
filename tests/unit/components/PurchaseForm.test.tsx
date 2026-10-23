import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PurchaseForm, type PurchaseCatalogItem } from '@/components/purchases/PurchaseForm';

const push = vi.fn();
const invalidateQueries = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));
vi.mock('@tanstack/react-query', () => ({
  useQueryClient: () => ({ invalidateQueries })
}));
vi.mock('next/image', () => ({
  default: ({ alt, src }: { alt: string; src: string }) => (
    <span role='img' aria-label={alt} data-src={src} />
  )
}));
vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn(), info: vi.fn() } }));

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  global.IntersectionObserver = vi.fn().mockImplementation(() => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
    takeRecords: vi.fn()
  }));
});

const catalog: PurchaseCatalogItem[] = [
  {
    id: 'pres-1',
    producto_id: 'prod-1',
    producto_nombre: 'Ron Habana',
    nombre: 'Botella 750 ml',
    foto: 'ron.jpg',
    precio_compra: 120,
    stock: 4
  }
];

describe('flujo guiado de compra', () => {
  it('selecciona presentaciones en tarjetas, captura proveedor y pago y finaliza mostrando los códigos', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          success: true,
          data: {
            id: 'compra-1',
            folio: 'C-0001',
            total: 240,
            fecha_crea: '2026-10-09T12:00:00.000Z',
            codigos_generados: []
          }
        }),
        { status: 201, headers: { 'Content-Type': 'application/json' } }
      )
    );
    render(<PurchaseForm catalog={catalog} />);

    expect(screen.getByRole('img', { name: 'Ron Habana Botella 750 ml' })).toHaveAttribute(
      'data-src',
      '/api/images/products/ron.jpg'
    );
    fireEvent.click(screen.getByRole('button', { name: /Agregar/ }));
    expect(screen.getByText(/1 presentación seleccionadas/)).toBeInTheDocument();
    expect(screen.queryByLabelText('Cantidad')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Cancelar' })).not.toBeInTheDocument();
    const floatingContinue = screen.getByRole('button', { name: 'Continuar' });
    expect(floatingContinue.parentElement?.parentElement).toHaveClass('fixed');
    expect(floatingContinue.parentElement?.parentElement).toHaveClass('bottom-4', 'right-4');
    fireEvent.click(floatingContinue);
    expect(screen.queryByRole('button', { name: 'Continuar' })).not.toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Ron Habana Botella 750 ml' })).toHaveAttribute(
      'data-src',
      '/api/images/products/ron.jpg'
    );

    fireEvent.change(screen.getByLabelText(/Proveedor/), {
      target: { value: 'Distribuidora Sur' }
    });
    fireEvent.change(screen.getByLabelText(/Teléfono/), { target: { value: '70000000' } });
    fireEvent.change(screen.getByLabelText(/Descripción/), {
      target: { value: 'Compra semanal' }
    });
    expect(screen.getByLabelText('Cantidad')).toHaveValue('1');
    fireEvent.click(screen.getByRole('button', { name: 'Aumentar cantidad de Ron Habana' }));
    expect(screen.getByLabelText('Cantidad')).toHaveValue('2');
    fireEvent.click(screen.getByRole('button', { name: 'Revisar compra' }));

    expect(screen.getByText('Distribuidora Sur')).toBeInTheDocument();
    expect(screen.getByText('Compra semanal')).toBeInTheDocument();
    expect(screen.getByText('Efectivo')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Finalizar compra' }));

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith('/api/purchases', expect.anything())
    );
    await waitFor(() => expect(invalidateQueries).toHaveBeenCalled());
    const { predicate } = invalidateQueries.mock.calls.at(-1)![0];
    expect(predicate({ queryKey: ['product-presentations', 'prod-1'] })).toBe(true);
    expect(predicate({ queryKey: ['/api/products?category_id=1'] })).toBe(true);
    expect(predicate({ queryKey: ['/api/users'] })).toBe(false);
    const request = fetchMock.mock.calls[0][1];
    expect(JSON.parse(String(request?.body))).toMatchObject({
      proveedor: 'Distribuidora Sur',
      telefono: '70000000',
      observaciones: 'Compra semanal',
      metodo_pago: 'efectivo',
      detalles: [expect.objectContaining({ cantidad: 2, precio_compra: 120 })]
    });
    await waitFor(() => expect(screen.getByText('Compra C-0001 registrada')).toBeInTheDocument());
  });

  it('calcula el vencimiento con elaboración y duración y lo envía en la línea', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          success: true,
          data: {
            id: 'compra-2',
            folio: 'C-0002',
            total: 120,
            fecha_crea: '2026-10-09T12:00:00.000Z',
            codigos_generados: []
          }
        }),
        { status: 201, headers: { 'Content-Type': 'application/json' } }
      )
    );
    render(<PurchaseForm catalog={catalog} />);
    fireEvent.click(screen.getByRole('button', { name: /Agregar/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Continuar' }));

    // Elaboración + duración completan el vencimiento automáticamente.
    fireEvent.change(screen.getByLabelText('Fecha de elaboración'), {
      target: { value: '2026-01-31' }
    });
    fireEvent.change(screen.getByLabelText('Duración (meses)'), { target: { value: '6' } });
    expect(screen.getByLabelText('Fecha de vencimiento')).toHaveValue('2026-07-31');
    // Una duración distinta recalcula: el día se recorta al fin del mes.
    fireEvent.change(screen.getByLabelText('Duración (meses)'), { target: { value: '1' } });
    expect(screen.getByLabelText('Fecha de vencimiento')).toHaveValue('2026-02-28');

    fireEvent.click(screen.getByRole('button', { name: 'Revisar compra' }));
    fireEvent.click(screen.getByRole('button', { name: 'Finalizar compra' }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    const body = JSON.parse(String(fetchMock.mock.calls[0][1]?.body));
    expect(body.detalles[0]).toMatchObject({
      fecha_elaboracion: '2026-01-31',
      duracion_meses: 1,
      fecha_vencimiento: '2026-02-28'
    });
  });

  it('acepta solo la fecha de vencimiento, sin elaboración ni duración', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          success: true,
          data: {
            id: 'compra-3',
            folio: 'C-0003',
            total: 120,
            fecha_crea: '2026-10-09T12:00:00.000Z',
            codigos_generados: []
          }
        }),
        { status: 201, headers: { 'Content-Type': 'application/json' } }
      )
    );
    render(<PurchaseForm catalog={catalog} />);
    fireEvent.click(screen.getByRole('button', { name: /Agregar/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Continuar' }));

    fireEvent.change(screen.getByLabelText('Fecha de vencimiento'), {
      target: { value: '2026-12-01' }
    });
    expect(screen.getByLabelText('Fecha de elaboración')).toHaveValue('');
    expect(screen.getByLabelText('Duración (meses)')).toHaveValue('');
    expect(screen.getByLabelText('Fecha de vencimiento')).toHaveValue('2026-12-01');

    fireEvent.click(screen.getByRole('button', { name: 'Revisar compra' }));
    fireEvent.click(screen.getByRole('button', { name: 'Finalizar compra' }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    const body = JSON.parse(String(fetchMock.mock.calls[0][1]?.body));
    expect(body.detalles[0]).toMatchObject({
      fecha_elaboracion: null,
      duracion_meses: null,
      fecha_vencimiento: '2026-12-01'
    });
  });

  it('permite avanzar sin proveedor, teléfono ni descripción', () => {
    render(<PurchaseForm catalog={catalog} />);
    fireEvent.click(screen.getByRole('button', { name: /Agregar/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Continuar' }));
    fireEvent.click(screen.getByRole('button', { name: 'Revisar compra' }));

    expect(screen.getByText('No indicado')).toBeInTheDocument();
    expect(screen.getByText('Sin descripción')).toBeInTheDocument();
    expect(screen.getByText('Método de pago')).toBeInTheDocument();
  });
});

it('no registra al presionar Enter antes del paso de confirmacion', () => {
  const request = vi.spyOn(global, 'fetch').mockResolvedValue(Response.json({ success: true }));
  render(<PurchaseForm catalog={catalog} />);
  fireEvent.click(screen.getByRole('button', { name: /Agregar/ }));
  fireEvent.submit(
    screen.getByRole('button', { name: 'Continuar' }).closest('section')!.querySelector('form')!
  );
  expect(request).not.toHaveBeenCalled();
});
it('agrega una sola linea y envia una compra ante dos submit inmediatos', async () => {
  let release!: (response: Response) => void;
  const request = vi.spyOn(global, 'fetch').mockImplementation(
    () =>
      new Promise<Response>(resolve => {
        release = resolve;
      })
  );
  render(<PurchaseForm catalog={catalog} />);
  const add = screen.getByRole('button', { name: /Agregar/ });
  act(() => {
    add.click();
    add.click();
  });
  fireEvent.click(screen.getByRole('button', { name: 'Continuar' }));
  fireEvent.click(screen.getByRole('button', { name: 'Revisar compra' }));
  const confirm = screen.getByRole('button', { name: 'Finalizar compra' });
  const form = confirm.closest('form')!;
  act(() => {
    fireEvent.submit(form);
    fireEvent.submit(form);
  });
  expect(request).toHaveBeenCalledTimes(1);
  expect(confirm).toBeDisabled();
  expect(JSON.parse(String(request.mock.calls[0][1]?.body)).detalles).toEqual([
    expect.objectContaining({ presentacion_id: 'pres-1', cantidad: 1 })
  ]);
  await act(async () => {
    release(Response.json({ success: false, message: 'Revisa datos' }, { status: 400 }));
  });
  expect(confirm).toBeEnabled();
});
