import { renderHook } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';
import { useAnfitrionas } from '@/hooks/personal/useAnfitrionas';
import { useGenericFetch } from '@/hooks/shared/useGenericFetch';

vi.mock('@/hooks/shared/useGenericFetch', () => ({
  useGenericFetch: vi.fn(() => ({ data: [], refetch: vi.fn() }))
}));
beforeEach(() => vi.clearAllMocks());

it.each([undefined, false, {}])('solo consulta anfitrionas activas logueadas en el local: %s', config => {
  renderHook(() => useAnfitrionas(config));
  expect(useGenericFetch).toHaveBeenCalledWith(
    '/api/users?anfitrionas=1&status=active&loggedIn=1&enLocal=1', expect.any(Object)
  );
});

it('conserva el filtro adicional de disponibilidad para servicios', () => {
  renderHook(() => useAnfitrionas(true));
  expect(useGenericFetch).toHaveBeenCalledWith('/api/anfitrionas/disponibles', expect.any(Object));
});
