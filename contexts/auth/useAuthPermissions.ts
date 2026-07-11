import { useState, useCallback, useRef, useEffect } from 'react';
import { CurrentUser } from './useAuthSession';
import logger from '@/lib/utils/logger';

export interface UserPermission {
  id: number;
  name: string;
  description: string;
  module: string;
  action: string;
}

const moduleMap: Record<string, string[]> = {
  users: ['usuarios', 'users'],
  clients: ['clientes', 'clients'],
  products: ['productos', 'products'],
  categories: ['categorias', 'categories'],
  orders: ['pedidos', 'orders'],
  reports: ['reportes', 'reports'],
  sales: ['ventas', 'sales'],
  attendance: ['asistencias', 'attendance'],
  overtime: ['horas_extras', 'overtime'],
  gratificaciones: ['gratificaciones', 'gratificaciones'],
  cash_register: ['caja', 'cash_register'],
  accounts: ['cuentas', 'accounts'],
  tips: ['propinas', 'tips'],
  commissions: ['comisiones', 'commissions'],
  payroll: ['pagos_trabajadores', 'payroll'],
  payroll_details: ['payroll_details'],
  advances: ['anticipos', 'advances'],
  returns: ['devoluciones', 'returns'],
  roles: ['roles'],
  rooms: ['rooms'],
  private_rooms: ['private_rooms']
};

const actionMap: Record<string, string[]> = {
  view: [
    'view',
    'listar_usuarios',
    'listar_clientes',
    'listar_categoria_productos',
    'listar_productos_categoria',
    'listar_categorias',
    'listar_pedidos',
    'listar_reportes',
    'listar_ventas',
    'listar_roles',
    'listar_asistencias',
    'listar_horas_extras',
    'listar_gratificaciones',
    'listar_caja',
    'listar_cuentas',
    'listar_propinas',
    'listar_comisiones',
    'listar_pagos',
    'listar_detalles',
    'listar_anticipos',
    'listar_devoluciones',
    'listar_habitaciones',
    'listar_privados',
    'ver_detalles',
    'ver_dashboard'
  ],
  create: ['create', 'crear', 'agregar_productos'],
  process: ['process', 'registar_venta', 'registar_cuenta'],
  edit: ['edit', 'editar', 'registar_venta', 'registar_cuenta', 'process'],
  delete: ['delete', 'eliminar', 'anular']
};

interface UseAuthPermissionsParams {
  /** Getter to read the current user without creating a circular dependency */
  getUser: () => CurrentUser | null;
  onSessionExpired: () => void;
}

interface UseAuthPermissionsReturn {
  userPermissions: UserPermission[];
  permissionsLoading: boolean;
  permissionsLoaded: boolean;
  hasPermission: (module: string, action: string) => boolean;
  hasAnyPermission: (module: string) => boolean;
  hasAllPermissions: (module: string, actions: string[]) => boolean;
  refreshPermissions: (forceRefresh?: boolean) => Promise<void>;
  clearPermissions: () => void;
}

