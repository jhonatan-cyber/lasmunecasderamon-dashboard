import { useAuth } from '@/contexts/AuthContext';

export interface UserPermission {
  id: number;
  name: string;
  description: string;
  module: string;
  action: string;
}

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
