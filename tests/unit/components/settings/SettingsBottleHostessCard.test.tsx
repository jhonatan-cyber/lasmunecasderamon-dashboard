import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { SettingsBottleHostessCard } from '@/components/settings/SettingsBottleHostessCard';
import { invalidateSettingsProducts } from '@/hooks/settings/useSettingsProducts';

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
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

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const productos = [
  {
    id: 'p1',
    code: 'W1',
    name: 'Whisky',
    categoria: 'Licores',
    price: 200000,
    commission: 10000,
    max_anfitrionas: null,
    status: 1
  },
  {
    id: 'p2',
    code: 'C1',
    name: 'Solo shot',
    categoria: 'Licores',
    price: 5000,
    commission: 1000,
    max_anfitrionas: null,
    status: 1
  },
  {
    id: 'p3',
    code: 'A1',
    name: 'Solo almacén',
    categoria: 'Licores',
    price: 8000,
    commission: 1000,
    max_anfitrionas: null,
    status: 1
  }
];

describe('SettingsBottleHostessCard', () => {
  it('interpreta el cero guardado como regla por defecto y permite guardar la presentacion', async () => {
    invalidateSettingsProducts();
    const request = vi.fn(async (url: string, init?: any) => {
      if (init?.method) return { ok: true, json: async () => ({ success: true }) };
      if (String(url).includes('/api/bar'))
        return {
          ok: true,
          json: async () => ({
            success: true,
            data: [
              {
                id: 'pres-p1',
                producto_id: 'p1',
                nombre: '350ml',
                opciones_venta: [{ tipo: 'botella', precio: 10000, comision: 500 }]
              }
            ]
          })
        };
      return {
        ok: true,
        json: async () => ({ success: true, data: [{ ...productos[0], max_anfitrionas: 0 }] })
      };
    });
    vi.stubGlobal('fetch', request);
    render(<SettingsBottleHostessCard />);
    const max = await screen.findByLabelText('Máximo de anfitrionas');
    expect(max).toHaveValue(null);
    expect(screen.queryByText('regla por defecto')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Guardar cambios/i }));
    await waitFor(() =>
      expect(request).toHaveBeenCalledWith(
        '/api/products/presentations',
        expect.objectContaining({ method: 'PATCH' })
      )
    );
  });

  it('lista solo productos del bar que se venden por botella, guarda y vuelve al default', async () => {
    invalidateSettingsProducts();
    let getCount = 0;
    const request = vi.fn(async (url: string, init?: any) => {
      if (init?.method === 'PUT' || init?.method === 'PATCH')
        return { ok: true, json: async () => ({ success: true }) };
      if (String(url).includes('/tiers'))
        return { ok: true, json: async () => ({ success: true, data: [] }) };
      if (String(url).includes('/api/bar')) {
        return {
          ok: true,
          json: async () => ({
            success: true,
            data: [
              {
                id: 'pres-p1',
                nombre: '750ml',
                producto_id: 'p1',
                opciones_venta: [
                  { tipo: 'botella', precio: 200000, comision: 10000 },
                  {
                    tipo: 'shot',
                    precio: 5000,
                    comision: 0,
                    precio_anfitriona: 5000,
                    ml_acompanamiento_anfitriona: 150,
                    precios_anfitriona: [{ precio: 5000, comision: 1000 }]
                  }
                ]
              },
              { producto_id: 'p2', opciones_venta: [{ tipo: 'shot', precio: 5000, comision: 0 }] }
            ]
          })
        };
      }
      getCount += 1;
      return {
        ok: true,
        json: async () => ({
          success: true,
          data: getCount > 1 ? [{ ...productos[0], max_anfitrionas: 3 }] : productos
        })
      };
    });
    vi.stubGlobal('fetch', request);

    render(<SettingsBottleHostessCard />);
    await waitFor(() =>
      expect(screen.getByLabelText('Producto y presentación')).toBeInTheDocument()
    );
    // Solo botella del bar; el solo-shot y el solo-almacén no se listan.
    expect(screen.getAllByText(/Solo shot/).length).toBeGreaterThan(0);
    expect(screen.queryByText(/Solo almacén/)).not.toBeInTheDocument();
    // El listado muestra el precio y al elegir se cargan precio y comisión.
    expect(screen.getByRole('button', { name: /Whisky.*200\.000/ })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Whisky.*200\.000/ }));
    await waitFor(() =>
      expect(screen.getByLabelText('Precio de botella con anfitriona')).toHaveValue('200.000')
    );
    expect(screen.getByLabelText('Comisión (requerida)')).toHaveValue('10.000');
    expect(screen.queryByText(/Vigente:/)).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Máximo de anfitrionas'), { target: { value: '3' } });
    await screen.findByLabelText('Precio para 3 anfitrionas');
    fireEvent.change(screen.getByLabelText('Comisión (requerida)'), { target: { value: '12000' } });
    expect(screen.queryByLabelText('Ml bebida analcohólica cliente')).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Ml bebida analcohólica anfitriona'), {
      target: { value: '150' }
    });
    fireEvent.click(screen.getByRole('button', { name: /Guardar Cambios/ }));

    await waitFor(() => {
      const patch = request.mock.calls.find(args => args[1]?.method === 'PATCH');
      expect(patch?.[0]).toBe('/api/products/presentations');
      expect(JSON.parse(patch![1].body)).toEqual({
        id: 'pres-p1',
        precio_venta: 200000,
        comision: 12000,
        opciones_venta: [
          {
            tipo: 'botella',
            precio: 200000,
            comision: 12000,
            colacion_habilitada: false,
            acompanamiento: { unidades: 0 }
          },
          {
            tipo: 'shot',
            precio: 5000,
            comision: 0,
            precio_anfitriona: 5000,
            ml_acompanamiento_anfitriona: 150,
            precios_anfitriona: [{ precio: 5000, comision: 1000 }]
          }
        ]
      });
      const productPut = request.mock.calls.find(
        args => args[0] === '/api/products/p1' && args[1]?.method === 'PUT'
      );
      expect(JSON.parse(productPut![1].body)).toEqual({
        max_anfitrionas: 3,
        ml_shot: null,
        ml_shot_anfitriona: null
      });
    });
    await waitFor(() => expect(screen.getByLabelText('Máximo de anfitrionas')).toHaveValue(3));

    fireEvent.click(screen.getByRole('button', { name: /Volver al default/ }));
    await waitFor(() => {
      const puts = request.mock.calls.filter(args => args[1]?.method === 'PUT');
      const last = puts[puts.length - 1];
      expect(JSON.parse(last![1].body)).toEqual({ max_anfitrionas: null });
    });
  });

  it('permite fijar hasta 20 anfitrionas y guarda la tabla completa', async () => {
    invalidateSettingsProducts();
    const request = vi.fn(async (url: string, init?: any) => {
      if (init?.method === 'PUT' || init?.method === 'PATCH')
        return { ok: true, json: async () => ({ success: true }) };
      if (String(url).includes('/tiers'))
        return { ok: true, json: async () => ({ success: true, data: [] }) };
      if (String(url).includes('/api/bar')) {
        return {
          ok: true,
          json: async () => ({
            success: true,
            data: [
              {
                id: 'pres-p1',
                nombre: '750ml',
                producto_id: 'p1',
                opciones_venta: [{ tipo: 'botella', precio: 200000, comision: 10000 }]
              }
            ]
          })
        };
      }
      return { ok: true, json: async () => ({ success: true, data: productos }) };
    });
    vi.stubGlobal('fetch', request);

    render(<SettingsBottleHostessCard />);
    await screen.findByLabelText('Producto y presentación');
    fireEvent.click(screen.getByRole('button', { name: /Whisky.*200\.000/ }));
    // El campo vive dentro del editor de configuración de venta, como en la transferencia.
    const max = await screen.findByLabelText('Máximo de anfitrionas');
    fireEvent.change(max, { target: { value: '12' } });
    await screen.findByLabelText('Precio para 12 anfitrionas');
    expect(screen.queryByLabelText('Precio para 13 anfitrionas')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Guardar Cambios/ }));

    await waitFor(() => {
      const productPut = request.mock.calls.find(
        args => args[0] === '/api/products/p1' && args[1]?.method === 'PUT'
      );
      expect(JSON.parse(productPut![1].body)).toEqual({ max_anfitrionas: 12 });
      const tiersPut = request.mock.calls.find(
        args => String(args[0]).includes('/tiers') && args[1]?.method === 'PUT'
      );
      const tiers = JSON.parse(tiersPut![1].body).tiers;
      expect(tiers).toHaveLength(12);
      expect(tiers[11]).toEqual({ anfitrionas: 12, precio: 200000, comision: 10000 });
    });
  });

  it('permite fijar el máximo de anfitrionas aunque la botella no tenga comisión', async () => {
    invalidateSettingsProducts();
    const request = vi.fn(async (url: string, init?: any) => {
      if (init?.method === 'PUT' || init?.method === 'PATCH')
        return { ok: true, json: async () => ({ success: true }) };
      if (String(url).includes('/tiers'))
        return { ok: true, json: async () => ({ success: true, data: [] }) };
      if (String(url).includes('/api/bar')) {
        return {
          ok: true,
          json: async () => ({
            success: true,
            data: [
              {
                id: 'pres-p1',
                nombre: '750ml',
                producto_id: 'p1',
                opciones_venta: [{ tipo: 'botella', precio: 200000, comision: 0 }]
              }
            ]
          })
        };
      }
      return { ok: true, json: async () => ({ success: true, data: productos }) };
    });
    vi.stubGlobal('fetch', request);

    render(<SettingsBottleHostessCard />);
    await screen.findByLabelText('Producto y presentación');
    fireEvent.click(screen.getByRole('button', { name: /Whisky.*200\.000/ }));

    const max = await screen.findByLabelText('Máximo de anfitrionas');
    expect(max).toHaveValue(null);
    expect(max).toHaveAttribute('placeholder', 'Default');
    expect(screen.queryByText(/regla por defecto del producto/)).not.toBeInTheDocument();
    fireEvent.change(max, { target: { value: '2' } });
    await screen.findByLabelText('Precio para 2 anfitrionas');
  });

  it('muestra y guarda la tabla de precios cuando el producto es champagne', async () => {
    invalidateSettingsProducts();
    const request = vi.fn(async (url: string, init?: any) => {
      if (String(url).includes('/tiers')) {
        if (init?.method === 'PUT') return { ok: true, json: async () => ({ success: true }) };
        return {
          ok: true,
          json: async () => ({
            success: true,
            data: [{ anfitrionas: 2, precio: 160000, comision: 20000 }]
          })
        };
      }
      if (String(url).includes('/api/bar')) {
        return {
          ok: true,
          json: async () => ({
            success: true,
            data: [
              {
                id: 'pres-p9',
                nombre: '750ml',
                producto_id: 'p9',
                opciones_venta: [{ tipo: 'botella', precio: 120000, comision: 20000 }]
              }
            ]
          })
        };
      }
      return {
        ok: true,
        json: async () => ({
          success: true,
          data: [
            {
              id: 'p9',
              code: 'CH1',
              name: 'Champagne Oro',
              categoria: 'Champagne',
              price: 120000,
              commission: 20000,
              max_anfitrionas: 2,
              status: 1
            }
          ]
        })
      };
    });
    vi.stubGlobal('fetch', request);

    render(<SettingsBottleHostessCard />);
    await waitFor(() =>
      expect(screen.getByLabelText('Precio para 2 anfitrionas')).toHaveValue('160.000')
    );
    fireEvent.change(screen.getByLabelText('Precio para 2 anfitrionas'), {
      target: { value: '170000' }
    });
    fireEvent.click(screen.getByRole('button', { name: /Guardar Cambios/ }));
    await waitFor(() => {
      const put = request.mock.calls.find(
        args => args[1]?.method === 'PUT' && String(args[0]).includes('/tiers')
      );
      expect(put?.[0]).toBe('/api/products/p9/tiers');
      expect(JSON.parse(put![1].body)).toEqual({
        tiers: [
          { anfitrionas: 1, precio: 120000, comision: 20000 },
          { anfitrionas: 2, precio: 170000, comision: 20000 }
        ]
      });
    });
  });
});
