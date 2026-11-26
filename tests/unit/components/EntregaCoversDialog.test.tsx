import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { EntregaCoversDialog, type GrupoCover } from '@/components/bar/EntregaCoversDialog';

vi.mock('@tanstack/react-query', async importOriginal =>
  importOriginal<typeof import('@tanstack/react-query')>()
);

vi.mock('@/components/shared/AcompanamientoDistribuidor', () => ({
  AcompanamientoDistribuidor: ({
    opciones,
    requeridas,
    valor,
    onChange,
    disabled
  }: {
    opciones: { id: string; stock_bar: number }[];
    requeridas: number;
    valor: { presentacion_id: string; unidades: number }[];
    onChange: (valor: { presentacion_id: string; unidades: number }[]) => void;
    disabled: boolean;
  }) => (
    <div>
      {opciones.map(opcion => {
        const actual = valor.find(item => item.presentacion_id === opcion.id)?.unidades ?? 0;
        return (
          <button
            key={opcion.id}
            disabled={
              disabled ||
              actual >= opcion.stock_bar ||
              valor.reduce((total, item) => total + item.unidades, 0) >= requeridas
            }
            onClick={() =>
              onChange([
                ...valor.filter(item => item.presentacion_id !== opcion.id),
                { presentacion_id: opcion.id, unidades: actual + 1 }
              ])
            }
          >
            Repartir {opcion.id}
          </button>
        );
      })}
    </div>
  )
}));

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function grupo(cantidad: number, montoEntrada = 5000): GrupoCover {
  return {
    id: 'g-1',
    cliente: 'Mesa 1',
    filas: Array.from({ length: cantidad }, (_, indice) => ({
      id: `t-${indice}`,
      monto_entrada: montoEntrada,
      hora: '22:00'
    })),
    cantidad,
    total: cantidad * montoEntrada,
    montoUnitario: montoEntrada,
    metodo: 'efectivo',
    hora: '22:00',
    registradoPor: 'Carla'
  };
}

function bebida(nombre: string, categoria: string, corte: number) {
  return {
    presentacion_id: `p-${nombre}`,
    presentacion_nombre: '750 ml',
    producto_nombre: nombre,
    precio_venta: 20000,
    stock_bar: 3,
    ml_botella: 0,
    ml_shot: 0,
    categoria_nombre: categoria,
    foto: null,
    // La botella queda fuera del presupuesto: cada producto ofrece solo su corte.
    opciones_venta: [
      { tipo: 'shot', precio: corte },
      { tipo: 'botella', precio: 20000, precio_sin_anfitriona: 20000 }
    ]
  };
}

function stubCatalogo(
  productos: ReturnType<typeof bebida>[],
  covers: unknown[] = [],
  fallaEntrega = false
) {
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const ok = (data: unknown) => ({ ok: true, json: async () => ({ success: true, data }) });
    if (url.includes('solo_cover=true')) return ok(covers);
    if (url.startsWith('/api/products/for-sale')) return ok(productos);
    if (url === '/api/tickets/cover-solicitudes' && init?.method === 'POST')
      return ok({ id: 'solicitud-1' });
    if (url === '/api/tickets/entregar-grupo' && init?.method === 'POST') {
      if (fallaEntrega)
        return { ok: false, json: async () => ({ success: false, message: 'Stock cambió' }) };
      return ok({
        entradas: 1,
        productos: 3,
        montoEntrada: 5000,
        montoCobrarBarra: 4000,
        presupuesto: 9000
      });
    }
    throw new Error(`URL inesperada: ${url}`);
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

function renderDialog(
  cantidad: number,
  montoEntrada: number,
  tope: number,
  modo: 'entrega' | 'solicitud' = 'entrega'
) {
  const onClose = vi.fn();
  const onEntregado = vi.fn();
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <EntregaCoversDialog
        grupo={grupo(cantidad, montoEntrada)}
        tope={tope}
        modo={modo}
        onClose={onClose}
        onEntregado={onEntregado}
      />
    </QueryClientProvider>
  );
  return { onClose, onEntregado };
}

