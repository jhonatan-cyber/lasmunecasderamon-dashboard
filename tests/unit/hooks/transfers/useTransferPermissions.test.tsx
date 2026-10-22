import { renderHook } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';

const auth = vi.hoisted(() => ({ grants: [] as Array<[string, string]> }));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    hasPermission: (module: string, action: string) =>
      auth.grants.some(
        ([grantedModule, grantedAction]) => grantedModule === module && grantedAction === action
      )
  })
}));

import { useTransferPermissions } from '@/hooks/transfers/useTransferPermissions';

beforeEach(() => {
  auth.grants = [];
});

it('habilita transferir solo con products/create', () => {
  auth.grants = [['products', 'create']];
  const { result } = renderHook(() => useTransferPermissions());
  expect(result.current).toEqual({ puedeTransferir: true, puedeAprobar: false });
});

it('habilita aprobar solo con products/accept_transfer', () => {
  auth.grants = [['products', 'accept_transfer']];
  const { result } = renderHook(() => useTransferPermissions());
  expect(result.current).toEqual({ puedeTransferir: false, puedeAprobar: true });
});

it('no habilita nada sin permisos del módulo', () => {
  auth.grants = [
    ['products', 'view'],
    ['products', 'write']
  ];
  const { result } = renderHook(() => useTransferPermissions());
  expect(result.current).toEqual({ puedeTransferir: false, puedeAprobar: false });
});
