'use client';

import { useState, useCallback } from 'react';
import { useGenericFetch } from '../shared/useGenericFetch';

export interface Permission {
  id: number;
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
  const [mutationError, setMutationError] = useState<string | null>(null);

  const {
    data: permissions,
    isLoading,
    error: fetchError,
    refetch: fetchPermissions
  } = useGenericFetch<Permission>('/api/permissions', {
    initialFetch: true,
    transform: data => (data.success ? data.data : [])
  });

  const error = fetchError || mutationError;

  const createPermission = useCallback(
    async (permissionData: {
      name: string;
      description: string;
      module: string;
      action: string;
    }) => {
      setMutationError(null);
      try {
        const response = await fetch('/api/permissions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(permissionData)
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
        setMutationError(errorMessage);
        throw new Error(errorMessage);
      }
    },
    [fetchPermissions]
  );

  const getRolePermissions = useCallback(async (roleId: string) => {
    setMutationError(null);
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
      const errorMessage =
        err instanceof Error ? err.message : 'Error al obtener los permisos del rol';
      setMutationError(errorMessage);
      throw new Error(errorMessage);
    }
  }, []);

  const updateRolePermissions = useCallback(async (roleId: string, permissionIds: string[]) => {
    setMutationError(null);
    try {
      const response = await fetch(`/api/roles/${roleId}/permissions`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ permissions: permissionIds })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Error al actualizar los permisos del rol');
      }

      if (!result.success) {
        throw new Error(result.message || 'Error al actualizar los permisos del rol');
      }

      return result;
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Error al actualizar los permisos del rol';
      setMutationError(errorMessage);
      throw new Error(errorMessage);
    }
  }, []);

  const permissionsByModule = permissions.reduce(
    (acc, permission) => {
      if (!acc[permission.module]) {
        acc[permission.module] = [];
      }
      acc[permission.module].push(permission);
      return acc;
    },
    {} as Record<string, Permission[]>
  );

  return {
    permissions,
    permissionsByModule,
    isLoading,
    error,
    fetchPermissions,
    createPermission,
    getRolePermissions,
    updateRolePermissions
  };
}
