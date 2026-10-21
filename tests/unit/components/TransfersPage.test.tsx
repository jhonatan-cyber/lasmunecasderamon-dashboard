import React from 'react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
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

it('el administrador puede aprobar y transferir aunque su rol no sea Barman', async () => {
  render(<TransfersPage />);
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

  expect(await screen.findByText('Solo consulta')).toBeInTheDocument();
  expect(
    screen.queryByRole('button', { name: 'Transferir Whisky 750 ml' })
  ).not.toBeInTheDocument();

  await abrirPendientes();
  expect(await screen.findByRole('button', { name: 'Aprobar' })).toBeInTheDocument();
});
