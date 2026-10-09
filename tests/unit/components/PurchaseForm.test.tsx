import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PurchaseForm, type PurchaseCatalogItem } from '@/components/purchases/PurchaseForm';

const push = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));
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
