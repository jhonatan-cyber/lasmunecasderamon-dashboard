import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ColacionesTab, antiguedadActualizacion } from '@/components/colaciones/ColacionesTab';

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock('@/hooks/caja/useCashRegisterStatus', () => ({
  useCashRegisterStatus: () => ({ hasOpenCaja: true, cajaInfo: { id_caja: 'caja-1' } })
}));
// Permisos del usuario con el que se renderiza la pestaña. El vocabulario es
// el del catálogo (`products.view`, `products.create`, `products.edit`), no el
// de la matriz de flags que usa el servidor.
const permisos = vi.hoisted(() => ({
  set: new Set<string>(['products.view', 'products.create', 'products.edit'])
}));
vi.mock('@/hooks/auth/useUserPermissions', () => ({
  useUserPermissions: () => ({
    hasPermission: (module: string, action: string) => permisos.set.has(`${module}.${action}`)
  })
}));

const realtime = vi.hoisted(() => ({
  resource: '',
  refresh: null as null | (() => unknown)
}));
vi.mock('@/hooks/realtime/useRealtimeRefresh', () => ({
  useRealtimeRefresh: (resource: string, refresh: () => unknown) => {
    realtime.resource = resource;
    realtime.refresh = refresh;
  }
}));

const anfitriona = {
  id: 'w-anf',
  name: 'Ana',
  lastName: 'Anfitriona',
  role: 'anfitriona'
};
const cajera = { id: 'w-caj', name: 'Carla', lastName: 'Cajera', role: 'cajero' };

const productosColacion = [
  {
    presentacion_id: 'p-whisky',
    presentacion_nombre: '750 ml',
    producto_nombre: 'Whisky',
    ml_botella: 750,
    opciones_venta: [
      { tipo: 'botella', ml_colacion: 750, acompanamiento: { tipo: 'gaseosa', unidades: 2 } }
    ],
    categoria_nombre: 'Licores',
    stock_bar: 3,
    ml_abierta: 420
  },
  {
    presentacion_id: 'p-ron',
    presentacion_nombre: '700 ml',
    producto_nombre: 'Ron',
    ml_botella: 700,
    opciones_venta: [
      {
        tipo: 'botella',
        ml_colacion: 120,
        acompanamiento_colacion: { unidades: 3, ml: 90 }
      }
    ],
    categoria_nombre: 'Licores',
    stock_bar: 4
  }
];
const acompanamientosBar = [
  {
    id: 'p-cola',
    producto_nombre: 'Coca-Cola',
    nombre: '1.5 L',
    stock_bar: 10,
    ml_abierta: 900,
    ml_botella: 1500
  },
  {
    id: 'p-soda',
    producto_nombre: 'Soda',
    nombre: '1 L',
    stock_bar: 2,
    ml_abierta: 0,
    ml_botella: 1000
  },
  {
    id: 'p-whisky',
    producto_nombre: 'Whisky',
    nombre: '750 ml',
    stock_bar: 3,
    ml_abierta: 0,
    ml_botella: 750
  }
];
const analcoholicas = [
  {
    presentacion_id: 'p-sprite',
    presentacion_nombre: '350 ml',
    producto_nombre: 'Sprite',
    ml_botella: 350,
    opciones_venta: [{ tipo: 'botella', ml_colacion: 200 }],
    categoria_nombre: 'Bebidas analcohólicas',
    stock_bar: 8
  },
  {
    presentacion_id: 'p-gin',
    presentacion_nombre: '750 ml',
    producto_nombre: 'Gin',
    ml_botella: 750,
    opciones_venta: [
      { tipo: 'botella', ml_colacion: 60, acompanamiento_colacion: { unidades: 1, ml: 50 } }
    ],
    categoria_nombre: 'Licores',
    stock_bar: 2
  }
];

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.useRealTimers();
  permisos.set = new Set(['products.view', 'products.create', 'products.edit']);
});