async function abrirCategoria(nombre: string) {
  fireEvent.click(await screen.findByRole('button', { name: new RegExp(nombre, 'i') }));
}

describe('EntregaCoversDialog', () => {
  it('no exige acompañamiento al corte cuando está deshabilitado en la configuración', async () => {
    const producto = bebida('Whisky', 'Licores', 2000);
    stubCatalogo(
      [
        {
          ...producto,
          opciones_venta: producto.opciones_venta.map(opcion =>
            opcion.tipo === 'shot' ? { ...opcion, acompanamiento_cliente: false } : opcion
          )
        }
      ],
      [{ presentacion_id: 'cover-1', producto_nombre: 'Coca-Cola', stock_bar: 3 }]
    );
    const { onClose } = renderDialog(1, 5000, 10000);
    await abrirCategoria('Licores');
    fireEvent.click(await screen.findByRole('button', { name: /Whisky/ }));
    expect(screen.queryByRole('button', { name: 'Repartir cover-1' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Entregar 1 en la barra' }));
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
  });

  it('ofrece bebidas dentro del tope aunque cover_habilitado esté desactivado', async () => {
    const producto = bebida('Whisky', 'Licores', 2000);
    stubCatalogo([
      {
        ...producto,
        opciones_venta: producto.opciones_venta.map(opcion =>
          opcion.tipo === 'botella' ? { ...opcion, cover_habilitado: false } : opcion
        )
      }
    ]);
    renderDialog(1, 5000, 10000);
    await abrirCategoria('Licores');
    expect(await screen.findByRole('button', { name: /Whisky/ })).toBeInTheDocument();
  });

  it('suma un adicional al total de cinco entradas para una botella grupal', async () => {
    const fetchMock = stubCatalogo([
      {
        ...bebida('Whisky', 'Licores', 2000),
        precio_venta: 60000,
        opciones_venta: [
          { tipo: 'shot', precio: 2000 },
          { tipo: 'botella', precio: 60000, precio_sin_anfitriona: 60000 }
        ]
      }
    ]);
    renderDialog(5, 10000, 10000);
    fireEvent.change(screen.getByLabelText('Monto adicional del grupo'), {
      target: { value: '10000' }
    });
    await abrirCategoria('Licores');

    const opciones = await screen.findAllByRole('button', { name: /Whisky/ });
    fireEvent.click(opciones.find(opcion => within(opcion).queryByText('Botella sin anfitriona'))!);
    fireEvent.click(screen.getByRole('button', { name: 'Entregar 1 en la barra' }));

    await waitFor(() =>
      expect(fetchMock.mock.calls.some(([url]) => url === '/api/tickets/entregar-grupo')).toBe(true)
    );
    const llamada = fetchMock.mock.calls.find(([url]) => url === '/api/tickets/entregar-grupo');
    expect(JSON.parse(String(llamada?.[1]?.body))).toMatchObject({
      entrada_ids: ['t-0', 't-1', 't-2', 't-3', 't-4'],
      monto_adicional: 10000,
      unidades: [{ presentacion_id: 'p-Whisky', tipo_entrega: 'botella', acompanamientos: null }]
    });
  });

  it('permite ampliar individualmente el tope con un adicional', async () => {
    const fetchMock = stubCatalogo([
      {
        ...bebida('Whisky', 'Licores', 2000),
        precio_venta: 15000,
        opciones_venta: [
          { tipo: 'shot', precio: 2000 },
          { tipo: 'botella', precio: 15000, precio_sin_anfitriona: 15000 }
        ]
      }
    ]);
    renderDialog(1, 10000, 10000);
    fireEvent.change(screen.getByLabelText('Monto adicional individual'), {
      target: { value: '5000' }
    });
    await abrirCategoria('Licores');

    const opciones = await screen.findAllByRole('button', { name: /Whisky/ });
    fireEvent.click(opciones.find(opcion => within(opcion).queryByText('Botella sin anfitriona'))!);
    fireEvent.click(screen.getByRole('button', { name: 'Entregar 1 en la barra' }));

    await waitFor(() =>
      expect(fetchMock.mock.calls.some(([url]) => url === '/api/tickets/entregar-grupo')).toBe(true)
    );
    const llamada = fetchMock.mock.calls.find(([url]) => url === '/api/tickets/entregar-grupo');
    expect(JSON.parse(String(llamada?.[1]?.body))).toMatchObject({
      entrada_ids: ['t-0'],
      monto_adicional: 5000,
      unidades: [{ presentacion_id: 'p-Whisky', tipo_entrega: 'botella', acompanamientos: null }]
    });
  });

  it('entrega varios productos con una entrada, una petición de grupo y el aporte íntegro', async () => {
    const fetchMock = stubCatalogo([bebida('Whisky', 'Licores', 2000)]);
    const { onClose } = renderDialog(1, 5000, 10000);
    await abrirCategoria('Licores');
    const producto = await screen.findByRole('button', { name: /Whisky/ });
    fireEvent.change(screen.getByLabelText('Monto adicional individual'), {
      target: { value: '4000' }
    });
    fireEvent.click(producto);
    fireEvent.click(producto);
    fireEvent.click(producto);
    expect(screen.getByText(/3 productos para 1 entrada/)).toBeInTheDocument();
    expect(producto).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Entregar 3 en la barra' }));
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
    const entregas = fetchMock.mock.calls.filter(
      ([url, init]) => String(url).includes('/tickets/') && init?.method === 'POST'
    );
    expect(entregas).toHaveLength(1);
    expect(entregas[0]![0]).toBe('/api/tickets/entregar-grupo');
    const payload = JSON.parse(String(entregas[0]![1]?.body)) as {
      entrada_ids: string[];
      monto_adicional: number;
      unidades: unknown[];
    };
    expect(payload.entrada_ids).toEqual(['t-0']);
    expect(payload.monto_adicional).toBe(4000);
    expect(payload.unidades).toEqual(
      Array.from({ length: 3 }, () => ({
        presentacion_id: 'p-Whisky',
        tipo_entrega: 'corte',
        acompanamientos: null
      }))
    );
  });

  it('usa todas las entradas aunque haya menos productos y no cobra diferencias individuales', async () => {
    const fetchMock = stubCatalogo([bebida('Whisky', 'Licores', 6000)]);
    const { onClose } = renderDialog(3, 5000, 10000);
    await abrirCategoria('Licores');
    fireEvent.click(await screen.findByRole('button', { name: /Whisky/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Entregar 1 en la barra' }));
    await waitFor(() => expect(onClose).toHaveBeenCalled());
    const llamada = fetchMock.mock.calls.find(([url]) => url === '/api/tickets/entregar-grupo');
    expect(JSON.parse(String(llamada?.[1]?.body))).toMatchObject({
      entrada_ids: ['t-0', 't-1', 't-2'],
      monto_adicional: 0
    });
  });

  it('bloquea la reducción de aporte que excedería presupuesto sin cambiar la selección', async () => {
    stubCatalogo([bebida('Whisky', 'Licores', 2000)]);
    renderDialog(1, 5000, 10000);
    await abrirCategoria('Licores');
    const producto = await screen.findByRole('button', { name: /Whisky/ });
    const aporte = screen.getByLabelText('Monto adicional individual');
    fireEvent.change(aporte, { target: { value: '4000' } });
    fireEvent.click(producto);
    fireEvent.click(producto);
    fireEvent.click(producto);
    fireEvent.change(aporte, { target: { value: '500' } });
    expect(aporte).toHaveValue('4000');
    expect(screen.getByRole('alert')).toHaveTextContent('Quita productos antes de reducir');
    expect(screen.getByText(/3 productos para 1 entrada/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Entregar 3 en la barra' })).toBeEnabled();
  });

  it('limita stock acumulado entre el corte y la botella de la misma presentación', async () => {
    const producto = bebida('Whisky', 'Licores', 2000);
    producto.stock_bar = 1;
    producto.opciones_venta[1]!.precio_sin_anfitriona = 4000;
    stubCatalogo([producto]);
    renderDialog(2, 5000, 10000);
    await abrirCategoria('Licores');
    const botones = await screen.findAllByRole('button', { name: /Whisky/ });
    fireEvent.click(botones.find(boton => within(boton).queryByText('Corte'))!);
    botones.forEach(boton => expect(boton).toBeDisabled());
    fireEvent.click(screen.getByRole('button', { name: 'Quitar una unidad' }));
    botones.forEach(boton => expect(boton).toBeEnabled());
  });

  it('permite varios cortes de una botella y acumula su consumo en mililitros', async () => {
    stubCatalogo([
      { ...bebida('Whisky', 'Licores', 1000), stock_bar: 1, ml_botella: 750, ml_shot: 50 }
    ]);
    renderDialog(1, 20000, 10000);
    await abrirCategoria('Licores');
    const botones = await screen.findAllByRole('button', { name: /Whisky/ });
    const corte = botones.find(boton => within(boton).queryByText('Corte'))!;
    for (let indice = 0; indice < 15; indice += 1) fireEvent.click(corte);
    expect(screen.getByText(/15 productos para 1 entrada/)).toBeInTheDocument();
    expect(corte).toBeDisabled();
  });

  it('con un fallo del grupo mantiene la selección sin cerrar ni refrescar parcialmente', async () => {
    stubCatalogo([bebida('Whisky', 'Licores', 2000)], [], true);
    const { onClose, onEntregado } = renderDialog(1, 5000, 10000);
    await abrirCategoria('Licores');
    fireEvent.click(await screen.findByRole('button', { name: /Whisky/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Entregar 1 en la barra' }));
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Entregar 1 en la barra' })).toBeEnabled()
    );
    expect(screen.getByText(/1 productos para 1 entrada/)).toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
    expect(onEntregado).not.toHaveBeenCalled();
  });
  it('reserva acompañamientos entre productos y libera el stock al quitar una línea', async () => {
    stubCatalogo(
      [bebida('Whisky', 'Licores', 2000), bebida('Ron', 'Licores', 2000)],
      [
        {
          presentacion_id: 'cover-1',
          producto_nombre: 'Coca-Cola',
          presentacion_nombre: '350 ml',
          stock_bar: 1
        }
      ]
    );
    renderDialog(2, 5000, 10000);
    await abrirCategoria('Licores');
    fireEvent.click(await screen.findByRole('button', { name: /Whisky/ }));
    fireEvent.click(screen.getByRole('button', { name: /Ron/ }));
    fireEvent.click(screen.getAllByRole('button', { name: 'Repartir cover-1' })[0]!);
    expect(screen.getAllByRole('button', { name: 'Repartir cover-1' })).toHaveLength(1);
    expect(screen.getByText(/stock de acompañamientos está reservado/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Entregar 2 en la barra' })).toBeDisabled();
    fireEvent.click(screen.getAllByRole('button', { name: 'Quitar producto' })[0]!);
    fireEvent.click(screen.getByRole('button', { name: 'Repartir cover-1' }));
    expect(screen.getByRole('button', { name: 'Entregar 1 en la barra' })).toBeEnabled();
  });

  it('agrupa el catálogo por categoría', async () => {
    stubCatalogo([
      bebida('Whisky', 'Licores', 4000),
      bebida('Agua tónica', 'Bebidas', 4000),
      bebida('Ron', 'Licores', 4000)
    ]);
    renderDialog(2, 5000, 5000);

    const categoriaLicores = await screen.findByRole('button', { name: /Licores/ });
    expect(screen.getByRole('button', { name: /Bebidas/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Whisky/ })).not.toBeInTheDocument();

    fireEvent.click(categoriaLicores);
    const licores = await screen.findByRole('region', { name: 'Licores' });
    expect(within(licores).getByRole('button', { name: /Whisky/ })).toBeInTheDocument();
    expect(within(licores).getByRole('button', { name: /Ron/ })).toBeInTheDocument();
    expect(within(licores).queryByRole('button', { name: /Agua tónica/ })).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Licores' })).toBeInTheDocument();
  });

  it('muestra categorías primero y respeta los formatos configurados al abrir una categoría', async () => {
    stubCatalogo([
      bebida('Whisky', 'Licores', 4000),
      bebida('Ron', 'Licores', 6000),
      bebida('Tequila', 'Premium', 6000),
      {
        ...bebida('Vino', 'Vinos', 3000),
        precio_venta: 3000,
        opciones_venta: [{ tipo: 'botella', precio: 3000, precio_sin_anfitriona: 3000 }]
      }
    ]);
    renderDialog(1, 5000, 5000);

    const licores = await screen.findByRole('button', { name: /Licores/ });
    expect(screen.getByRole('button', { name: /Vinos/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Premium/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Whisky/ })).not.toBeInTheDocument();

    fireEvent.click(licores);
    const whisky = await screen.findByRole('button', { name: /Whisky/ });
    expect(within(whisky).getByText('750 ml')).toBeInTheDocument();
    expect(within(whisky).getByText('Corte')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Ron/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Vino/ })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Categorías/ }));
    fireEvent.click(screen.getByRole('button', { name: /Vinos/ }));
    const vino = await screen.findByRole('button', { name: /Vino/ });
    expect(within(vino).getByText('Botella sin anfitriona')).toBeInTheDocument();
    expect(within(vino).queryByText('Corte')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Categorías/ }));
    fireEvent.click(screen.getByRole('button', { name: /Premium/ }));
    expect(
      await screen.findByText('Sin productos hasta $5.000 en esta categoría.')
    ).toBeInTheDocument();
  });

  it('limita el catálogo individual al tope y excluye productos sin stock', async () => {
    stubCatalogo([
      bebida('Whisky', 'Licores', 5000),
      bebida('Ron', 'Licores', 5001),
      { ...bebida('Vodka', 'Agotados', 1000), stock_bar: 0 }
    ]);
    renderDialog(1, 10000, 5000);

    await abrirCategoria('Licores');
    const licores = await screen.findByRole('region', { name: 'Licores' });
    expect(within(licores).getByRole('button', { name: /Whisky/ })).toBeInTheDocument();
    expect(within(licores).queryByRole('button', { name: /Ron/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Agotados' })).not.toBeInTheDocument();
  });

  it('permite al grupo elegir un producto sobre el tope individual si cabe en el total', async () => {
    stubCatalogo([bebida('Ron', 'Licores', 5001)]);
    renderDialog(2, 5000, 5000);

    await abrirCategoria('Licores');
    fireEvent.click(await screen.findByRole('button', { name: /Ron/ }));

    expect(screen.getByText(/1 productos para 2 entradas/)).toBeInTheDocument();
  });

  it('deja agregar hasta el tope del presupuesto y bloquea lo que no cabe', async () => {
    stubCatalogo([
      bebida('Whisky', 'Licores', 5000),
      bebida('Ron', 'Licores', 5000),
      bebida('Vodka', 'Licores', 5000),
      bebida('Pisco', 'Licores', 6000),
      bebida('Tequila', 'Licores', 8000)
    ]);
    // El presupuesto es compartido; el tope sigue aplicándose a cada producto.
    renderDialog(4, 4000, 10000);

    await abrirCategoria('Licores');
    fireEvent.click(await screen.findByRole('button', { name: /Whisky/ }));
    fireEvent.click(screen.getByRole('button', { name: /Ron/ }));

    expect(screen.getByText(/2 productos para 4 entradas/)).toBeInTheDocument();
    expect(screen.getByText('Quedan $6.000 de presupuesto.')).toBeInTheDocument();

    // El producto que calza exacto con lo que queda sí se puede elegir.
    const pisco = screen.getByRole('button', { name: /Pisco/ });
    const tequila = screen.getByRole('button', { name: /Tequila/ });
    expect(pisco).toBeEnabled();
    expect(tequila).toBeDisabled();
    expect(within(tequila).getByText('No alcanza el presupuesto')).toBeInTheDocument();

    fireEvent.click(tequila);
    expect(screen.getByText(/2 productos para 4 entradas/)).toBeInTheDocument();

    fireEvent.click(pisco);
    expect(screen.getByText(/3 productos para 4 entradas/)).toBeInTheDocument();
    expect(screen.getByText('Presupuesto completo.')).toBeInTheDocument();
    // Queda una entrada, pero ya no cabe ninguna unidad más en el presupuesto.
    expect(screen.getByRole('button', { name: /Vodka/ })).toBeDisabled();
    screen
      .getAllByRole('button', { name: 'Agregar una unidad' })
      .forEach(boton => expect(boton).toBeDisabled());
  });

  it('en modo solicitud pide autorización al cajero en vez de entregar', async () => {
    const fetchMock = stubCatalogo([bebida('Whisky', 'Licores', 2000)]);
    const { onClose, onEntregado } = renderDialog(1, 5000, 10000, 'solicitud');

    await abrirCategoria('Licores');
    fireEvent.click(await screen.findByRole('button', { name: /Whisky/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Solicitar 1 covers' }));

    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
    expect(onEntregado).toHaveBeenCalledTimes(1);
    const pedidos = fetchMock.mock.calls.filter(([, init]) => init?.method === 'POST');
    expect(pedidos).toHaveLength(1);
    expect(pedidos[0]![0]).toBe('/api/tickets/cover-solicitudes');
    expect(JSON.parse(String(pedidos[0]![1]?.body))).toMatchObject({
      grupo_registro_id: 'g-1',
      cliente_nombre: 'Mesa 1',
      entrada_ids: ['t-0'],
      monto_adicional: 0,
      unidades: [{ presentacion_id: 'p-Whisky', tipo_entrega: 'corte', acompanamientos: null }]
    });
    expect(fetchMock.mock.calls.some(([url]) => url === '/api/tickets/entregar-grupo')).toBe(false);
  });

  it('permite cambiar a entrega individual y envía solo la entrada elegida', async () => {
    const fetchMock = stubCatalogo([bebida('Whisky', 'Licores', 2000)]);
    renderDialog(3, 5000, 10000);

    await abrirCategoria('Licores');
    fireEvent.click(await screen.findByRole('button', { name: /Whisky/ }));
    expect(screen.getByText(/1 productos para 3 entradas/)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Monto adicional del grupo'), {
      target: { value: '5000' }
    });

    fireEvent.click(screen.getByText('Entrega individual'));
    expect(screen.queryByText(/1 productos para 3 entradas/)).not.toBeInTheDocument();
    expect(screen.getByLabelText('Monto adicional individual')).toHaveValue('');
    fireEvent.click(screen.getByText('Entrega grupal'));
    expect(screen.getByText(/3 entradas · \$15\.000/)).toBeInTheDocument();
    fireEvent.click(screen.getByText('Entrega individual'));
    expect(screen.getByText(/1 entrada · \$5\.000/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Entrada 2, $5.000, 22:00' }));
    fireEvent.click(await screen.findByRole('button', { name: /Whisky/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Entregar 1 en la barra' }));

    await waitFor(() =>
      expect(fetchMock.mock.calls.some(([url]) => url === '/api/tickets/entregar-grupo')).toBe(true)
    );
    const llamada = fetchMock.mock.calls.find(([url]) => url === '/api/tickets/entregar-grupo');
    expect(JSON.parse(String(llamada?.[1]?.body))).toMatchObject({
      entrada_ids: ['t-1'],
      monto_adicional: 0,
      unidades: [{ presentacion_id: 'p-Whisky', tipo_entrega: 'corte', acompanamientos: null }]
    });
  });

  it('con el presupuesto bajo el precio más barato no ofrece productos', async () => {
    stubCatalogo([bebida('Whisky', 'Licores', 5000)]);
    renderDialog(1, 4000, 10000);

    await abrirCategoria('Licores');
    expect(
      await screen.findByText('Sin productos hasta $4.000 en esta categoría.')
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Whisky/ })).not.toBeInTheDocument();
  });
});
