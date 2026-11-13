import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { SaleOption } from '@/types/sale-options';

vi.unmock('@tanstack/react-query');
vi.mock('@/hooks/shared/useConfigValue', () => ({ useConfigValue: () => 50 }));
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
  CommandGroup: ({ children, heading }: { children: React.ReactNode; heading: string }) => (
    <div role='group' aria-label={heading}>
      {children}
    </div>
  ),
  CommandItem: ({ children, onSelect }: any) => <button onClick={onSelect}>{children}</button>
}));

const clients: QueryClient[] = [];
const mount = () => {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } }
  });
  clients.push(client);
  return render(
    <QueryClientProvider client={client}>
      <SettingsBottleHostessCard />
    </QueryClientProvider>
  );
};
beforeEach(() => {
  vi.clearAllMocks();
  invalidateSettingsProducts();
});
afterEach(() => {
  cleanup();
  clients.splice(0).forEach(client => client.clear());
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

function mockPersistedSettings(maximo: number | null = null) {
  const state = {
    product: { ...productos[0], max_anfitrionas: maximo },
    presentation: {
      id: 'pres-p1',
      producto_id: 'p1',
      nombre: '750ml',
      precio_venta: 200000,
      comision: 10000,
      ml_shot: 50 as number | null,
      ml_shot_anfitriona: 30 as number | null,
      opciones_venta: [
        { tipo: 'botella', precio: 200000, comision: 10000, precio_sin_anfitriona: 12000 },
        {
          tipo: 'shot',
          precio: 3000,
          comision: 0,
          precios_anfitriona: [{ precio: 5000, comision: 1000 }]
        }
      ] as SaleOption[]
    },
    failure: null as 'tiers' | 'product' | null,
    failureMode: 'http' as 'http' | 'network' | 'json',
    failBar: false,
    delayedBar: null as Promise<Response> | null,
    tiers: [] as { anfitrionas: number; precio: number; comision: number }[]
  };
  const request = vi.fn(async (url: string, init?: RequestInit) => {
    if (init?.method) {
      const failed =
        state.failure === 'tiers'
          ? url.endsWith('/tiers')
          : state.failure === 'product' && url === '/api/products/p1';
      if (failed) {
        if (state.failureMode === 'network') throw new Error('Sin conexión');
        if (state.failureMode === 'json') return new Response('invalid JSON', { status: 200 });
        return Response.json({ success: false, message: 'No guardado' }, { status: 500 });
      }
      const payload = JSON.parse(String(init.body)) as Partial<
        typeof state.presentation & typeof state.product
      > & {
        tiers: typeof state.tiers;
      };
      if (init.method === 'PATCH') Object.assign(state.presentation, payload);
      else if (url.endsWith('/tiers')) state.tiers = payload.tiers;
      else {
        Object.assign(state.product, payload);
        if (payload.ml_shot !== undefined) state.presentation.ml_shot = payload.ml_shot;
        if (payload.ml_shot_anfitriona !== undefined)
          state.presentation.ml_shot_anfitriona = payload.ml_shot_anfitriona;
      }
      return Response.json({ success: true });
    }
    if (url === '/api/bar') {
      if (state.failBar) return Response.json({ success: false }, { status: 500 });
      if (state.delayedBar) return state.delayedBar;
      return Response.json({ success: true, data: [state.presentation] });
    }
    if (url.endsWith('/tiers')) return Response.json({ success: true, data: state.tiers });
    return Response.json({ success: true, data: [state.product] });
  });
  vi.stubGlobal('fetch', request);
  return { state, request };
}

const saveButton = () => screen.getByRole('button', { name: /Guardar Cambios|Guardando/i });
const waitForSave = () => waitFor(() => expect(saveButton()).toBeEnabled());

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
    mount();
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

  it('agrupa las presentaciones del bar, incluidas las de solo corto, guarda y vuelve al default', async () => {
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
                    acompanamiento_cliente: true,
                    precio_anfitriona: 5000,
                    ml_acompanamiento_anfitriona: 150,
                    precios_anfitriona: [{ precio: 5000, comision: 1000 }]
                  }
                ]
              },
              {
                id: 'pres-p2',
                nombre: '750ml',
                producto_id: 'p2',
                opciones_venta: [{ tipo: 'shot', precio: 5000, comision: 0 }]
              }
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

    mount();
    await waitFor(() =>
      expect(screen.getByLabelText('Elige un producto y presentación')).toBeInTheDocument()
    );
    expect(screen.getByRole('group', { name: 'Licores' })).toHaveTextContent('Solo shot');
    expect(screen.getByRole('group', { name: 'Licores' })).toHaveTextContent('Whisky');
    fireEvent.click(screen.getByRole('button', { name: /Solo shot/ }));
    expect(screen.getByLabelText('Precio corto cliente')).toHaveValue('5.000');
    expect(screen.queryByLabelText('Precio de botella con anfitriona')).not.toBeInTheDocument();
    expect(screen.queryByText(/Solo almacén/)).not.toBeInTheDocument();
    // El listado muestra el precio y al elegir se cargan precio y comisión.
    expect(screen.getByRole('button', { name: /Whisky.*200\.000/ })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Whisky.*200\.000/ }));
    await waitFor(() =>
      expect(screen.getByLabelText('Precio de botella con anfitriona')).toHaveValue('200.000')
    );
    expect(screen.getByLabelText('Comisión')).toHaveValue('10.000');
    expect(screen.queryByText(/Vigente:/)).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Máximo de anfitrionas'), { target: { value: '3' } });
    await screen.findByLabelText('Precio para 3 anfitrionas');
    fireEvent.change(screen.getByLabelText('Comisión'), { target: { value: '12000' } });
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
            vender_con_anfitriona: true,
            colacion_habilitada: false,
            acompanamiento: { unidades: 0 }
          },
          {
            tipo: 'shot',
            precio: 5000,
            comision: 0,
            acompanamiento_cliente: true,
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

    mount();
    await screen.findByLabelText('Elige un producto y presentación');
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

    mount();
    await screen.findByLabelText('Elige un producto y presentación');
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

    mount();
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

  it('reintenta la carga de presentaciones sin convertir un error en una lista vacía', async () => {
    const { state, request } = mockPersistedSettings();
    state.failBar = true;
    mount();
    expect(await screen.findByText(/No se pudo cargar el bar/)).toBeInTheDocument();
    expect(screen.queryByText(/No hay presentaciones/)).not.toBeInTheDocument();
    state.failBar = false;
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(await screen.findByLabelText('Precio de botella sin anfitriona')).toHaveValue('12.000');
    expect(request.mock.calls.filter(([url]) => url === '/api/bar')).toHaveLength(2);
  });

  it('envía el precio configurado de corto cuando no hay opción botella', async () => {
    const { state, request } = mockPersistedSettings();
    state.presentation.opciones_venta = [state.presentation.opciones_venta[1]];
    mount();
    await screen.findByLabelText('Precio corto cliente');
    fireEvent.change(screen.getByLabelText('Precio corto cliente'), { target: { value: '4500' } });
    fireEvent.click(saveButton());
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Presentación actualizada'));
    const patch = request.mock.calls.find(([, init]) => init?.method === 'PATCH');
    expect(JSON.parse(String(patch?.[1]?.body))).toMatchObject({ precio_venta: 4500, comision: 0 });
  });

  it('conserva SIN, flags y cortos durante la recarga y en un segundo guardado', async () => {
    const { state, request } = mockPersistedSettings();
    mount();
    await screen.findByLabelText('Precio de botella sin anfitriona');
    fireEvent.change(screen.getByLabelText('Precio de botella sin anfitriona'), {
      target: { value: '35000' }
    });
    fireEvent.click(screen.getByLabelText('Vender con anfitriona'));
    fireEvent.click(screen.getByLabelText('Habilitar bebida para colación'));
    fireEvent.change(screen.getByLabelText('Precio corto cliente'), { target: { value: '4000' } });
    fireEvent.change(screen.getByLabelText('Precio corto anfitriona'), {
      target: { value: '6000' }
    });
    fireEvent.change(screen.getByLabelText('Ml corto cliente'), { target: { value: '60' } });
    fireEvent.change(screen.getByLabelText('Ml corto anfitriona'), { target: { value: '40' } });
    let reload!: (value: Response) => void;
    state.delayedBar = new Promise(resolve => {
      reload = resolve;
    });
    fireEvent.click(saveButton());
    await waitFor(() =>
      expect(request.mock.calls.filter(([url]) => url === '/api/bar')).toHaveLength(2)
    );
    expect(screen.getByLabelText('Precio de botella sin anfitriona')).toHaveValue('35.000');
    expect(screen.getByLabelText('Vender con anfitriona')).not.toBeChecked();
    expect(saveButton()).toBeDisabled();
    reload(Response.json({ success: true, data: [state.presentation] }));
    state.delayedBar = null;
    await waitForSave();
    expect(screen.getByLabelText('Precio corto cliente')).toHaveValue('4.000');
    expect(screen.getByLabelText('Ml corto anfitriona')).toHaveValue('40');
    expect(screen.getByLabelText('Habilitar bebida para colación')).toBeChecked();
    fireEvent.click(saveButton());
    await waitFor(() => expect(toast.success).toHaveBeenCalledTimes(2));
    const patches = request.mock.calls.filter(([, init]) => init?.method === 'PATCH');
    expect(patches).toHaveLength(2);
    expect(JSON.parse(String(patches[1][1]?.body))).toEqual(
      JSON.parse(String(patches[0][1]?.body))
    );
    expect(JSON.parse(String(patches[1][1]?.body))).toMatchObject({
      precio_venta: 0,
      comision: 0,
      opciones_venta: [
        {
          tipo: 'botella',
          precio: 0,
          comision: 0,
          vender_con_anfitriona: false,
          precio_sin_anfitriona: 35000,
          colacion_habilitada: true
        },
        { tipo: 'shot', precio: 4000, precios_anfitriona: [{ precio: 6000, comision: 1000 }] }
      ]
    });
    expect(state.presentation.ml_shot).toBe(60);
    expect(state.product).toMatchObject({ ml_shot: 60, ml_shot_anfitriona: 40 });
  });

  it.each(['http', 'network', 'json'] as const)(
    'refresca lo persistido cuando falla la tabla (%s) y permite reintentar',
    async mode => {
      const { state, request } = mockPersistedSettings(2);
      state.failure = 'tiers';
      state.failureMode = mode;
      mount();
      await screen.findByLabelText('Precio para 2 anfitrionas');
      fireEvent.change(screen.getByLabelText('Precio de botella sin anfitriona'), {
        target: { value: '36000' }
      });
      fireEvent.click(saveButton());
      await waitFor(() =>
        expect(toast.error).toHaveBeenCalledWith(
          expect.stringContaining('Presentación guardada; no se pudo guardar la tabla')
        )
      );
      expect(toast.success).not.toHaveBeenCalled();
      expect(request.mock.calls.filter(([url]) => url === '/api/bar')).toHaveLength(2);
      expect(screen.getByLabelText('Precio de botella sin anfitriona')).toHaveValue('36.000');
      expect(state.presentation.opciones_venta[0].precio_sin_anfitriona).toBe(36000);
      state.failure = null;
      await screen.findByLabelText('Precio para 2 anfitrionas');
      await waitForSave();
      fireEvent.click(saveButton());
      await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Presentación actualizada'));
      expect(state.tiers).toHaveLength(2);
    }
  );

  it('identifica el fallo de ml, conserva la presentación guardada y recarga sin borrar ante otro error', async () => {
    const { state, request } = mockPersistedSettings();
    state.failure = 'product';
    mount();
    await screen.findByLabelText('Ml corto cliente');
    fireEvent.change(screen.getByLabelText('Ml corto cliente'), { target: { value: '60' } });
    fireEvent.change(screen.getByLabelText('Precio de botella sin anfitriona'), {
      target: { value: '37000' }
    });
    state.failBar = true;
    fireEvent.click(saveButton());
    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith(
        expect.stringContaining('máximo de anfitrionas y los ml por corto')
      )
    );
    expect(screen.getByRole('alert')).toHaveTextContent('Se conserva la última configuración');
    expect(screen.getByLabelText('Precio de botella sin anfitriona')).toHaveValue('37.000');
    expect(saveButton()).toBeDisabled();
    expect(screen.queryByText(/No hay presentaciones/)).not.toBeInTheDocument();
    state.failure = null;
    state.failBar = false;
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    await waitForSave();
    expect(screen.getByLabelText('Precio de botella sin anfitriona')).toHaveValue('37.000');
    expect(screen.getByLabelText('Ml corto cliente')).toHaveValue('50');
    fireEvent.change(screen.getByLabelText('Ml corto cliente'), { target: { value: '60' } });
    fireEvent.click(saveButton());
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Presentación actualizada'));
    const patches = request.mock.calls.filter(([, init]) => init?.method === 'PATCH');
    expect(JSON.parse(String(patches[1][1]?.body))).toEqual(
      JSON.parse(String(patches[0][1]?.body))
    );
  });
});