function stubFetch(onPost: (body: any) => void = () => {}) {
  const request = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const ok = (data: unknown) => ({ ok: true, json: async () => ({ success: true, data }) });
    if (url.startsWith('/api/users')) return ok([anfitriona, cajera]);
    if (url.includes('solo_colaciones_analcoholicas=true')) return ok(analcoholicas);
    if (url.includes('solo_colaciones=true')) return ok(productosColacion);
    if (url.startsWith('/api/bar')) return ok(acompanamientosBar);
    if (url.startsWith('/api/colaciones')) {
      if (init?.method === 'POST') {
        onPost(JSON.parse(String(init.body)));
        return ok({});
      }
      return ok([]);
    }
    throw new Error(`URL inesperada: ${url}`);
  });
  vi.stubGlobal('fetch', request);
  return request;
}

async function selectWorker(name: string) {
  await waitFor(() => expect(screen.getByText('0 registrados')).toBeInTheDocument());
  fireEvent.click(screen.getByRole('combobox'));
  const search = await screen.findByPlaceholderText('Buscar trabajador…');
  fireEvent.change(search, { target: { value: name } });
  fireEvent.click(await screen.findByRole('option', { name: new RegExp(name, 'i') }));
}

describe('ColacionesTab por rol', () => {
  it('muestra en cards los productos habilitados para colación de la anfitriona', async () => {
    stubFetch();
    render(<ColacionesTab />);
    await selectWorker('Ana');

    const group = await screen.findByRole('group', {
      name: 'Productos habilitados para colación'
    });
    expect(group).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Whisky/ })).toBeInTheDocument();
    const mlAbierto = screen.getByText('Abierta: 420 ml · hace un momento');
    expect(mlAbierto).toHaveAttribute(
      'title',
      expect.stringMatching(/^Ml abierto actualizado a las \d{1,2}:\d{2} \(hace un momento\)$/)
    );
    expect(mlAbierto.className).not.toContain('text-amber-600');
    expect(screen.queryByRole('button', { name: /Sprite/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('combobox', { name: /bebida/i })).not.toBeInTheDocument();
    expect(
      screen.queryByRole('group', { name: 'Ml del producto seleccionado' })
    ).not.toBeInTheDocument();
  });

  it('muestra en cards las bebidas analcohólicas para cajero, garzón y barman', async () => {
    stubFetch();
    render(<ColacionesTab />);
    await selectWorker('Carla');

    const group = await screen.findByRole('group', { name: 'Bebidas analcohólicas' });
    expect(group).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Sprite/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Whisky/ })).not.toBeInTheDocument();

    const card = screen.getByRole('button', { name: /Sprite/ });
    expect(card).toHaveTextContent('Producto: 350 ml');
    expect(card).toHaveTextContent('Colación: 200 ml');

    // El panel lateral muestra solo el producto elegido, no todo el catálogo.
    const mlSeleccionado = screen.getByRole('group', {
      name: 'Ml del producto seleccionado'
    });
    expect(mlSeleccionado).toHaveTextContent('Selecciona una bebida.');

    fireEvent.click(card);
    await waitFor(() => expect(mlSeleccionado).toHaveTextContent('Producto'));
    expect(mlSeleccionado).toHaveTextContent('350 ml');
    expect(mlSeleccionado).toHaveTextContent('200 ml');
    expect(mlSeleccionado).not.toHaveTextContent('Whisky');
  });

  it('usa los ml configurados para la colación de una analcohólica', async () => {
    const bodies: any[] = [];
    stubFetch(body => bodies.push(body));
    render(<ColacionesTab />);
    await selectWorker('Carla');

    fireEvent.click(await screen.findByRole('button', { name: /Sprite/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Registrar corto' }));

    await waitFor(() => expect(bodies).toHaveLength(1));
    expect(bodies[0]).toMatchObject({
      usuario_id: 'w-caj',
      presentacion_id: 'p-sprite',
      ml_bebida: 200,
      nombre_bebida: 'Sprite 350 ml'
    });
  });

  it('registra la card seleccionada con los ml de la botella', async () => {
    const bodies: any[] = [];
    stubFetch(body => bodies.push(body));
    render(<ColacionesTab />);
    await selectWorker('Ana');

    const card = await screen.findByRole('button', { name: /Whisky/ });
    fireEvent.click(card);
    expect(card).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText('Quedan 420 ml en la botella abierta.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Registrar corto' }));

    await waitFor(() => expect(bodies).toHaveLength(1));
    expect(bodies[0]).toEqual({
      usuario_id: 'w-anf',
      presentacion_id: 'p-whisky',
      ml_bebida: 750,
      nombre_bebida: 'Whisky 750 ml',
      acompanamiento: null,
      acompanamiento_presentacion_id: null
    });
  });

  it('refresca el ml abierto cuando cambia el inventario del bar', async () => {
    let mlAbierta = 200;
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        const ok = (data: unknown) => ({ ok: true, json: async () => ({ success: true, data }) });
        if (url.startsWith('/api/users')) return ok([anfitriona, cajera]);
        if (url.includes('solo_colaciones_analcoholicas=true'))
          return ok([{ ...analcoholicas[0], ml_abierta: mlAbierta }]);
        if (url.includes('solo_colaciones=true')) return ok(productosColacion);
        if (url.startsWith('/api/bar')) return ok(acompanamientosBar);
        if (url.startsWith('/api/colaciones')) return ok([]);
        throw new Error(`URL inesperada: ${url}`);
      })
    );
    render(<ColacionesTab />);
    await selectWorker('Carla');
    expect(await screen.findByText('Abierta: 200 ml · hace un momento')).toBeInTheDocument();

    mlAbierta = 900;
    await act(async () => {
      await realtime.refresh?.();
    });

    const actualizada = await screen.findByText('Abierta: 900 ml · hace un momento');
    expect(actualizada).toHaveAttribute(
      'title',
      expect.stringMatching(/^Ml abierto actualizado a las \d{1,2}:\d{2} \(hace un momento\)$/)
    );
    expect(realtime.resource).toBe('/api/products/for-sale');
  });

  it('usa el acompañamiento propio de la colación con sus ml', async () => {
    const bodies: any[] = [];
    stubFetch(body => bodies.push(body));
    render(<ColacionesTab />);
    await selectWorker('Ana');

    const card = await screen.findByRole('button', { name: /Ron/ });
    expect(card).toHaveTextContent('Acompañamiento: 3 × 90 ml');
    fireEvent.click(card);

    expect(await screen.findByText(/Incluye 3 bebidas de 90 ml por botella\./)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('combobox', { name: 'Acompañamiento' }));
    expect(await screen.findByRole('option', { name: /Coca-Cola/ })).toBeInTheDocument();
    // El stock se filtra por las unidades de la colación (Soda tiene 2).
    expect(screen.queryByRole('option', { name: /Soda/ })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('option', { name: /Coca-Cola/ }));

    // Antes de registrar ya se ve lo que se va a descontar y lo que queda abierto.
    expect(
      await screen.findByText('Se descontarán 270 ml · quedan 900 ml en botellas abiertas.')
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Registrar corto' }));

    await waitFor(() => expect(bodies).toHaveLength(1));
    expect(bodies[0]).toMatchObject({
      usuario_id: 'w-anf',
      presentacion_id: 'p-ron',
      ml_bebida: 120,
      acompanamiento_presentacion_id: 'p-cola'
    });
  });

  it('ofrece el acompañamiento a un rol de bar cuya bebida lo configura', async () => {
    const bodies: any[] = [];
    stubFetch(body => bodies.push(body));
    render(<ColacionesTab />);
    await selectWorker('Carla');

    const card = await screen.findByRole('button', { name: /Gin/ });
    expect(card).toHaveTextContent('Acompañamiento: 1 × 50 ml');
    fireEvent.click(card);

    // El selector no se limita a la anfitriona: el servidor cobra el
    // acompañamiento a cualquier rol cuya bebida lo tenga configurado.
    fireEvent.click(await screen.findByRole('combobox', { name: 'Acompañamiento' }));
    fireEvent.click(await screen.findByRole('option', { name: /Coca-Cola/ }));

    expect(
      await screen.findByText('Se descontarán 50 ml · quedan 900 ml en botellas abiertas.')
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Registrar corto' }));

    await waitFor(() => expect(bodies).toHaveLength(1));
    expect(bodies[0]).toMatchObject({
      usuario_id: 'w-caj',
      presentacion_id: 'p-gin',
      ml_bebida: 60,
      acompanamiento_presentacion_id: 'p-cola'
    });
  });

  it('una carga fallida no vacía la pestaña ni inventa un mensaje de sin stock', async () => {
    // El detalle del turno falla; el personal y los catálogos cargan bien.
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        const ok = (data: unknown) => ({ ok: true, json: async () => ({ success: true, data }) });
        if (url.startsWith('/api/users')) return ok([anfitriona, cajera]);
        if (url.includes('solo_colaciones_analcoholicas=true')) return ok(analcoholicas);
        if (url.includes('solo_colaciones=true')) return ok(productosColacion);
        if (url.startsWith('/api/bar')) return ok(acompanamientosBar);
        if (url.startsWith('/api/colaciones')) {
          return {
            ok: false,
            status: 403,
            json: async () => ({ success: false, message: 'Permisos insuficientes' })
          };
        }
        throw new Error(`URL inesperada: ${url}`);
      })
    );
    render(<ColacionesTab />);

    // El personal y el catálogo siguen disponibles.
    await selectWorker('Ana');
    expect(
      await screen.findByRole('group', { name: 'Productos habilitados para colación' })
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Whisky/ })).toBeInTheDocument();

    // El fallo se informa como tal, y no como "no hay colaciones" ni "sin stock".
    expect(await screen.findByText('Permisos insuficientes')).toBeInTheDocument();
    expect(screen.queryByText('Aún no hay colaciones en este turno')).not.toBeInTheDocument();
    expect(
      screen.queryByText('No hay productos habilitados para colación con stock en el bar.')
    ).not.toBeInTheDocument();
  });

  it('deja elegir el producto de acompañamiento cuando la botella lo incluye', async () => {
    const bodies: any[] = [];
    stubFetch(body => bodies.push(body));
    render(<ColacionesTab />);
    await selectWorker('Ana');

    fireEvent.click(await screen.findByRole('button', { name: /Whisky/ }));
    const selectAcompanamiento = await screen.findByRole('combobox', {
      name: 'Acompañamiento'
    });
    fireEvent.click(selectAcompanamiento);
    const cocaCola = await screen.findByRole('option', { name: /Coca-Cola/ });
    expect(screen.queryByRole('option', { name: /Whisky/ })).not.toBeInTheDocument();
    fireEvent.click(cocaCola);

    fireEvent.click(screen.getByRole('button', { name: 'Registrar corto' }));

    await waitFor(() => expect(bodies).toHaveLength(1));
    expect(bodies[0]).toMatchObject({
      usuario_id: 'w-anf',
      presentacion_id: 'p-whisky',
      acompanamiento_presentacion_id: 'p-cola'
    });
  });
});

