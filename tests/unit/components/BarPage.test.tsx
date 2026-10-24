import React from 'react';
import { afterEach, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import BarPage from '@/app/bar/page';
import { TooltipProvider } from '@/components/ui/tooltip';
import { seleccionarFecha } from '../helpers/datePicker';
vi.mock('@/components/auth/PermissionGuard', () => ({
  PermissionGuard: ({ children }: any) => children
}));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ hasPermission: () => true }) }));
const user = { id: 1, role: 'barman' };
vi.mock('@/hooks/auth/useCurrentUser', () => ({
  useCurrentUser: () => ({ user, loading: false })
}));
vi.mock('@/hooks/shared/useConfigValue', () => ({ useConfig: () => 50 }));
vi.mock('@/hooks/shared', () => ({ useSharedSSE: vi.fn() }));
vi.mock('@/hooks/products/useContainerScan', () => ({
  useContainerScan: () => ({ sesion: [], aceptados: 0, rechazados: 0, enCola: 0 }),
  MOTIVO_ENVASE: {}
}));
vi.mock('boneyard-js/react', () => ({ Skeleton: ({ children }: any) => children }));
vi.mock('@/components/bar/BarProductGrid', () => ({
  BarProductGrid: ({ items }: any) => (
    <ul aria-label='Productos'>
      {items.map((item: any) => (
        <li key={item.id}>{item.producto_nombre}</li>
      ))}
    </ul>
  )
}));
// El contexto de arrastre se reemplaza por su callback: así se prueba el
// guardado del orden sin simular punteros sobre la tabla.
const reorderGroup = vi.hoisted(() => ({
  enabled: false,
  onMove: null as null | ((activeId: string, overId: string) => void)
}));
vi.mock('@/components/bar/BarReorderGroup', () => ({
  BarReorderGroup: ({ enabled, onMove, children }: any) => {
    reorderGroup.enabled = enabled;
    reorderGroup.onMove = onMove;
    return children;
  }
}));
vi.mock('@/components/bar/BarReorderRow', () => ({
  BarReorderRow: ({ children }: any) => <tr>{children}</tr>
}));
vi.mock('@/components/bar/BarStatsCards', () => ({ BarStatsCards: () => null }));
vi.mock('@/components/bar/SalePrices', () => ({ SalePrices: () => null }));
vi.mock('@/components/bar/BarAnfitrionas', () => ({
  BarAnfitrionas: () => null,
  isTierPricedItem: () => false
}));
vi.mock('@/components/products/EscaneoLote', () => ({ EscaneoLote: () => null }));
vi.mock('@/components/products/ProductImageLightbox', () => ({ ProductImageLightbox: () => null }));
vi.mock('@/components/shared/ProductPhoto', () => ({ ProductPhoto: () => null }));
vi.mock('@/components/shared/selects/SortSelect', () => ({
  SortSelect: ({ field, onChange }: any) => (
    <>
      <p>Orden: {field}</p>
      <button onClick={() => onChange('stock_bar', 'asc')}>Ordenar stock ascendente</button>
    </>
  )
}));
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
const mount = () =>
  render(
    <TooltipProvider>
      <BarPage />
    </TooltipProvider>
  );
const stock = [
  { id: 'a', producto_nombre: 'Ron', nombre: '750 ml', stock_bar: '20' },
  { id: 'b', producto_nombre: 'Whisky', nombre: '750 ml', stock_bar: '3' }
];
const response = (data: unknown) => Response.json({ success: true, data });
it('reintenta el stock y ordena por cantidades numéricas', async () => {
  let failed = true;
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string) =>
      url === '/api/bar'
        ? failed
          ? Response.json({ success: false }, { status: 500 })
          : response(stock)
        : response({})
    )
  );
  mount();
  expect(await screen.findByRole('alert')).toHaveTextContent('los productos');
  expect(screen.queryByText('Sin productos')).not.toBeInTheDocument();
  failed = false;
  fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
  const list = await screen.findByRole('list', { name: 'Productos' });
  expect(screen.getByText('23 unidades en bar')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Ordenar stock ascendente' }));
  expect(
    within(list)
      .getAllByRole('listitem')
      .map(el => el.textContent)
  ).toEqual(['Whisky', 'Ron']);
});
it.each([
  ['pendientes', 'Pendientes', 'las recepciones pendientes'],
  ['historial', 'Historial', 'el historial de movimientos'],
  ['envases', 'Envases', 'el historial de envases']
])('muestra el error de %s y permite recuperarse', async (_tab, label, message) => {
  let failed = true;
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string) =>
      url === '/api/bar'
        ? response([])
        : url === '/api/bar/shots'
          ? response({})
          : failed
            ? Response.json({ success: false }, { status: 500 })
            : response([])
    )
  );
  mount();
  fireEvent.mouseDown(screen.getByRole('tab', { name: label }), { button: 0, ctrlKey: false });
  expect(await screen.findByRole('alert')).toHaveTextContent(message);
  failed = false;
  fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
  expect(
    await screen.findByText(
      label === 'Pendientes'
        ? 'No hay solicitudes pendientes.'
        : label === 'Envases'
          ? 'Sin envases entregados todavía.'
          : 'Sin movimientos registrados.'
    )
  ).toBeInTheDocument();
});

