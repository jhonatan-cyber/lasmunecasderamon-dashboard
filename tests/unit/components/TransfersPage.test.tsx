import React from 'react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import TransfersPage from '@/app/transfers/page';

const auth = vi.hoisted(() => ({
  role: 'administrador',
  grants: [] as Array<[string, string]>
}));

vi.mock('@/contexts/AuthContext', () => {
  const hasPermission = (module: string, action: string) =>
    auth.role === 'administrador' ||
    auth.grants.some(([grantedModule, grantedAction]) => {
      return grantedModule === module && grantedAction === action;
    });
  return {
    useAuth: () => ({
      user: { id: 'u1', role: auth.role },
      userLoading: false,
      userPermissions: [],
      permissionsLoading: false,
      permissionsLoaded: true,
      hasPermission,
      hasAnyPermission: (module: string) =>
        auth.role === 'administrador' ||
        auth.grants.some(([grantedModule]) => grantedModule === module),
      hasAllPermissions: (module: string, actions: string[]) =>
        auth.role === 'administrador' || actions.every(action => hasPermission(module, action)),
      refreshUser: vi.fn(),
      refreshPermissions: vi.fn()
    })
  };
});

vi.mock('@/hooks/realtime/useRealtimeRefresh', () => ({ useRealtimeRefresh: vi.fn() }));

vi.mock('boneyard-js/react', () => ({
  Skeleton: ({ children }: { children?: React.ReactNode }) => children
}));

vi.mock('@/components/bar/TransferModal', async importOriginal => {
  const actual = await importOriginal<typeof import('@/components/bar/TransferModal')>();
  return {
    ...actual,
    TransferModal: ({ open, item }: { open: boolean; item: { producto_nombre: string } | null }) =>
      open ? <p>Modal abierto: {item?.producto_nombre}</p> : null
  };
});

const items = [
  {
    id: 'pres-1',
    producto_id: 'prod-1',
    producto_nombre: 'Whisky',
    producto_codigo: 'W1',
    producto_foto: null,
    nombre: '750 ml',
    codigo_barras: null,
    precio_compra: 1000,
    precio_venta: 20000,
    comision: 0,
    foto: null,
    stock: 5,
    stock_bar: 2,
    max_anfitrionas: 0,
    categoria_nombre: 'Licores'
  }
];

const history = [
  {
    id: 't1',
    estado: 'pendiente',
    producto_id: 'prod-1',
    producto_nombre: 'Whisky',
    presentacion_nombre: '750 ml',
    cantidad: 2,
    usuario_id: 'u2',
    usuario_nombre: 'Carla',
    fecha_crea: '2026-10-20 10:00:00',
    aceptado_por: null,
    aceptado_nombre: null,
    fecha_aceptacion: null,
    precio_venta: 20000,
    comision: 0,
    categoria_nombre: 'Licores',
    opciones_venta: []
  },
  {
    id: 't2',
    estado: 'aceptada',
    producto_id: 'prod-2',
    producto_nombre: 'Vino',
    presentacion_nombre: '750 ml',
    cantidad: 3,
    usuario_id: 'u3',
    usuario_nombre: 'Diego',
    fecha_crea: '2026-10-19 09:00:00',
    aceptado_por: 'u2',
    aceptado_nombre: 'Carla',
    fecha_aceptacion: '2026-10-19 10:30:00',
    precio_venta: 12000,
    comision: 0,
    categoria_nombre: 'Vinos',
    opciones_venta: []
  }
];

beforeEach(() => {
  auth.role = 'administrador';
  auth.grants = [];
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, data: { items, history } })
    })
  );
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

// Radix Tabs activa la pestaña en mousedown, no en click.
async function abrirPendientes() {
  const tab = await screen.findByRole('tab', { name: /Pendientes/ });
  fireEvent.mouseDown(tab);
  fireEvent.click(tab);
}

// La pestaña Productos agrupa por categoría (como Bodega): primero se muestra
// una tarjeta por categoría y recién al entrar aparecen sus productos.
async function abrirCategoriaLicores() {
  const card = await screen.findByRole('button', { name: /Licores/ });
  fireEvent.click(card);
}

