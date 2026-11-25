vi.unmock('@tanstack/react-query');

import { QueryClient, useQueryClient } from '@tanstack/react-query';
import { act, render, waitFor } from '@testing-library/react';
import { StrictMode, useEffect } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useCurrentUser } from '@/hooks/auth/useCurrentUser';
import { QueryProvider } from '@/components/providers/QueryProvider';
import { clearPersistedQueries, setupQueryPersistence } from '@/lib/utils/queryPersistence';

vi.mock('@/hooks/auth/useCurrentUser', () => ({ useCurrentUser: vi.fn() }));

vi.mock('@/lib/utils/queryPersistence', () => ({
  clearPersistedQueries: vi.fn().mockResolvedValue(undefined),
  setupQueryPersistence: vi.fn(() => vi.fn())
}));

let activeQueryClient: QueryClient | null = null;

function QueryClientProbe() {
  const queryClient = useQueryClient();

  useEffect(() => {
    activeQueryClient = queryClient;
  }, [queryClient]);

  return null;
}

function mockUser(id: number | null) {
  vi.mocked(useCurrentUser).mockReturnValue({
    user: id === null ? null : { id },
    loading: false
  } as ReturnType<typeof useCurrentUser>);
}

describe('QueryProvider por identidad', () => {
  beforeEach(() => {
    activeQueryClient = null;
    vi.clearAllMocks();
  });

  it('limpia el cache en memoria y la persistencia al cambiar de cuenta o salir', async () => {
    mockUser(1);
    const view = render(
      <StrictMode>
        <QueryProvider>
          <QueryClientProbe />
        </QueryProvider>
      </StrictMode>
    );

    await waitFor(() => expect(setupQueryPersistence).toHaveBeenCalledWith(expect.anything(), 1));

    const queryClient = activeQueryClient;
    expect(queryClient).not.toBeNull();
    act(() => queryClient?.setQueryData(['dashboard'], { owner: 1 }));

    mockUser(2);
    view.rerender(
      <StrictMode>
        <QueryProvider>
          <QueryClientProbe />
        </QueryProvider>
      </StrictMode>
    );

    await waitFor(() => expect(queryClient?.getQueryData(['dashboard'])).toBeUndefined());
    expect(clearPersistedQueries).toHaveBeenCalledWith(1);
    expect(setupQueryPersistence).toHaveBeenLastCalledWith(queryClient, 2);

    act(() => queryClient?.setQueryData(['dashboard'], { owner: 2 }));
    mockUser(null);
    view.rerender(
      <StrictMode>
        <QueryProvider>
          <QueryClientProbe />
        </QueryProvider>
      </StrictMode>
    );

    await waitFor(() => expect(queryClient?.getQueryData(['dashboard'])).toBeUndefined());
    expect(clearPersistedQueries).toHaveBeenLastCalledWith(2);
  });
});
