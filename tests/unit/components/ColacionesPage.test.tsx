import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import ColacionesPage from '@/app/meals/page';

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock('@/hooks/cash-register/useCashRegisterStatus', () => ({
  useCashRegisterStatus: () => ({ hasOpenCaja: true, cajaInfo: { id_caja: 'caja-1' } })
}));
vi.mock('@/hooks/auth/useUserPermissions', () => ({
  useUserPermissions: () => ({ hasPermission: () => true })
}));
vi.mock('@/hooks/realtime/useRealtimeRefresh', () => ({ useRealtimeRefresh: vi.fn() }));
vi.mock('@/components/sales/CajaStatusBanner', () => ({ CajaStatusBanner: () => null }));

const trabajadores = [
  { id: 'w-anf', name: 'Ana', lastName: 'Anfitriona', role: 'anfitriona' },
  { id: 'w-caj', name: 'Carla', lastName: 'Cajera', role: 'cajero' },
  { id: 'w-sup', name: 'Sofia', lastName: 'Supervisora', role: 'supervisor' }
];

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
  }
];
const acompanamientosBar = [
  { id: 'p-cola', producto_nombre: 'Coca-Cola', nombre: '1.5 L', stock_bar: 10 },
  { id: 'p-soda', producto_nombre: 'Soda', nombre: '1 L', stock_bar: 2 },
  { id: 'p-whisky', producto_nombre: 'Whisky', nombre: '750 ml', stock_bar: 3 }
];

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function stubFetch(onPost: (body: any) => void = () => {}) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      const ok = (data: unknown) => ({ ok: true, json: async () => ({ success: true, data }) });
      if (url.startsWith('/api/users')) return ok(trabajadores);
      if (url.includes('solo_colaciones_analcoholicas=true')) return ok(analcoholicas);
      if (url.includes('solo_colaciones=true')) return ok(productosColacion);
      if (url.startsWith('/api/bar')) return ok(acompanamientosBar);
      if (url.startsWith('/api/meals')) {
        if (init?.method === 'POST') onPost(JSON.parse(String(init.body)));
        return ok([]);
      }
      throw new Error(`URL inesperada: ${url}`);
    })
  );
}

async function elegirTrabajador(nombre: string) {
  await waitFor(() => expect(screen.getByText('0 registrados')).toBeInTheDocument());
  fireEvent.click(screen.getByRole('combobox', { name: 'Trabajador' }));
  fireEvent.click(await screen.findByRole('option', { name: new RegExp(nombre, 'i') }));
}

describe('módulo /meals con el panel del bar', () => {
  it('muestra los productos configurados para la anfitriona y registra el acompañamiento elegido', async () => {
    const bodies: any[] = [];
    stubFetch(body => bodies.push(body));
    render(<ColacionesPage />);

    expect(screen.getByRole('heading', { name: 'Colaciones' })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Buscar colaciones' })).toBeInTheDocument();
    await elegirTrabajador('Ana');

    const group = await screen.findByRole('group', {
      name: 'Productos habilitados para colación'
    });
    expect(group).toBeInTheDocument();
    expect(screen.getByText('Abierta: 420 ml · hace un momento')).toBeInTheDocument();
    fireEvent.click(await screen.findByRole('button', { name: /Whisky/ }));
    expect(screen.getByText('Quedan 420 ml en la botella abierta.')).toBeInTheDocument();

    const selectAcompanamiento = await screen.findByRole('combobox', {
      name: 'Acompañamiento'
    });
    fireEvent.click(selectAcompanamiento);
    fireEvent.click(await screen.findByRole('option', { name: /Coca-Cola/ }));

    fireEvent.click(screen.getByRole('button', { name: 'Registrar corto' }));

    await waitFor(() => expect(bodies).toHaveLength(1));
    expect(bodies[0]).toMatchObject({
      usuario_id: 'w-anf',
      presentacion_id: 'p-whisky',
      acompanamiento_presentacion_id: 'p-cola'
    });
  });

  it('usa las bebidas analcohólicas configuradas para los roles de bar', async () => {
    stubFetch();
    render(<ColacionesPage />);
    await elegirTrabajador('Carla');
    expect(await screen.findByRole('group', { name: 'Bebidas analcohólicas' })).toBeInTheDocument();
    const card = screen.getByRole('button', { name: /Sprite/ });
    expect(card).toHaveTextContent('Producto: 350 ml');
    expect(card).toHaveTextContent('Colación: 200 ml');
    expect(screen.queryByRole('button', { name: /Whisky/ })).not.toBeInTheDocument();
  });

  it('indica que un rol sin colación no recibe', async () => {
    stubFetch();
    render(<ColacionesPage />);
    await elegirTrabajador('Sofia');

    expect(await screen.findByText('Este rol no recibe colación.')).toBeInTheDocument();
  });
});
