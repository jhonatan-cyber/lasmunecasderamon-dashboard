'use client';

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

/*
 * Los pares módulo/acción se comparan contra el catálogo (`permissions`) tal cual.
 *
 * Antes había acá dos mapas de alias (módulos y acciones en español: 'productos',
 * 'eliminar', 'ver_detalles'…) que ya no podían coincidir con nada, porque el
 * catálogo hace tiempo que es todo en inglés. Un `hasPermission('productos',
 * 'eliminar')` quedaba insatisfacible para siempre: ningún rol podía concederlo y
 * el control desaparecía para todos los no-administradores. Los llamados se
 * corrigieron para pedir el par del catálogo y acá queda la comparación directa.
 * El test `permission-catalog-alignment` recorre la UI y falla si reaparece un par
 * que el catálogo no tenga.
 */

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
  const onSessionExpiredRef = useRef(onSessionExpired);
  useEffect(() => {
    onSessionExpiredRef.current = onSessionExpired;
  }, [onSessionExpired]);

  const clearPermissions = useCallback(() => {
    setUserPermissions([]);
    setPermissionsLoaded(false);
    permissionsFetchedRef.current = false;
  }, []);

  const fetchPermissions = useCallback(
    // eslint-disable-next-line react-hooks/preserve-manual-memoization
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

  const hasPermission = useCallback(
    (module: string, action: string): boolean => {
      const user = getUser();
      if (module === 'dashboard' || module === 'Dashboard') return true;
      if (user?.role?.toLowerCase() === 'administrador') return true;
      if (!userPermissions || userPermissions.length === 0) {
        return false;
      }

      return userPermissions.some(p => p.module === module && p.action === action);
    },
    [userPermissions, getUser]
  );

  const hasAnyPermission = useCallback(
    (module: string): boolean => {
      const user = getUser();
      if (module === 'dashboard' || module === 'Dashboard') return true;
      if (user?.role?.toLowerCase() === 'administrador') return true;
      if (!userPermissions || userPermissions.length === 0) return false;
      return userPermissions.some(p => p.module === module);
    },
    [userPermissions, getUser]
  );

  const hasAllPermissions = useCallback(
    (module: string, actions: string[]): boolean => {
      const user = getUser();
      if (module === 'dashboard' || module === 'Dashboard') return true;
      if (user?.role?.toLowerCase() === 'administrador') return true;
      if (!userPermissions || userPermissions.length === 0) return false;
      return actions.every(action =>
        userPermissions.some(p => p.module === module && p.action === action)
      );
    },
    [userPermissions, getUser]
  );

  const user = getUser();
  const userId = user?.id;
  const userRole = user?.role;

  useEffect(() => {
    if (userId && !permissionsFetchedRef.current && userRole?.toLowerCase() !== 'administrador') {
      fetchPermissions();
    }
  }, [userId, userRole, fetchPermissions]);

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