it('el administrador puede aprobar y transferir aunque su rol no sea Barman', async () => {
  render(<TransfersPage />);
  await abrirCategoriaLicores();
  expect(
    await screen.findByRole('button', { name: 'Transferir Whisky 750 ml' })
  ).toBeInTheDocument();

  await abrirPendientes();
  expect(await screen.findByRole('button', { name: 'Aprobar' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Rechazar' })).toBeInTheDocument();
});

it('el botón Transferir usa products/create (write en la API), no accept_transfer', async () => {
  auth.role = 'cajero';
  auth.grants = [
    ['products', 'view'],
    ['products', 'create']
  ];
  render(<TransfersPage />);
  await abrirCategoriaLicores();

  const transferir = await screen.findByRole('button', { name: 'Transferir Whisky 750 ml' });
  fireEvent.click(transferir);
  expect(await screen.findByText('Modal abierto: Whisky')).toBeInTheDocument();

  await abrirPendientes();
  expect(await screen.findByText('No tienes permiso para aprobar.')).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Aprobar' })).not.toBeInTheDocument();
});

it('quien aprueba sin products/create ve los pendientes en solo consulta', async () => {
  auth.role = 'barman';
  auth.grants = [
    ['products', 'view'],
    ['products', 'accept_transfer']
  ];
  render(<TransfersPage />);
  await abrirCategoriaLicores();

  expect(await screen.findByText('Solo consulta')).toBeInTheDocument();
  expect(
    screen.queryByRole('button', { name: 'Transferir Whisky 750 ml' })
  ).not.toBeInTheDocument();

  await abrirPendientes();
  expect(await screen.findByRole('button', { name: 'Aprobar' })).toBeInTheDocument();
});

it('agrupa los productos por categoría y entra al elegir una', async () => {
  const varios = [
    {
      ...items[0],
      id: 'pres-1',
      producto_id: 'prod-1',
      producto_nombre: 'Whisky',
      categoria_nombre: 'Licores'
    },
    {
      ...items[0],
      id: 'pres-2',
      producto_id: 'prod-2',
      producto_nombre: 'Vino',
      categoria_nombre: 'Vinos'
    },
    {
      ...items[0],
      id: 'pres-3',
      producto_id: 'prod-3',
      producto_nombre: 'Agua',
      categoria_nombre: null
    }
  ];
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, data: { items: varios, history } })
    })
  );

  render(<TransfersPage />);

  // Nivel 1: una tarjeta por categoría; "Sin categoría" queda al final.
  expect(await screen.findByRole('button', { name: /Licores/ })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /Vinos/ })).toBeInTheDocument();
  const cards = screen.getAllByRole('button');
  expect(cards).toHaveLength(3);
  expect(cards[cards.length - 1]).toHaveTextContent('Sin categoría');
  // Los productos recién aparecen al entrar a la categoría.
  expect(
    screen.queryByRole('button', { name: 'Transferir Whisky 750 ml' })
  ).not.toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: /Licores/ }));
  expect(
    await screen.findByRole('button', { name: 'Transferir Whisky 750 ml' })
  ).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Transferir Vino 750 ml' })).not.toBeInTheDocument();

  // Volver a la grilla de categorías.
  fireEvent.click(screen.getByRole('button', { name: /Atrás/ }));
  expect(await screen.findByRole('button', { name: /Vinos/ })).toBeInTheDocument();
});

it('solo lista presentaciones con stock en bodega', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        data: {
          items: [
            {
              ...items[0],
              id: 'pres-1',
              producto_id: 'prod-1',
              producto_nombre: 'Whisky',
              stock: 3
            },
            { ...items[0], id: 'pres-2', producto_id: 'prod-2', producto_nombre: 'Vodka', stock: 0 }
          ],
          history
        }
      })
    })
  );

  render(<TransfersPage />);

  const card = await screen.findByRole('button', { name: /Licores/ });
  expect(card).toHaveTextContent('1 presentación');
  fireEvent.click(card);

  expect(
    await screen.findByRole('button', { name: 'Transferir Whisky 750 ml' })
  ).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Transferir Vodka 750 ml' })).not.toBeInTheDocument();
});

it('el historial abre un modal con el detalle completo de la transferencia', async () => {
  render(<TransfersPage />);
  await abrirCategoriaLicores();

  const tab = await screen.findByRole('tab', { name: /Historial/ });
  fireEvent.mouseDown(tab);
  fireEvent.click(tab);

  // jsdom no aplica las clases responsive: conviven la vista de tarjetas (móvil)
  // y la tabla (escritorio), por eso hay un botón de detalle en cada una.
  const botonesDetalle = await screen.findAllByRole('button', { name: 'Ver detalles de Vino' });
  expect(botonesDetalle).toHaveLength(2);
  fireEvent.click(botonesDetalle[0]);

  const dialog = await screen.findByRole('dialog');
  expect(within(dialog).getByText('Detalle de transferencia')).toBeInTheDocument();
  expect(within(dialog).getByText('Vino · 750 ml')).toBeInTheDocument();
  expect(within(dialog).getByText('Diego')).toBeInTheDocument();
  expect(within(dialog).getByText('Aprobada')).toBeInTheDocument();
  expect(within(dialog).getByText('Carla')).toBeInTheDocument();
});
