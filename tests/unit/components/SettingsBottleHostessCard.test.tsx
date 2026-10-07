import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { SettingsBottleHostessCard } from '@/components/settings/SettingsBottleHostessCard';

vi.mock('@/hooks/settings/useSettingsProducts', () => ({
  useSettingsProducts: () => ({
    productos: [
      {
        id: 'producto',
        name: 'Absolut',
        categoria: 'Vodka',
        price: 99999,
        commission: 9999,
        max_anfitrionas: 2
      }
    ],
    loading: false,
    refresh: vi.fn()
  }),
  invalidateSettingsProducts: vi.fn()
}));
vi.mock('@/components/ui/popover', () => ({
  Popover: ({ children }: any) => <div>{children}</div>,
  PopoverTrigger: ({ children }: any) => children,
  PopoverContent: ({ children }: any) => <div>{children}</div>
}));
vi.mock('@/components/ui/command', () => ({
  Command: ({ children }: any) => <div>{children}</div>,
  CommandInput: (props: any) => <input {...props} />,
  CommandList: ({ children }: any) => <div>{children}</div>,
  CommandEmpty: () => null,
  CommandGroup: ({ children }: any) => <div>{children}</div>,
  CommandItem: ({ children, onSelect }: any) => <button onClick={onSelect}>{children}</button>
}));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const fetchMock = vi.fn();
beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
  fetchMock.mockImplementation(async (_url, init) => ({
    ok: true,
    json: async () => ({
      success: true,
      data: init?.method
        ? {}
        : [
            {
              id: 'pres-750',
              producto_id: 'producto',
              nombre: '750ml',
              precio_venta: 20000,
              comision: 4000,
              opciones_venta: [
                { tipo: 'botella', precio: 20000, comision: 4000 },
                { tipo: 'shot', precio: 2500, comision: 0, precio_anfitriona: 3000 }
              ]
            },
            {
              id: 'pres-1000',
              producto_id: 'producto',
              nombre: '1000ml',
              precio_venta: 30000,
              comision: 6000,
              opciones_venta: [{ tipo: 'botella', precio: 30000, comision: 6000 }]
            }
          ]
    })
  }));
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('comisiones por presentación', () => {
  it('muestra la tabla desde dos anfitrionas y la oculta con una o máximo vacío', async () => {
    render(<SettingsBottleHostessCard />);
    await screen.findByLabelText('Máx. anfitrionas');
    expect(await screen.findByText('Precios por cantidad de anfitrionas')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Máx. anfitrionas'), { target: { value: '1' } });
    expect(screen.queryByText('Precios por cantidad de anfitrionas')).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Máx. anfitrionas'), { target: { value: '' } });
    expect(screen.queryByText('Precios por cantidad de anfitrionas')).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Máx. anfitrionas'), { target: { value: '3' } });
    await screen.findByLabelText('Precio para 3 anfitrionas');
    expect(screen.queryByLabelText('Precio para 4 anfitrionas')).not.toBeInTheDocument();
  });
  it('muestra dos opciones independientes y carga los valores de la presentación elegida', async () => {
    render(<SettingsBottleHostessCard />);
    await screen.findByRole('button', { name: /Vodka Absolut 1000ml/ });
    const botella750 = screen.getByRole('button', { name: /Vodka Absolut 750ml/ });
    expect(botella750).toHaveTextContent('20.000');
    fireEvent.click(botella750);
    expect(screen.getByLabelText('Precio venta')).toHaveValue('20.000');
    expect(screen.getByLabelText('Comisión')).toHaveValue('4.000');
    fireEvent.click(screen.getByRole('button', { name: /Vodka Absolut 1000ml/ }));
    expect(screen.getByLabelText('Precio venta')).toHaveValue('30.000');
    expect(screen.getByLabelText('Comisión')).toHaveValue('6.000');
    await screen.findByLabelText('Precio para 2 anfitrionas');
  });

  it('guarda únicamente la presentación seleccionada y conserva los precios por shot', async () => {
    render(<SettingsBottleHostessCard />);
    fireEvent.click(await screen.findByRole('button', { name: /Vodka Absolut 750ml/ }));
    await screen.findByLabelText('Precio para 2 anfitrionas');
    expect(screen.queryByRole('button', { name: 'Guardar precios' })).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Precio para 2 anfitrionas'), {
      target: { value: '35000' }
    });
    fireEvent.change(screen.getByLabelText('Precio venta'), { target: { value: '22000' } });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar Cambios' }));
    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/products/presentations',
        expect.objectContaining({ method: 'PATCH' })
      )
    );
    const [, request] = fetchMock.mock.calls.find(
      ([url, init]) => url === '/api/products/presentations' && init.method === 'PATCH'
    )!;
    expect(JSON.parse(request.body)).toEqual({
      id: 'pres-750',
      precio_venta: 22000,
      comision: 4000,
      opciones_venta: [
        { tipo: 'botella', precio: 22000, comision: 4000 },
        { tipo: 'shot', precio: 2500, comision: 0, precio_anfitriona: 3000 }
      ]
    });
    expect(fetchMock.mock.calls.some(([url]) => url === '/api/products/producto')).toBe(false);
    await waitFor(() =>
      expect(
        fetchMock.mock.calls.some(
          ([url, init]) => url === '/api/products/producto/tiers' && init?.method === 'PUT'
        )
      ).toBe(true)
    );
    const [, tiersRequest] = fetchMock.mock.calls.find(
      ([url, init]) => url === '/api/products/producto/tiers' && init?.method === 'PUT'
    )!;
    expect(JSON.parse(tiersRequest.body).tiers[1].precio).toBe(35000);
  });
});