describe('permisos de la pestaña', () => {
  it('muestra el detalle en Excel con permiso de lectura de productos', async () => {
    permisos.set = new Set(['products.view']);
    stubFetch();
    render(<ColacionesTab />);

    expect(
      await screen.findByRole('button', { name: 'Descargar detalle de colaciones del turno' })
    ).toBeInTheDocument();
  });

  it('oculta el detalle en Excel sin permiso de lectura de productos', async () => {
    permisos.set = new Set(['products.create']);
    stubFetch();
    render(<ColacionesTab />);

    await waitFor(() => expect(screen.getByText('0 registrados')).toBeInTheDocument());
    expect(
      screen.queryByRole('button', { name: 'Descargar detalle de colaciones del turno' })
    ).not.toBeInTheDocument();
  });

  it('muestra el formulario con permiso de edición de productos', async () => {
    // `products.edit` concede el flag `products.write` que exige el POST.
    permisos.set = new Set(['products.view', 'products.edit']);
    stubFetch();
    render(<ColacionesTab />);

    expect(await screen.findByRole('button', { name: 'Registrar corto' })).toBeInTheDocument();
  });

  it('oculta el formulario sin permiso de escritura de productos', async () => {
    permisos.set = new Set(['products.view']);
    stubFetch();
    render(<ColacionesTab />);

    await waitFor(() => expect(screen.getByText('0 registrados')).toBeInTheDocument());
    expect(screen.queryByRole('button', { name: 'Registrar corto' })).not.toBeInTheDocument();
    expect(screen.getByText('No tienes permiso para registrar colaciones.')).toBeInTheDocument();
  });
});

