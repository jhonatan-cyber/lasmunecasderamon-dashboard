import { useState, useEffect, useCallback } from 'react';

export interface Permission {
  id: string;
  name: string;
  description: string;
  module: string;
  action: string;
  enabled?: boolean;
  assigned?: boolean;
  created_at: string;
  updated_at: string;
}

export function usePermissions() {
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPermissions = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/permissions');
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.message || 'Error al obtener los permisos');
      }
      
      if (!result.success) {
        throw new Error(result.message || 'Error al obtener los permisos');
      }
      
      setPermissions(result.data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error al obtener los permisos';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const createPermission = useCallback(async (permissionData: {
    name: string;
    description: string;
    module: string;
    action: string;
  }) => {
    try {
      const response = await fetch('/api/permissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(permissionData),
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.message || 'Error al crear el permiso');
      }
      
      if (!result.success) {
        throw new Error(result.message || 'Error al crear el permiso');
      }
      
      await fetchPermissions();
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error al crear el permiso';
      throw new Error(errorMessage);
    }
  }, [fetchPermissions]);

  const getRolePermissions = useCallback(async (roleId: string) => {
    try {
      const response = await fetch(`/api/roles/${roleId}/permissions`);
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.message || 'Error al obtener los permisos del rol');
      }
      
      if (!result.success) {
        throw new Error(result.message || 'Error al obtener los permisos del rol');
      }
      
      return result.data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error al obtener los permisos del rol';
      throw new Error(errorMessage);
    }
  }, []);

  const updateRolePermissions = useCallback(async (roleId: string, permissionIds: string[]) => {
    try {
      console.log('=== UPDATE ROLE PERMISSIONS HOOK ===');
      console.log('Role ID:', roleId);
      console.log('Permission IDs:', permissionIds);
      
      const response = await fetch(`/api/roles/${roleId}/permissions`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ permissions: permissionIds }),
      });
      
      const result = await response.json();
      console.log('API Response:', result);
      
      if (!response.ok) {
        console.error('API Error Response:', result);
        throw new Error(result.message || 'Error al actualizar los permisos del rol');
      }
      
      if (!result.success) {
        console.error('API Success False:', result);
        throw new Error(result.message || 'Error al actualizar los permisos del rol');
      }
      
      console.log('Update successful:', result);
      return result;
    } catch (err) {
      console.error('Hook Error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Error al actualizar los permisos del rol';
      throw new Error(errorMessage);
    }
  }, []);

  // Agrupar permisos por módulo
  const permissionsByModule = permissions.reduce((acc, permission) => {
    if (!acc[permission.module]) {
      acc[permission.module] = [];
    }
    acc[permission.module].push(permission);
    return acc;
  }, {} as Record<string, Permission[]>);

  useEffect(() => {
    fetchPermissions();
  }, [fetchPermissions]);

  return {
    permissions,
    permissionsByModule,
    isLoading,
    error,
    fetchPermissions,
    createPermission,
    getRolePermissions,
    updateRolePermissions,
  };
} 