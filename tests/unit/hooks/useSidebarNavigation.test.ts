import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useSidebarNavigation } from '@/hooks/useSidebarNavigation';

const state = vi.hoisted(() => ({ role: 'Barman', allowed: true }));
vi.mock('next/navigation', () => ({ usePathname: () => '/bar' }));
vi.mock('@/hooks/auth/useCurrentUser', () => ({
  useCurrentUser: () => ({ user: { role: state.role }, loading: false })
}));
vi.mock('@/hooks/auth/useUserPermissions', () => ({
  useUserPermissions: () => ({
    userPermissions: [{}],
    isLoading: false,
    hasPermission: () => state.allowed
  })
}));

beforeEach(() => {
  state.role = 'Barman';
  state.allowed = true;
});
describe('menú del Barman', () => {
  it('muestra solamente Bar, Ventas y Servicios / Privados', () => {
    const { result } = renderHook(() => useSidebarNavigation());
    const items = result.current.sections.flatMap(section => section.items);
    expect(items.map(item => item.href).sort()).toEqual([
      '/bar',
      '/dashboard',
      '/private-rooms',
      '/sales'
    ]);
    expect(items.find(item => item.href === '/private-rooms')?.name).toBe('Servicios / Privados');
  });
  it('no ignora permisos revocados', () => {
    state.allowed = false;
    const { result } = renderHook(() => useSidebarNavigation());
    expect(result.current.sections).toEqual([]);
  });
  it('conserva los módulos del administrador', () => {
    state.role = 'Administrador';
    const { result } = renderHook(() => useSidebarNavigation());
    expect(
      result.current.sections
        .flatMap(section => section.items)
        .some(item => item.href === '/transfers')
    ).toBe(true);
  });
});