export function useAuthPermissions({
  getUser,
  onSessionExpired
}: UseAuthPermissionsParams): UseAuthPermissionsReturn {
  const [userPermissions, setUserPermissions] = useState<UserPermission[]>([]);
  const [permissionsLoading, setPermissionsLoading] = useState(false);
  const [permissionsLoaded, setPermissionsLoaded] = useState(false);

  const permissionsFetchedRef = useRef(false);
  const isFetchingPermissionsRef = useRef(false);
  const pendingPermissionsRefreshRef = useRef(false);
  const isMountedRef = useRef(true);

  // Store callbacks in refs so they stay stable across renders
  const onSessionExpiredRef = useRef(onSessionExpired);
  onSessionExpiredRef.current = onSessionExpired;

  // ── Clear permissions (called by session hook on expired) ──────────
  const clearPermissions = useCallback(() => {
    setUserPermissions([]);
    setPermissionsLoaded(false);
    permissionsFetchedRef.current = false;
  }, []);

  // ── Fetch permissions ──────────────────────────────────────────────
  const fetchPermissions = useCallback(
    async (forceRefresh = false) => {
      const user = getUser();
      if (!isMountedRef.current || !user?.id || user.role?.toLowerCase() === 'administrador') {
        return;
      }
      if (isFetchingPermissionsRef.current) {
        if (forceRefresh) {
          pendingPermissionsRefreshRef.current = true;
        }
        return;
      }
      isFetchingPermissionsRef.current = true;
      setPermissionsLoading(true);
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000);

        const timestamp = new Date().getTime();
        const response = await fetch(`/api/users/${user.id}/permissions?t=${timestamp}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            Pragma: 'no-cache'
          },
          credentials: 'include',
          cache: 'no-store',
          signal: controller.signal
        });
        clearTimeout(timeoutId);
        if (response.ok) {
          const result = await response.json();
          if (result.success && result.data) {
            if (isMountedRef.current) {
              setUserPermissions([...result.data]);
            }
            permissionsFetchedRef.current = true;
          }
        } else if (response.status === 401) {
          onSessionExpiredRef.current();
        }
      } catch (error) {
        logger.captureException(error, { context: 'AuthContext:fetchPermissions' });
      } finally {
        setPermissionsLoaded(true);
        setPermissionsLoading(false);
        isFetchingPermissionsRef.current = false;

        if (pendingPermissionsRefreshRef.current && isMountedRef.current) {
          pendingPermissionsRefreshRef.current = false;
          setTimeout(() => fetchPermissions(true), 50);
        }
      }
    },
    [getUser]
  );

  // ── Permission checks ──────────────────────────────────────────────
  const hasPermission = useCallback(
    (module: string, action: string): boolean => {
      const user = getUser();
      if (module === 'dashboard' || module === 'Dashboard') return true;
      if (user?.role?.toLowerCase() === 'administrador') return true;
      if (!userPermissions || userPermissions.length === 0) {
        return false;
      }

      let match = userPermissions.some(p => p.module === module && p.action === action);
      if (match) {
        return true;
      }

      const allowedModules = moduleMap[module] || [module];
      const allowedActions = actionMap[action] || [action];
      return userPermissions.some(
        p => allowedModules.includes(p.module) && allowedActions.includes(p.action)
      );
    },
    [userPermissions, getUser]
  );

  const hasAnyPermission = useCallback(
    (module: string): boolean => {
      const user = getUser();
      if (module === 'dashboard' || module === 'Dashboard') return true;
      if (user?.role?.toLowerCase() === 'administrador') return true;
      if (!userPermissions || userPermissions.length === 0) return false;
      const allowedModules = moduleMap[module] || [module];
      return userPermissions.some(p => allowedModules.includes(p.module));
    },
    [userPermissions, getUser]
  );

  const hasAllPermissions = useCallback(
    (module: string, actions: string[]): boolean => {
      const user = getUser();
      if (module === 'dashboard' || module === 'Dashboard') return true;
      if (user?.role?.toLowerCase() === 'administrador') return true;
      if (!userPermissions || userPermissions.length === 0) return false;
      const allowedModules = moduleMap[module] || [module];
      return actions.every(action => {
        const allowedActions = actionMap[action] || [action];
        return userPermissions.some(
          p => allowedModules.includes(p.module) && allowedActions.includes(p.action)
        );
      });
    },
    [userPermissions, getUser]
  );

  // ── Lifecycle: fetch permissions when user becomes available ────────
  useEffect(() => {
    const user = getUser();
    if (user && !permissionsFetchedRef.current && user.role?.toLowerCase() !== 'administrador') {
      fetchPermissions();
    }
  });

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  return {
    userPermissions,
    permissionsLoading,
    permissionsLoaded,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    refreshPermissions: fetchPermissions,
    clearPermissions
  };
}