describe('antigüedad del ml abierto', () => {
  const actualizado = new Date('2026-10-19T21:00:00');

  it('dice «hace un momento» durante el primer minuto', () => {
    expect(antiguedadActualizacion(actualizado, actualizado.getTime() + 59_000)).toEqual({
      texto: 'hace un momento',
      desactualizada: false
    });
  });

  it('cuenta los minutos y resalta cuando el dato lleva varios sin refrescarse', () => {
    expect(antiguedadActualizacion(actualizado, actualizado.getTime() + 90_000)).toEqual({
      texto: 'hace 1 min',
      desactualizada: false
    });
    expect(antiguedadActualizacion(actualizado, actualizado.getTime() + 120_000)).toEqual({
      texto: 'hace 2 min',
      desactualizada: true
    });
  });

  it('devuelve null mientras no haya una actualización', () => {
    expect(antiguedadActualizacion(null, Date.now())).toBeNull();
  });

  it('resalta la card cuando el catálogo deja de refrescarse', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    stubFetch();
    render(<ColacionesTab />);
    await selectWorker('Ana');

    const fresco = await screen.findByText('Abierta: 420 ml · hace un momento');
    expect(fresco.className).not.toContain('text-amber-600');

    vi.setSystemTime(Date.now() + 5 * 60_000);
    await act(async () => {
      vi.advanceTimersByTime(16_000);
    });

    const viejo = await screen.findByText('Abierta: 420 ml · hace 5 min');
    expect(viejo.className).toContain('text-amber-600');
    expect(viejo).toHaveAttribute(
      'title',
      expect.stringMatching(/^Ml abierto actualizado a las \d{1,2}:\d{2} \(hace 5 min\)$/)
    );
  });

  it('ofrece recarga manual cuando el catálogo deja de refrescarse', async () => {
    let mlAbierta = 420;
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        const ok = (data: unknown) => ({ ok: true, json: async () => ({ success: true, data }) });
        if (url.startsWith('/api/users')) return ok([anfitriona, cajera]);
        if (url.includes('solo_colaciones_analcoholicas=true')) return ok(analcoholicas);
        if (url.includes('solo_colaciones=true'))
          return ok([{ ...productosColacion[0], ml_abierta: mlAbierta }]);
        if (url.startsWith('/api/bar')) return ok(acompanamientosBar);
        if (url.startsWith('/api/colaciones')) return ok([]);
        throw new Error(`URL inesperada: ${url}`);
      })
    );
    render(<ColacionesTab />);
    await selectWorker('Ana');

    expect(screen.queryByRole('button', { name: 'Actualizar ml abierto' })).not.toBeInTheDocument();

    vi.setSystemTime(Date.now() + 5 * 60_000);
    await act(async () => {
      vi.advanceTimersByTime(16_000);
    });

    const boton = await screen.findByRole('button', { name: 'Actualizar ml abierto' });
    expect(boton).toHaveTextContent('hace 5 min');

    mlAbierta = 900;
    await act(async () => {
      fireEvent.click(boton);
    });

    expect(await screen.findByText('Abierta: 900 ml · hace un momento')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Actualizar ml abierto' })).not.toBeInTheDocument();
  });
});
