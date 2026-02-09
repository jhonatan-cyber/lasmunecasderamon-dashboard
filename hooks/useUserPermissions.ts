import { useState, useEffect, useCallback, useRef } from 'react';
import { useCurrentUser } from './useCurrentUser';

export interface UserPermission {
  id: number;
  name: string;
  description: string;
  module: string;
  action: string;
}

export function useUserPermissions() {
  const { user, loading: userLoading } = useCurrentUser();
  const [userPermissions, setUserPermissions] = useState<UserPermission[]>([]);
  const [isLoading, setIsLoading] = useState(true); // Iniciar en true
  const [error, setError] = useState<string | null>(null);
  const [lastFetchTime, setLastFetchTime] = useState<number>(0);
  const isFetchingRef = useRef(false);
  const mountedRef = useRef(false);
  const initialLoadDoneRef = useRef(false);

  const fetchUserPermissions = useCallback(async (forceRefresh = false, silent = false) => {
    // Si el usuario está cargando, no hacer nada
    if (userLoading) {
      return;
    }
    
    if (!user?.id) {
      setUserPermissions([]);
      setIsLoading(false);
      initialLoadDoneRef.current = true;
      return;
    }

    // Si es administrador, no necesitamos cargar permisos específicos
    if (user?.role?.toLowerCase() === 'administrador') {
      setUserPermissions([]);
      setIsLoading(false);
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
    if (!silent) setIsLoading(true);
    setError(null);
    
    try {
      // Agregar timestamp para evitar cache del navegador
      const timestamp = new Date().getTime();
      const response = await fetch(`/api/users/${user.id}/permissions?t=${timestamp}`, {
        method: 'GET',
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      // Verificar que la respuesta sea JSON válido
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        console.error('Respuesta no es JSON:', text.substring(0, 200));
        throw new Error('La respuesta no es JSON válido');
      }
      
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.message || 'Error al obtener los permisos del usuario');
      }
      
      // Solo actualizar si los permisos realmente cambiaron
      const newPermissions = result.data || [];
      const permissionsChanged = JSON.stringify(userPermissions) !== JSON.stringify(newPermissions);
      
      if (permissionsChanged) {
        setUserPermissions(newPermissions);
      }
      
      setLastFetchTime(now);
      initialLoadDoneRef.current = true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error al obtener los permisos del usuario';
      setError(errorMessage);
      console.error('Error en fetchUserPermissions:', errorMessage);
      initialLoadDoneRef.current = true;
    } finally {
      isFetchingRef.current = false;
      setIsLoading(false);
    }
  }, [user?.id, user?.role, userLoading, lastFetchTime, userPermissions]);

  const hasPermission = useCallback((module: string, action: string): boolean => {
    // El dashboard es accesible para todos los usuarios autenticados
    if (module === 'dashboard' || module === 'Dashboard') {
      return true;
    }
    
    // El administrador siempre tiene todos los permisos
    if (user?.role?.toLowerCase() === 'administrador') {
      return true;
    }
    
    if (!userPermissions.length) {
      return false;
    }
    
    const hasPerm = userPermissions.some(permission => 
      permission.module === module && permission.action === action
    );
    
    return hasPerm;
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
    
    if (!userPermissions.length) {
      return false;
    }
    
    const hasAny = userPermissions.some(permission => permission.module === module);
    
    return hasAny;
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
    
    if (!userPermissions.length) {
      return false;
    }
    
    const hasAll = actions.every(action => 
      userPermissions.some(permission => 
        permission.module === module && permission.action === action
      )
    );
    
    return hasAll;
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
        // Obtener el roleId del usuario actual
        // Necesitamos refrescar para todos los usuarios del rol afectado
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
  }, [refreshPermissions, user?.id, userPermissions.length]);

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
