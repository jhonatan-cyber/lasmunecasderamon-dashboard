import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query';
import useProducts from '@/hooks/productos/useProducts';

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.unmock('@tanstack/react-query');

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('actualización del catálogo después de guardar', () => {
  it.each(['crear', 'editar'])(
    '%s actualiza productos y presentaciones sin recargar',
    async action => {
      let saved = false;
      const fetchMock = vi.fn(async (_url: string, options?: RequestInit) => {
        if (options?.method === 'POST' || options?.method === 'PUT') saved = true;
        return {
          ok: true,
          json: async () => ({
            success: true,
            data: [
              {
                id: '1',
                name: saved ? 'Nombre actualizado' : 'Nombre anterior',
                code: 'P1',
                status: 1
              }
            ]
          })
        };
      });
      vi.stubGlobal('fetch', fetchMock);
      const client = new QueryClient({
        defaultOptions: { queries: { retry: false }, mutations: { retry: false } }
      });
      const presentations = vi.fn(async () =>
        saved ? 'imagen-nueva.webp' : 'imagen-anterior.webp'
      );
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <QueryClientProvider client={client}>{children}</QueryClientProvider>
      );
      const { result, unmount } = renderHook(
        () => ({
          products: useProducts('categoria-1'),
          presentations: useQuery({
            queryKey: ['product-presentations', '1'],
            queryFn: presentations,
            staleTime: Infinity
          })
        }),
        { wrapper }
      );
      await waitFor(() =>
        expect(result.current.products.allProducts[0]?.name).toBe('Nombre anterior')
      );
      await waitFor(() => expect(result.current.presentations.data).toBe('imagen-anterior.webp'));
      await act(async () => {
        if (action === 'crear')
          await result.current.products.createProduct({ name: 'Nombre actualizado' });
        else await result.current.products.updateProduct({ id: '1', name: 'Nombre actualizado' });
      });
      await waitFor(() =>
        expect(result.current.products.products[0]?.name).toBe('Nombre actualizado')
      );
      await waitFor(() => expect(result.current.presentations.data).toBe('imagen-nueva.webp'));
      unmount();
      client.clear();
    }
  );
});
