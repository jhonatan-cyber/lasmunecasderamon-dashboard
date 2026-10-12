import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
vi.mock('@/components/shared/3d-card', () => ({
  CardContainer: ({ children }: any) => <div>{children}</div>,
  CardBody: ({ children }: any) => <div>{children}</div>
}));
vi.mock('@/components/ui/dropdown-menu', () => ({
  DropdownMenu: ({ children }: any) => <div>{children}</div>,
  DropdownMenuContent: ({ children }: any) => <div>{children}</div>,
  DropdownMenuTrigger: () => null,
  DropdownMenuItem: ({ children, onClick }: any) => <button onClick={onClick}>{children}</button>
}));
import CategoryCard from '@/components/categories/CategoryCard';
const fetchMock = vi.fn();
const onDelete = vi.fn();
function openModal() {
  render(
    <CategoryCard
      category={{ id: 'cat', name: 'Bebidas', description: '', status: 1 }}
      onDelete={onDelete}
      onEdit={vi.fn()}
      onActivate={vi.fn()}
      onDeactivate={vi.fn()}
    />
  );
  fireEvent.click(screen.getByRole('button', { name: 'Eliminar' }));
  return screen.getByRole('dialog');
}
beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal('fetch', fetchMock);
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
it('bloquea el borrado mientras carga y muestra productos inactivos antes de confirmar', async () => {
  let resolve!: (response: Response) => void;
  fetchMock.mockImplementation(
    () =>
      new Promise<Response>(r => {
        resolve = r;
      })
  );
  const modal = openModal();
  expect(within(modal).getByRole('button', { name: 'Eliminar' })).toBeDisabled();
  expect(onDelete).not.toHaveBeenCalled();
  resolve(
    Response.json({
      success: true,
      data: { name: 'Bebidas', products: [{ id: 'p', name: 'Vino', status: 0 }] }
    })
  );
  await screen.findByText('Vino (inactivo)');
  expect(within(modal).getByText(/sus 1 productos/)).toBeInTheDocument();
  fireEvent.click(within(modal).getByRole('button', { name: 'Eliminar' }));
  expect(onDelete).toHaveBeenCalledExactlyOnceWith('cat');
});
it('cancelar no elimina la categoría', async () => {
  fetchMock.mockResolvedValue(
    Response.json({ success: true, data: { name: 'Bebidas', products: [] } })
  );
  const modal = openModal();
  await waitFor(() =>
    expect(within(modal).getByRole('button', { name: 'Eliminar' })).toBeEnabled()
  );
  fireEvent.click(within(modal).getByRole('button', { name: 'Cancelar' }));
  expect(onDelete).not.toHaveBeenCalled();
});
it('no permite borrar si no puede obtener la lista de productos', async () => {
  fetchMock.mockRejectedValue(new Error('Sin conexión'));
  const modal = openModal();
  await screen.findByRole('alert');
  expect(within(modal).getByRole('button', { name: 'Eliminar' })).toBeDisabled();
  expect(onDelete).not.toHaveBeenCalled();
});
