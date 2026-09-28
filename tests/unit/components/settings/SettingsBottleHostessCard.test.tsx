import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { SettingsBottleHostessCard } from '@/components/settings/SettingsBottleHostessCard';
import { invalidateSettingsProducts } from '@/hooks/settings/useSettingsProducts';

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

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
  it('lista solo productos del bar que se venden por botella, guarda y vuelve al default', async () => {
    let getCount = 0;
    const request = vi.fn(async (url: string, init?: any) => {
      if (init?.method === 'PUT') return { ok: true, json: async () => ({ success: true }) };
      if (String(url).includes('/api/bar')) {
        return {
          ok: true,
          json: async () => ({
            success: true,
            data: [
              {
                producto_id: 'p1',
                opciones_venta: [
                  { tipo: 'botella', precio: 200000, comision: 10000 },
                  { tipo: 'shot', precio: 5000, comision: 1000 }
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
    await waitFor(() => expect(screen.getByLabelText('Producto')).toBeInTheDocument());
    // Solo botella del bar; el solo-shot y el solo-almacén no se listan.
    expect(screen.queryByText(/Solo shot/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Solo almacén/)).not.toBeInTheDocument();
    // El listado muestra el precio y al elegir se cargan precio y comisión.
    expect(screen.getByRole('option', { name: /Whisky.*200\.000/ })).toBeInTheDocument();
    await waitFor(() => expect(screen.getByLabelText('Precio venta')).toHaveValue('200.000'));
    expect(screen.getByLabelText('Comisión')).toHaveValue('10.000');
    expect(screen.getByText(/Vigente:/).textContent).toMatch(/regla por defecto/);

    fireEvent.change(screen.getByLabelText('Máx. anfitrionas'), { target: { value: '3' } });
    fireEvent.change(screen.getByLabelText('Comisión'), { target: { value: '12000' } });
    fireEvent.click(screen.getByRole('button', { name: /Guardar Cambios/ }));

    await waitFor(() => {
      const put = request.mock.calls.find(args => args[1]?.method === 'PUT');
      expect(put?.[0]).toBe('/api/products/p1');
      expect(JSON.parse(put![1].body)).toEqual({
        precio: 200000,
        comision: 12000,
        max_anfitrionas: 3
      });
    });
    await waitFor(() => expect(screen.getByText(/Vigente:/).textContent).toMatch(/Máx\. 3 anf\./));

    fireEvent.click(screen.getByRole('button', { name: /Volver al default/ }));
    await waitFor(() => {
      const puts = request.mock.calls.filter(args => args[1]?.method === 'PUT');
      const last = puts[puts.length - 1];
      expect(JSON.parse(last![1].body)).toEqual({ max_anfitrionas: null });
    });
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
            data: [{ anfitrionas: 1, precio: 120000, comision: 20000 }]
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
              max_anfitrionas: null,
              status: 1
            }
          ]
        })
      };
    });
    vi.stubGlobal('fetch', request);

    render(<SettingsBottleHostessCard />);
    await waitFor(() =>
      expect(screen.getByLabelText('Precio para 1 anfitrionas')).toHaveValue('120.000')
    );
    fireEvent.change(screen.getByLabelText('Precio para 1 anfitrionas'), {
      target: { value: '130000' }
    });
    fireEvent.click(screen.getByRole('button', { name: /Guardar precios/ }));
    await waitFor(() => {
      const put = request.mock.calls.find(
        args => args[1]?.method === 'PUT' && String(args[0]).includes('/tiers')
      );
      expect(put?.[0]).toBe('/api/products/p9/tiers');
      expect(JSON.parse(put![1].body)).toEqual({
        tiers: [{ anfitrionas: 1, precio: 130000, comision: 20000 }]
      });
    });
  });
});
