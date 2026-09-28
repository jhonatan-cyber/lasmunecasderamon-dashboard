import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { RouteGuard } from '@/components/auth/RouteGuard';

const mocks = vi.hoisted(() => ({
  push: vi.fn(),
  refreshPermissions: vi.fn(async () => {}),
  pathname: '/categories',
  auth: {
    user: null as { role: string } | null,
    userLoading: true,
    permissionsLoading: false,
    permissionsLoaded: false,
    pairs: [] as Array<{ module: string; action: string }>
  }
}));

vi.mock('next/navigation', () => ({
  usePathname: () => mocks.pathname,
  useRouter: () => ({
    push: mocks.push,
    replace: vi.fn(),
    refresh: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
    forward: vi.fn()
  })
}));

// Se replica el contrato real del contexto (ver contexts/auth/useAuthPermissions.ts):
// lista vacía => sin permiso, `permissionsLoaded` avisa cuándo la lista llegó.
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: mocks.auth.user,
    userLoading: mocks.auth.userLoading,
    userPermissions: mocks.auth.pairs,
    permissionsLoading: mocks.auth.permissionsLoading,
    permissionsLoaded: mocks.auth.permissionsLoaded,
    hasPermission: (module: string, action: string) => {
      if (module === 'dashboard') return true;
      if (mocks.auth.user?.role?.toLowerCase() === 'administrador') return true;
      return mocks.auth.pairs.some(p => p.module === module && p.action === action);
    },
    hasAnyPermission: (module: string) => mocks.auth.pairs.some(p => p.module === module),
    hasAllPermissions: (module: string, actions: string[]) =>
      actions.every(action =>
        mocks.auth.pairs.some(p => p.module === module && p.action === action)
      ),
    refreshUser: vi.fn(async () => {}),
    refreshPermissions: mocks.refreshPermissions
  })
}));

function renderGuard() {
  return render(<RouteGuard>Contenido protegido</RouteGuard>);
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.pathname = '/categories';
  mocks.auth.user = { role: 'Cajero' };
  mocks.auth.userLoading = false;
  mocks.auth.permissionsLoading = false;
  mocks.auth.permissionsLoaded = false;
  mocks.auth.pairs = [];
});

afterEach(cleanup);

describe('RouteGuard en recarga completa', () => {
  it('no manda a /access-denied mientras los permisos todavía no cargaron', () => {
    // Este es el estado real de un F5: el usuario de la sesión ya llegó, pero la
    // lista de permisos ni siquiera empezó a pedirse (`permissionsLoading` es el
    // estado inicial `false`).
    const { rerender } = renderGuard();

    expect(screen.getByText('Verificando permisos...')).toBeInTheDocument();
    expect(mocks.push).not.toHaveBeenCalled();
    expect(mocks.refreshPermissions).toHaveBeenCalled();

    // Llegan los permisos: recién ahora el guard decide.
    mocks.auth.permissionsLoaded = true;
    mocks.auth.pairs = [{ module: 'categories', action: 'view' }];
    rerender(<RouteGuard>Contenido protegido</RouteGuard>);

    expect(screen.getByText('Contenido protegido')).toBeInTheDocument();
    expect(mocks.push).not.toHaveBeenCalled();
  });

  it('espera aunque el fetch esté en curso', () => {
    mocks.auth.permissionsLoading = true;
    renderGuard();

    expect(screen.getByText('Verificando permisos...')).toBeInTheDocument();
    expect(mocks.push).not.toHaveBeenCalled();
    expect(mocks.refreshPermissions).not.toHaveBeenCalled();
  });

  it('redirige cuando el permiso realmente falta', () => {
    mocks.auth.permissionsLoaded = true;
    mocks.auth.pairs = [{ module: 'products', action: 'view' }];
    renderGuard();

    expect(mocks.push).toHaveBeenCalledWith('/access-denied?module=categories&action=view');
  });

  it('no hace esperar a un administrador', () => {
    mocks.auth.user = { role: 'Administrador' };
    renderGuard();

    expect(screen.getByText('Contenido protegido')).toBeInTheDocument();
    expect(mocks.refreshPermissions).not.toHaveBeenCalled();
  });

  it('no exige permisos para el dashboard', () => {
    mocks.pathname = '/dashboard';
    renderGuard();

    expect(screen.getByText('Contenido protegido')).toBeInTheDocument();
    expect(mocks.push).not.toHaveBeenCalled();
  });

  it('sin sesión manda al login con redirect', () => {
    mocks.auth.user = null;
    mocks.auth.userLoading = false;
    renderGuard();

    expect(mocks.push).toHaveBeenCalledWith('/login?redirect=%2Fcategories');
  });
});
