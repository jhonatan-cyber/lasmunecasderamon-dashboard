import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { getEmployeeModules } from '@/lib/constants/employee-modules';
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
  it('muestra operación de barra y los módulos personales del barman', () => {
    const { result } = renderHook(() => useSidebarNavigation());
    const items = result.current.sections.flatMap(section => section.items);
    expect(items.map(item => item.href).sort()).toEqual([
      '/bar',
      '/barman-anticipos',
      '/barman-asistencias',
      '/barman-calendar',
      '/barman-horas-extras',
      '/barman-propinas',
      '/cleaning',
      '/dashboard',
      '/orders',
      '/private-rooms'
    ]);
    expect(items.find(item => item.href === '/private-rooms')?.name).toBe('Servicios / Privados');
  });
  it('oculta módulos revocados y conserva limpieza autorizada por el rol', () => {
    state.allowed = false;
    const { result } = renderHook(() => useSidebarNavigation());
    expect(
      result.current.sections.flatMap(section => section.items).map(item => item.href)
    ).toEqual([...getEmployeeModules('barman').map(item => item.href), '/cleaning']);
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

it.each(['cajero', 'barman', 'garzon', 'anfitriona'])(
  'conserva la actividad propia de %s sin permisos administrativos',
  role => {
    state.role = role;
    state.allowed = false;
    const { result } = renderHook(() => useSidebarNavigation());
    const own = result.current.sections.find(section => section.key === 'personal');
    expect(own?.items.map(item => item.href)).toEqual(
      getEmployeeModules(role).map(item => item.href)
    );
    expect(own?.items).toHaveLength(5);
  }
);
