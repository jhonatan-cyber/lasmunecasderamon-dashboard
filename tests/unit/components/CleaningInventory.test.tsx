vi.mock('@/hooks/realtime/useRealtimeRefresh', () => ({ useRealtimeRefresh: () => {} }));
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import CleaningInventory from '@/components/cleaning/CleaningInventory';
import { accesoLimpieza } from '@/lib/business/limpieza';

let user = { id: 1, role: 'Administrador' };
vi.mock('@/hooks/auth/useCurrentUser', () => ({
  useCurrentUser: () => ({ user, loading: false })
}));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
const articulo = {
  id: '61c6756c-8499-4fe2-acbf-0450c122fb46',
  nombre: 'Detergente',
  unidad: 'litro',
  minimo: 2,
  stock: { almacen: 1, bar: 3, caja: 0, local: 0 },
  en_transito: 2
};
const movimiento = {
  id: 'f7172d01-f57d-4280-8712-5c38790d8802',
  articulo_id: articulo.id,
  articulo: 'Detergente',
  unidad: 'litro',
  tipo: 'traspaso',
  cantidad: 2,
  origen: 'almacen',
  destino: 'bar',
  estado: 'pendiente',
  nota: '',
  creado_por: '1',
  creador_nombre: 'Ana Almacén',
  recibido_por: null,
  costo_unitario: null,
  fecha: '2026-10-12T12:00:00Z'
};
let request: ReturnType<typeof vi.fn>;
beforeEach(() => {
  user = { id: 1, role: 'Administrador' };
  request = vi.fn(async (_url: string, options?: RequestInit) => ({
    ok: true,
    json: async () =>
      options?.method === 'POST'
        ? { success: true, data: { id: 'saved' } }
        : {
            success: true,
            data: {
              articulos: [articulo],
              movimientos: [movimiento],
              acceso: accesoLimpieza(user.role)
            }
          }
  }));
  vi.stubGlobal('fetch', request);
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('inventario de limpieza', () => {
  it('muestra existencias, alertas y responsables', async () => {
    render(<CleaningInventory />);
    expect(await screen.findByText('Reponer almacén')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Nuevo artículo' })).toBeInTheDocument();
    const stocks = screen.getByRole('region', { name: 'Existencias' });
    expect(within(stocks).getByText('Detergente')).toBeInTheDocument();
    expect(within(stocks).getByRole('columnheader', { name: 'En tránsito' })).toBeInTheDocument();
    // El buscador y el filtro de ubicación acompañan a los tabs de existencias.
    expect(screen.getByLabelText('Buscar artículo')).toBeInTheDocument();
    expect(screen.getByLabelText('Filtrar ubicación')).toBeInTheDocument();
    // Existencias e historial viven en tabs distintos: el historial no está montado al inicio.
    expect(screen.queryByText(/Envía\/registra: Ana Almacén/)).not.toBeInTheDocument();
    fireEvent.mouseDown(screen.getByRole('tab', { name: 'Historial de transferencias' }));
    const historial = await screen.findByRole('region', { name: 'Historial de transferencias' });
    expect(within(historial).getByText(/Envía\/registra: Ana Almacén/)).toBeInTheDocument();
    expect(within(historial).getByRole('columnheader', { name: 'Estado' })).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Existencias' })).not.toBeInTheDocument();
    // Los filtros de stock no aplican al historial, así que no se muestran en ese tab.
    expect(screen.queryByLabelText('Filtrar ubicación')).not.toBeInTheDocument();
  });
  it('el barman solo recibe en Bar y devuelve al almacén', async () => {
    user = { id: 1, role: 'Barman' };
    render(<CleaningInventory />);
    await screen.findByText('Reponer almacén');
    expect(screen.queryByRole('button', { name: 'Nuevo artículo' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Ingreso al almacén' })).not.toBeInTheDocument();
    expect(screen.getByLabelText('Origen')).toHaveValue('bar');
    expect(screen.getByLabelText('Destino')).toHaveValue('almacen');
    fireEvent.click(screen.getByRole('button', { name: 'Aceptar recepción' }));
    await waitFor(() =>
      expect(request.mock.calls.some(([, options]) => options?.method === 'POST')).toBe(true)
    );
    const options = request.mock.calls.find(([, o]) => o?.method === 'POST')![1]!;
    expect(JSON.parse(String(options.body))).toEqual({
      tipo: 'resolver',
      id: movimiento.id,
      accion: 'aceptar'
    });
  });
  it('registra artículos con una clave de idempotencia incluso en HTTP local', async () => {
    vi.stubGlobal('crypto', {
      getRandomValues: (array: Uint8Array) => {
        array.fill(42);
        return array;
      }
    });
    render(<CleaningInventory />);
    await screen.findByText('Reponer almacén');
    fireEvent.click(screen.getByRole('button', { name: 'Nuevo artículo' }));
    fireEvent.change(screen.getByLabelText('Nombre'), { target: { value: 'Lavandina' } });
    fireEvent.change(screen.getByLabelText('Unidad de medida'), { target: { value: 'litro' } });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));
    await waitFor(() =>
      expect(request.mock.calls.some(([, options]) => options?.method === 'POST')).toBe(true)
    );
    const options = request.mock.calls.find(([, o]) => o?.method === 'POST')![1]!;
    expect(JSON.parse(String(options.body))).toEqual({
      tipo: 'articulo',
      nombre: 'Lavandina',
      unidad: 'litro',
      minimo: 0
    });
    expect((options.headers as Record<string, string>)['x-idempotency-key']).toHaveLength(32);
  });
  it('un rol sin acceso no consulta el inventario', () => {
    user = { id: 1, role: 'Garzon' };
    render(<CleaningInventory />);
    expect(screen.getByText(/Tu rol no tiene acceso/)).toBeInTheDocument();
    expect(request).not.toHaveBeenCalled();
  });
});