it('muestra en el historial los ml descontados por botella en una colación', async () => {
  const colacion = {
    id: 'col-1',
    tipo: 'colacion',
    estado: 'completada',
    producto_id: 'prod-1',
    producto_nombre: 'Whisky',
    presentacion_nombre: '750 ml',
    cantidad: 0,
    ml: 150,
    precio_venta: 0,
    comision: 0,
    usuario_nombre: 'barman',
    fecha_crea: '2026-10-20 13:00:00',
    unidades_consumidas: [
      { unidad_id: 'u-1', codigo: 'LM-000123', codigo_barras: null, ml_consumido: 150 }
    ]
  };
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string) => {
      if (url === '/api/bar') return response(stock);
      if (url.startsWith('/api/bar/movements')) return response([colacion]);
      if (url === '/api/bar/shots') return response({});
      return response([]);
    })
  );
  mount();
  fireEvent.mouseDown(screen.getByRole('tab', { name: 'Historial' }), {
    button: 0,
    ctrlKey: false
  });

  expect(await screen.findByText('Colación')).toBeInTheDocument();
  expect(screen.getByText('LM-000123: 150 ml')).toBeInTheDocument();
  expect(screen.getByText('150 ml')).toBeInTheDocument();
});

it('filtra el historial por tipo de movimiento, incluidas las colaciones', async () => {
  const venta = {
    id: 'v-1',
    tipo: 'venta',
    estado: 'completada',
    producto_id: 'prod-2',
    producto_nombre: 'Ron',
    presentacion_nombre: '700 ml',
    cantidad: 2,
    ml: 100,
    precio_venta: 3000,
    comision: 0,
    usuario_nombre: 'caja',
    fecha_crea: '2026-10-20 12:00:00',
    unidades_consumidas: []
  };
  const colacion = {
    id: 'col-1',
    tipo: 'colacion',
    estado: 'completada',
    producto_id: 'prod-1',
    producto_nombre: 'Whisky',
    presentacion_nombre: '750 ml',
    cantidad: 0,
    ml: 150,
    precio_venta: 0,
    comision: 0,
    usuario_nombre: 'barman',
    fecha_crea: '2026-10-20 13:00:00',
    unidades_consumidas: []
  };
  const traspaso = {
    id: 't-1',
    tipo: 'traspaso',
    estado: 'aceptada',
    producto_id: 'prod-1',
    producto_nombre: 'Whisky',
    presentacion_nombre: '750 ml',
    cantidad: 1,
    precio_venta: null,
    comision: null,
    usuario_nombre: 'jefe',
    aceptado_nombre: 'recepcionista',
    fecha_crea: '2026-10-19 22:00:00',
    unidades_consumidas: []
  };
  const fetcher = vi.fn(async (url: string) => {
    if (url === '/api/bar') return response(stock);
    if (url.startsWith('/api/bar/movements')) return response([venta, colacion, traspaso]);
    if (url === '/api/bar/shots') return response({});
    return response([]);
  });
  vi.stubGlobal('fetch', fetcher);
  mount();
  fireEvent.mouseDown(screen.getByRole('tab', { name: 'Historial' }), {
    button: 0,
    ctrlKey: false
  });

  // Sin filtro se ven los tres tipos con su etiqueta de estado. Las
  // consultas se acotan a la tabla: el tab «Colación» también lleva ese texto.
  expect(await screen.findByText('Vendida')).toBeInTheDocument();
  const tabla = screen.getByRole('table');
  expect(within(tabla).getByText('Colación')).toBeInTheDocument();
  expect(within(tabla).getByText('Aceptada')).toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: 'Colaciones' }));
  expect(within(tabla).getByText('Colación')).toBeInTheDocument();
  expect(within(tabla).queryByText('Vendida')).not.toBeInTheDocument();
  expect(within(tabla).queryByText('Aceptada')).not.toBeInTheDocument();
  // El tipo también viaja al servidor, para que el total por página sea del filtro.
  expect(fetcher.mock.calls.some(([url]) => String(url).includes('tipo=colacion'))).toBe(true);

  fireEvent.click(screen.getByRole('button', { name: 'Traspasos' }));
  expect(within(tabla).getByText('Aceptada')).toBeInTheDocument();
  expect(within(tabla).queryByText('Colación')).not.toBeInTheDocument();

  // Sin filas del tipo elegido se avisa que el filtro no coincide.
  fireEvent.click(screen.getByRole('button', { name: 'Devoluciones' }));
  expect(
    within(tabla).getByText('Sin movimientos que coincidan con el filtro.')
  ).toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: 'Todos' }));
  expect(within(tabla).getByText('Vendida')).toBeInTheDocument();
  expect(within(tabla).getByText('Colación')).toBeInTheDocument();
  expect(within(tabla).getByText('Aceptada')).toBeInTheDocument();

  // Cada chip refiltra también en el servidor; se resuelven antes de cerrar.
  await act(async () => {});
});

