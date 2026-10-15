import React from 'react';
import { afterEach, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import BarPage from '@/app/bar/page';
import { TooltipProvider } from '@/components/ui/tooltip';
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
vi.mock('@/hooks/productos/useContainerScan', () => ({
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
  SortSelect: ({ onChange }: any) => (
    <button onClick={() => onChange('stock_bar', 'asc')}>Ordenar stock ascendente</button>
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
