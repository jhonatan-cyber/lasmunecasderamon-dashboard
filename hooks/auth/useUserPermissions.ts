import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useCurrentUser } from './useCurrentUser';
import { useGenericFetch } from '../shared/useGenericFetch';

export interface UserPermission {
  id: number;
  name: string;
  description: string;
  module: string;
  action: string;
}

export function useUserPermissions() {
  const { user, loading: userLoading } = useCurrentUser();
  const [lastFetchTime, setLastFetchTime] = useState<number>(0);
  const isFetchingRef = useRef(false);
  const mountedRef = useRef(false);
  const initialLoadDoneRef = useRef(false);

  // Construir endpoint dinámico
  const endpoint = useMemo(() => {
    if (!user?.id || user?.role?.toLowerCase() === 'administrador') {
      return null;
    }
    const timestamp = Date.now();
    return `/api/users/${user.id}/permissions?t=${timestamp}`;
  }, [user?.id, user?.role]);

  // Usar hook genérico para fetch de permisos
  const {
    data: userPermissions,
    isLoading: fetchLoading,
    error: fetchError,
    refetch,
  } = useGenericFetch<UserPermission>(endpoint || '/api/users/0/permissions', {
    initialFetch: false,
    transform: (result) => (result.success ? result.data || [] : []),
  });

  // Combinar loading states
  const isLoading = userLoading || (fetchLoading && !initialLoadDoneRef.current);
  const error = fetchError;

  const fetchUserPermissions = useCallback(async (forceRefresh = false, silent = false) => {
    // Si el usuario está cargando, no hacer nada
    if (userLoading) {
      return;
    }
    
    if (!user?.id) {
      initialLoadDoneRef.current = true;
      return;
    }

    // Si es administrador, no necesitamos cargar permisos específicos
    if (user?.role?.toLowerCase() === 'administrador') {
      initialLoadDoneRef.current = true;
      return;
    }

    // Evitar llamadas repetidas muy frecuentes (mínimo 1 segundo entre llamadas)
    const now = Date.now();
    if (!forceRefresh && now - lastFetchTime < 1000) {
      return;
    }

    // Evitar múltiples llamadas simultáneas
    if (isFetchingRef.current) {
      return;
    }

    isFetchingRef.current = true;
    
    try {
      await refetch();
      setLastFetchTime(now);
      initialLoadDoneRef.current = true;
    } catch (err) {
      console.error('Error en fetchUserPermissions:', err);
      initialLoadDoneRef.current = true;
    } finally {
      isFetchingRef.current = false;
    }
  }, [user?.id, user?.role, userLoading, lastFetchTime, refetch]);

  const hasPermission = useCallback((module: string, action: string): boolean => {
    // El dashboard es accesible para todos los usuarios autenticados
    if (module === 'dashboard' || module === 'Dashboard') {
      return true;
    }
    
    // El administrador siempre tiene todos los permisos
    if (user?.role?.toLowerCase() === 'administrador') {
      return true;
    }
    
    if (!userPermissions || userPermissions.length === 0) {
      return false;
    }
    
    return userPermissions.some(permission => 
      permission.module === module && permission.action === action
    );
  }, [userPermissions, user?.role]);

  const hasAnyPermission = useCallback((module: string): boolean => {
    // El dashboard es accesible para todos los usuarios autenticados
    if (module === 'dashboard' || module === 'Dashboard') {
      return true;
    }
    
    // El administrador siempre tiene todos los permisos
    if (user?.role?.toLowerCase() === 'administrador') {
      return true;
    }
    
    if (!userPermissions || userPermissions.length === 0) {
      return false;
    }
    
    return userPermissions.some(permission => permission.module === module);
  }, [userPermissions, user?.role]);

  const hasAllPermissions = useCallback((module: string, actions: string[]): boolean => {
    // El dashboard es accesible para todos los usuarios autenticados
    if (module === 'dashboard' || module === 'Dashboard') {
      return true;
    }
    
    // El administrador siempre tiene todos los permisos
    if (user?.role?.toLowerCase() === 'administrador') {
      return true;
    }
    
    if (!userPermissions || userPermissions.length === 0) {
      return false;
    }
    
    return actions.every(action => 
      userPermissions.some(permission => 
        permission.module === module && permission.action === action
      )
    );
  }, [userPermissions, user?.role]);

  // Función para forzar la recarga de permisos (silenciosa por defecto)
  const refreshPermissions = useCallback((silent = true) => {
    fetchUserPermissions(true, silent);
  }, [fetchUserPermissions]);

  // Cargar permisos inicialmente cuando el usuario esté listo
  useEffect(() => {
    // Esperar a que el usuario termine de cargar
    if (userLoading) {
      return;
    }
    
    // Solo cargar una vez al montar
    if (!mountedRef.current) {
      mountedRef.current = true;
      fetchUserPermissions(false, false);
    }
  }, [userLoading, fetchUserPermissions]);

  // Escuchar eventos de actualización de permisos (siempre silencioso)
  useEffect(() => {
    const handlePermissionsUpdate = (event?: CustomEvent) => {
      // Si el evento tiene detalles del rol, verificar si es el rol del usuario actual
      if (event?.detail?.roleId && user?.id) {
        // Refrescar silenciosamente
        refreshPermissions(true);
      } else {
        // Si no hay detalles, refrescar silenciosamente para todos
        refreshPermissions(true);
      }
    };

    // Escuchar eventos personalizados
    window.addEventListener('permissions-updated', handlePermissionsUpdate as EventListener);
    window.addEventListener('user-role-changed', handlePermissionsUpdate as EventListener);

    return () => {
      window.removeEventListener('permissions-updated', handlePermissionsUpdate as EventListener);
      window.removeEventListener('user-role-changed', handlePermissionsUpdate as EventListener);
    };
  }, [refreshPermissions, user?.id]);

  // Polling como respaldo: verificar permisos cada 60 segundos (siempre silencioso)
  useEffect(() => {
    // Solo hacer polling si no es administrador y hay un usuario
    if (!user || user.role?.toLowerCase() === 'administrador') {
      return;
    }

    const pollingInterval = setInterval(() => {
      fetchUserPermissions(true, true); // Siempre silencioso
    }, 60000); // 60 segundos

    return () => {
      clearInterval(pollingInterval);
    };
  }, [user, fetchUserPermissions]);

  return {
    userPermissions,
    isLoading,
    error,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    fetchUserPermissions,
    refreshPermissions,
  };
}