it('bloquea nuevas aprobaciones mientras una recepción se procesa', async () => {
  let complete!: (value: Response) => void;
  const pending = stock.map((item, index) => ({
    ...item,
    id: 'transfer-' + index,
    cantidad: 1,
    estado: 'pendiente',
    fecha_crea: '2026-10-14',
    presentacion_nombre: '750 ml'
  }));
  const fetcher = vi.fn(async (url: string, options?: RequestInit) => {
    if (options?.method === 'PATCH')
      return new Promise<Response>(resolve => {
        complete = resolve;
      });
    return response(url === '/api/transfers/pending' ? pending : url === '/api/bar' ? stock : {});
  });
  vi.stubGlobal('fetch', fetcher);
  mount();
  fireEvent.mouseDown(screen.getByRole('tab', { name: 'Pendientes' }), {
    button: 0,
    ctrlKey: false
  });
  const buttons = await screen.findAllByRole('button', { name: 'Aprobar' });
  fireEvent.click(buttons[0]);
  buttons.forEach(button => expect(button).toBeDisabled());
  fireEvent.click(buttons[1]);
  expect(fetcher.mock.calls.filter(([, options]) => options?.method === 'PATCH')).toHaveLength(1);
  await act(async () => {
    complete(response({}));
  });
  await waitFor(() => expect(screen.getAllByRole('button', { name: 'Aprobar' })[0]).toBeEnabled());
});

it('guarda el orden manual de las presentaciones del bar', async () => {
  const fetcher = vi.fn(async (url: string, options?: RequestInit) => {
    if (url === '/api/bar') return response(stock);
    if (url === '/api/bar/reorder') return response({});
    return response({});
  });
  vi.stubGlobal('fetch', fetcher);
  mount();
  expect(await screen.findByText('Ron')).toBeInTheDocument();

  // En la tabla se expone el mismo callback que usan las tarjetas.
  fireEvent.click(screen.getByRole('button', { name: 'Cambiar a tabla' }));
  await act(async () => {
    await reorderGroup.onMove?.('b', 'a');
  });

  const put = fetcher.mock.calls.find(([, options]) => options?.method === 'PUT');
  expect(put?.[0]).toBe('/api/bar/reorder');
  expect(JSON.parse(String(put?.[1]?.body))).toEqual({
    presentation_orders: [
      { id: 'b', orden: 1 },
      { id: 'a', orden: 2 }
    ]
  });
});

