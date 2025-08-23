import { useState, useEffect, useCallback } from 'react';
import { useCurrentUser } from './useCurrentUser';

export interface UserPermission {
  id: string;
  name: string;
  description: string;
  module: string;
  action: string;
}

export function useUserPermissions() {
  const { user, loading: userLoading } = useCurrentUser();
  const [userPermissions, setUserPermissions] = useState<UserPermission[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchUserPermissions = useCallback(async () => {
    // Si el usuario está cargando, no hacer nada
    if (userLoading) {
      return;
    }
    
    if (!user?.id) {
      setUserPermissions([]);
      setIsLoading(false);
      return;
    }

    // Si es administrador, no necesitamos cargar permisos específicos
    if (user?.role?.toLowerCase() === 'administrador') {
      setUserPermissions([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/users/${user.id}/permissions`);
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.message || 'Error al obtener los permisos del usuario');
      }
      
      if (!result.success) {
        throw new Error(result.message || 'Error al obtener los permisos del usuario');
      }
      
      setUserPermissions(result.data || []);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error al obtener los permisos del usuario';
      setError(errorMessage);
      console.error('Error fetching user permissions:', err);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  const hasPermission = useCallback((module: string, action: string): boolean => {
    // El administrador siempre tiene todos los permisos
    if (user?.role?.toLowerCase() === 'administrador') {
      return true;
    }
    
    if (!userPermissions.length) return false;
    
    const hasPerm = userPermissions.some(permission => 
      permission.module === module && permission.action === action
    );
    
    return hasPerm;
  }, [userPermissions, user?.role]);

  const hasAnyPermission = useCallback((module: string): boolean => {
    // El administrador siempre tiene todos los permisos
    if (user?.role?.toLowerCase() === 'administrador') {
      return true;
    }
    
    if (!userPermissions.length) return false;
    
    return userPermissions.some(permission => permission.module === module);
  }, [userPermissions, user?.role]);

  const hasAllPermissions = useCallback((module: string, actions: string[]): boolean => {
    // El administrador siempre tiene todos los permisos
    if (user?.role?.toLowerCase() === 'administrador') {
      return true;
    }
    
    if (!userPermissions.length) return false;
    
    return actions.every(action => 
      userPermissions.some(permission => 
        permission.module === module && permission.action === action
      )
    );
  }, [userPermissions, user?.role]);

  useEffect(() => {
    fetchUserPermissions();
  }, [fetchUserPermissions, userLoading]);

  return {
    userPermissions,
    isLoading,
    error,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    fetchUserPermissions,
  };
}
