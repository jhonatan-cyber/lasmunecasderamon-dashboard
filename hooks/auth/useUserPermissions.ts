import { useAuth } from '@/contexts/AuthContext';

export interface UserPermission {
  id: number;
  name: string;
  description: string;
  module: string;
  action: string;
}

/**
 * Hook optimizado que usa el contexto de autenticación
 * Evita múltiples llamadas al API y cachea los permisos
 */
export function useUserPermissions() {
  const {
    userPermissions,
    permissionsLoading,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    refreshPermissions,
  } = useAuth();

  return {
    userPermissions,
    isLoading: permissionsLoading,
    error: null,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    fetchUserPermissions: refreshPermissions,
    refreshPermissions,
  };
}

export default useUserPermissions;