it('permite arrastrar con otro orden y pasa a orden manual al soltar', async () => {
  const fetcher = vi.fn(async (url: string, options?: RequestInit) => {
    if (url === '/api/bar') return response(stock);
    if (url === '/api/bar/reorder') return response({});
    return response({});
  });
  vi.stubGlobal('fetch', fetcher);
  mount();
  expect(await screen.findByText('Ron')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Cambiar a tabla' }));

  // Con el listado ordenado por stock el arrastre sigue habilitado.
  fireEvent.click(screen.getByRole('button', { name: 'Ordenar stock ascendente' }));
  expect(screen.getByText('Orden: stock_bar')).toBeInTheDocument();
  expect(reorderGroup.enabled).toBe(true);

  await act(async () => {
    await reorderGroup.onMove?.('a', 'b');
  });

  // Al soltar, el listado pasa a orden manual con lo que el usuario movió y se
  // avisa brevemente por qué se reacomodó.
  expect(screen.getByText('Orden: orden')).toBeInTheDocument();
  expect(screen.getByText(/El listado pasó a orden manual/)).toBeInTheDocument();
  const put = fetcher.mock.calls.find(([, options]) => options?.method === 'PUT');
  expect(put?.[0]).toBe('/api/bar/reorder');
  expect(JSON.parse(String(put?.[1]?.body))).toEqual({
    presentation_orders: [
      { id: 'a', orden: 1 },
      { id: 'b', orden: 2 }
    ]
  });
});

it('permite recuperar el resumen de cortos después de un fallo', async () => {
  let failed = true;
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string) =>
      url === '/api/bar/shots'
        ? failed
          ? Response.json({ success: false }, { status: 500 })
          : response({})
        : response([])
    )
  );
  mount();
  expect(await screen.findByRole('alert')).toHaveTextContent('resumen del bar');
  failed = false;
  fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
  await waitFor(() => expect(screen.queryByRole('alert')).not.toBeInTheDocument());
});

const filaMovimiento = (id: string, fecha: string, tipo = 'venta') => ({
  id,
  tipo,
  estado: 'completada',
  producto_id: 'prod-1',
  producto_nombre: 'Ron',
  presentacion_nombre: '700 ml',
  cantidad: 1,
  precio_venta: 3000,
  comision: 0,
  usuario_nombre: 'caja',
  fecha_crea: fecha,
  unidades_consumidas: []
});

it('pagina el historial en el servidor más allá de los últimos movimientos', async () => {
  const paginasPedidas: (string | null)[] = [];
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string) => {
      if (url === '/api/bar') return response(stock);
      if (url.startsWith('/api/bar/movements')) {
        const params = new URL(url, 'http://localhost').searchParams;
        const pagina = Number(params.get('page') ?? '1');
        paginasPedidas.push(params.get('page'));
        return Response.json({
          success: true,
          data: [filaMovimiento(`mov-${pagina}`, '2026-10-20 13:00:00')],
          meta: { total: 250, pagina, paginas: 3, limite: 100 }
        });
      }
      return response({});
    })
  );
  mount();
  fireEvent.mouseDown(screen.getByRole('tab', { name: 'Historial' }), {
    button: 0,
    ctrlKey: false
  });

  expect(await screen.findByText('Página 1 de 3')).toBeInTheDocument();
  expect(screen.getByText('250 movimientos')).toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: 'Siguiente' }));

  expect(await screen.findByText('Página 2 de 3')).toBeInTheDocument();
  expect(paginasPedidas).toContain('2');
  await act(async () => {});
});

it('filtra el historial por fecha en el servidor y permite limpiar el rango', async () => {
  const pedidos: URLSearchParams[] = [];
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string) => {
      if (url === '/api/bar') return response(stock);
      if (url.startsWith('/api/bar/movements')) {
        pedidos.push(new URL(url, 'http://localhost').searchParams);
        return Response.json({
          success: true,
          data: [filaMovimiento('mov-dia', '2026-10-19 21:00:00')],
          meta: { total: 1, pagina: 1, paginas: 1, limite: 100 }
        });
      }
      return response({});
    })
  );
  mount();
  fireEvent.mouseDown(screen.getByRole('tab', { name: 'Historial' }), {
    button: 0,
    ctrlKey: false
  });
  expect(await screen.findByText('Página 1 de 1')).toBeInTheDocument();

  seleccionarFecha('Fecha desde', '2026-10-19');
  await waitFor(() => expect(pedidos.some(p => p.get('desde') === '2026-10-19')).toBe(true));

  seleccionarFecha('Fecha hasta', '2026-10-19');
  await waitFor(() => expect(pedidos.some(p => p.get('hasta') === '2026-10-19')).toBe(true));

  fireEvent.click(screen.getByRole('button', { name: 'Limpiar filtro de fecha' }));
  await waitFor(() => expect(pedidos[pedidos.length - 1]?.get('desde')).toBeNull());
  expect(pedidos[pedidos.length - 1]?.get('hasta')).toBeNull();
  await act(async () => {});
});
