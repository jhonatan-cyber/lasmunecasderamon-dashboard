import React from 'react';
import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import Page from '@/app/purchases/replenishment/page';
import {
  subtotalReposicion,
  totalReposicion,
  textoOrdenReposicion
} from '@/lib/business/replenishmentOrder';
import { formatCurrencyCLP } from '@/lib/utils/formatters';
vi.mock('next/link', () => ({
  default: ({ children, ...props }: any) => <a {...props}>{children}</a>
}));
vi.mock('@/hooks/realtime/useRealtimeRefresh', () => ({ useRealtimeRefresh: vi.fn() }));
vi.mock('@/components/auth/PermissionGuard', () => ({
  PermissionGuard: ({ children }: any) => children
}));
const row = {
  id: 'order-1',
  producto_id: 'product-1',
  presentacion_id: 'presentation-1',
  producto: 'Agua',
  presentacion: '500 ml',
  stock_bodega: 2,
  stock_bar: 1,
  stock_actual: 3,
  stock_minimo: 5,
  stock_maximo: 12,
  cantidad: 9,
  precio_compra: 10
};
const response = (rows: any[]) => ({ ok: true, json: async () => ({ success: true, data: rows }) });
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});
it('vuelve a consultar y usa la cantidad actualizada antes de imprimir', async () => {
  const fetchMock = vi
    .fn()
    .mockResolvedValueOnce(response([row]))
    .mockResolvedValueOnce(response([{ ...row, stock_actual: 4, cantidad: 8, precio_compra: 25 }]));
  vi.stubGlobal('fetch', fetchMock);
  const print = vi.spyOn(window, 'print').mockImplementation(() => {});
  render(<Page />);
  await screen.findByText('Agua');
  fireEvent.click(screen.getByRole('button', { name: 'Imprimir orden' }));
  await waitFor(() => expect(print).toHaveBeenCalledOnce());
  expect(fetchMock).toHaveBeenCalledTimes(2);
  expect(screen.getByRole('cell', { name: '8' })).toBeInTheDocument();
  expect(screen.getByText(`Total estimado: ${formatCurrencyCLP(200)}`)).toBeInTheDocument();
  expect(screen.getByText(formatCurrencyCLP(25))).toBeInTheDocument();
});
it('calcula subtotales y total de varios productos e incluye importes en WhatsApp', () => {
  const rows = [
    row,
    { ...row, id: 'order-2', producto: 'Gaseosa', cantidad: 2, precio_compra: 1500 }
  ];
  expect(subtotalReposicion(row)).toBe(90);
  expect(totalReposicion(rows)).toBe(3090);
  const text = textoOrdenReposicion(rows);
  expect(text).toContain(`Precio unitario de referencia: ${formatCurrencyCLP(1500)}`);
  expect(text).toContain(`Subtotal estimado: ${formatCurrencyCLP(3000)}`);
  expect(text).toContain(`TOTAL ESTIMADO: ${formatCurrencyCLP(3090)}`);
  expect(text).toContain('precio de compra registrado en Bodega');
});
it('no imprime si una reposición ya cubrió el mínimo', async () => {
  vi.stubGlobal(
    'fetch',
    vi
      .fn()
      .mockResolvedValueOnce(response([row]))
      .mockResolvedValueOnce(response([]))
  );
  const print = vi.spyOn(window, 'print').mockImplementation(() => {});
  render(<Page />);
  await screen.findByText('Agua');
  fireEvent.click(screen.getByRole('button', { name: 'Imprimir orden' }));
  await screen.findByText('No hay productos que necesiten reposición.');
  expect(print).not.toHaveBeenCalled();
});
