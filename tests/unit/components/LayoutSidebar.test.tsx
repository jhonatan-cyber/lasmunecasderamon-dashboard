import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import LayoutContent from '@/components/layout/LayoutContent';

const state = vi.hoisted(() => ({ role: 'Barman' }));
vi.mock('next/navigation', () => ({ usePathname: () => '/dashboard' }));
vi.mock('@/hooks/auth/useCurrentUser', () => ({
  useCurrentUser: () => ({ user: { role: state.role } })
}));
vi.mock('@/hooks/auth/useSessionCheck', () => ({ useSessionCheck: vi.fn() }));
vi.mock('@/lib/utils/prefetchPredictive', () => ({ prefetchAdjacentRoutes: vi.fn() }));
vi.mock('@/components/providers/ThresholdSync', () => ({ ThresholdSync: () => null }));
vi.mock('@/components/dashboard/TimerDisplay', () => ({ TimerDisplay: () => null }));
vi.mock('@/components/auth/RouteGuard', () => ({
  RouteGuard: ({ children }: { children: React.ReactNode }) => children
}));
vi.mock('@/components/providers/ProtectedAppProviders', () => ({
  ProtectedAppProviders: ({ children }: { children: React.ReactNode }) => children
}));
vi.mock('@/components/header', () => ({
  Header: ({ showSidebarControls }: { showSidebarControls: boolean }) =>
    showSidebarControls ? <button>Menú lateral</button> : null
}));
vi.mock('@/components/sidebar', async () => {
  const { useSidebar } = await import('@/contexts/SidebarContext');
  return {
    Sidebar: () => {
      useSidebar();
      return <aside aria-label='Navegación lateral' />;
    }
  };
});
afterEach(cleanup);

describe('visibilidad del sidebar en el layout', () => {
  it.each(['Barman', 'Administrador', 'Cajero'])(
    'monta panel, proveedor y controles para %s',
    role => {
      state.role = role;
      const { container } = render(<LayoutContent>Contenido</LayoutContent>);
      expect(screen.getByRole('complementary', { name: 'Navegación lateral' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Menú lateral' })).toBeInTheDocument();
      expect(container.querySelector('.hide-sidebar')).toBeNull();
    }
  );
  it('mantiene oculto el panel para Anfitriona', () => {
    state.role = 'Anfitriona';
    render(<LayoutContent>Contenido</LayoutContent>);
    expect(screen.queryByRole('complementary')).not.toBeInTheDocument();
  });
});
