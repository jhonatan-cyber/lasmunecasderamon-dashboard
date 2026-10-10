import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { useCategories } from '@/hooks/productos/useCategories';
import { useUsers } from '@/hooks/personal/useUsers';
import { useRoles } from '@/hooks/personal/useRoles';
import { useGenericMutations } from '@/hooks/shared/useGenericMutations';
import { toast } from 'sonner';
vi.unmock('@tanstack/react-query');
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock('@/lib/utils/toastUtils', () => ({ showSuccessToast: vi.fn(), showErrorToast: vi.fn() }));
const clients: QueryClient[] = [];
function wrapper() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } }
  });
  clients.push(client);
  return function Provider({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };
}
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.clearAllMocks();
  for (const client of clients.splice(0)) client.clear();
});
const category = { id: '1', name: 'Servidor', description: '', status: 1 };

describe('integridad de administración', () => {
  it('roles: un estado inactivo explícito no se reemplaza por otro campo activo', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, data: [{ id: 1, estado: 0, status: 1 }] })
      })
    );
    const { result } = renderHook(useRoles, { wrapper: wrapper() });
    await waitFor(() => expect(result.current.roles).toHaveLength(1));
    expect(result.current.roles[0].status).toBe(0);
  });
  it.each(['crear', 'editar', 'eliminar'])(
    'categorías: %s hace una sola recarga y conserva la respuesta del servidor',
    async operation => {
      const request = vi
        .fn()
        .mockResolvedValue({ ok: true, json: async () => ({ success: true, data: [category] }) });
      vi.stubGlobal('fetch', request);
      const { result } = renderHook(useCategories, { wrapper: wrapper() });
      await waitFor(() => expect(result.current.filteredCategories).toHaveLength(1));
      await act(async () => {
        if (operation === 'crear')
          await result.current.createCategory({ name: 'Formulario', description: '' });
        if (operation === 'editar')
          await result.current.updateCategory('1', { name: 'Formulario', description: '' });
        if (operation === 'eliminar') await result.current.deleteCategory('1');
      });
      expect(request.mock.calls.filter(([, options]) => options?.method === 'GET')).toHaveLength(2);
      expect(result.current.filteredCategories[0].name).toBe('Servidor');
    }
  );
  it.each(['activar', 'desactivar', 'ordenar'])(
    'categorías: %s revierte el cambio si HTTP falla',
    async operation => {
      vi.stubGlobal(
        'fetch',
        vi.fn(async (_url: string, options?: RequestInit) => ({
          ok: options?.method === 'GET',
          json: async () => ({ success: true, data: [category], message: 'Rechazado' })
        }))
      );
      const { result } = renderHook(useCategories, { wrapper: wrapper() });
      await waitFor(() => expect(result.current.filteredCategories).toHaveLength(1));
      let outcome!: { success: boolean };
      await act(async () => {
        outcome =
          operation === 'activar'
            ? await result.current.activateCategory('1')
            : operation === 'desactivar'
              ? await result.current.deactivateCategory('1')
              : await result.current.reorderCategories(result.current.filteredCategories);
      });
      expect(outcome.success).toBe(false);
      await waitFor(() => expect(result.current.filteredCategories[0]).toEqual(category));
    }
  );
  it.each(['create', 'update', 'remove'] as const)(
    'mutaciones compartidas: %s rechaza success=false aunque HTTP sea 200',
    async operation => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: true,
          json: async () => ({ success: false, message: 'No autorizado' })
        })
      );
      const { result } = renderHook(
        () => useGenericMutations<{ id: string; name: string }>('/api/example'),
        { wrapper: wrapper() }
      );
      await act(async () => {
        const promise =
          operation === 'create'
            ? result.current.create({ name: 'Nuevo' })
            : operation === 'update'
              ? result.current.update({ id: '1', name: 'Nuevo' })
              : result.current.remove('1');
        await expect(promise).rejects.toThrow('No autorizado');
      });
      expect(toast.success).not.toHaveBeenCalled();
    }
  );
  it.each(['crear', 'editar', 'activar', 'desactivar', 'eliminar'])(
    'usuarios: %s devuelve fallo si HTTP rechaza una respuesta success=true',
    async operation => {
      const request = vi.fn(async (_url: string, options?: RequestInit) => ({
        ok: !options?.method,
        json: async () => ({ success: true, data: [], total: 0, message: 'Rechazado' })
      }));
      vi.stubGlobal('fetch', request);
      const { result } = renderHook(useUsers, { wrapper: wrapper() });
      await waitFor(() => expect(result.current.isLoading).toBe(false));
      let outcome!: { success: boolean; message: string };
      await act(async () => {
        if (operation === 'crear') outcome = await result.current.createUser(new FormData());
        else if (operation === 'editar') outcome = await result.current.updateUser('1', {});
        else if (operation === 'activar') outcome = await result.current.activateUser('1');
        else if (operation === 'desactivar') outcome = await result.current.deactivateUser('1');
        else outcome = await result.current.deleteUser('1');
      });
      expect(outcome).toMatchObject({ success: false, message: 'Rechazado' });
      expect(request.mock.calls.filter(([, options]) => !options?.method)).toHaveLength(1);
    }
  );
  it('usuarios: cambiar el tamaño vuelve a la primera página y rechaza cero', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, data: [], total: 100 })
      })
    );
    const { result } = renderHook(useUsers, { wrapper: wrapper() });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    act(() => result.current.setPage(5));
    act(() => result.current.setPageSize(20));
    expect(result.current.page).toBe(1);
    expect(result.current.pageSize).toBe(20);
    act(() => result.current.setPageSize(0));
    expect(result.current.pageSize).toBe(20);
  });
});
