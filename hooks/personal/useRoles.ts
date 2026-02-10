import { useCallback } from "react";
import { Permission } from "./usePermissions";
import { useGenericFetch } from "../shared/useGenericFetch";
import { useGenericMutations } from "../shared/useGenericMutations";

export interface Role {
  id: number;
  name: string;
  description: string;
  status: number;
  created_at: string;
  updated_at: string | null;
  deleted_at: string | null;
  userCount?: number;
  color?: string;
  permissions?: Permission[];
}

export function useRoles() {
  const { data: roles, isLoading, error, refetch: fetchRoles } = useGenericFetch<Role>(
    "/api/roles",
    {
      transform: (result) => {
        if (!result.success || !Array.isArray(result.data)) {
          return [];
        }
        
        return result.data.map((role: any) => ({
          id: role.id_rol || role.id,
          name: role.nombre || role.name || 'Sin nombre',
          description: role.descripcion || role.description || 'Sin descripción',
          status: role.estado || role.status || 0,
          created_at: role.fecha_crea || role.created_at || new Date().toISOString(),
          updated_at: role.fecha_mod || role.updated_at || null,
          deleted_at: role.fecha_baja || role.deleted_at || null,
          userCount: role.userCount || 0,
          color: "bg-gray-500",
          permissions: [],
        }));
      }
    }
  );

  const createRole = useCallback(async (newRole: { name: string; description: string }) => {
    try {
      const response = await fetch("/api/roles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newRole),
      });
      
      const result = await response.json();
      
      if (!response.ok || !result.success) {
        throw new Error(result.message || "Error al crear el rol");
      }
      
      await fetchRoles();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Error al crear el rol";
      throw new Error(errorMessage);
    }
  }, [fetchRoles]);

  const updateRole = useCallback(async (id: number, name: string, description: string) => {
    try {
      const response = await fetch("/api/roles", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, name, description }),
      });
      
      const result = await response.json();
      
      if (!response.ok || !result.success) {
        throw new Error(result.message || "Error al actualizar el rol");
      }
      
      await fetchRoles();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Error al actualizar el rol";
      throw new Error(errorMessage);
    }
  }, [fetchRoles]);

  const deactivateRole = useCallback(async (id: number) => {
    try {
      const response = await fetch(`/api/roles/${id}?action=deactivate`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
      });
      
      const result = await response.json();
      
      if (!response.ok || !result.success) {
        throw new Error(result.message || "Error al desactivar el rol");
      }
      
      await fetchRoles();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Error al desactivar el rol";
      throw new Error(errorMessage);
    }
  }, [fetchRoles]);

  const activateRole = useCallback(async (id: number) => {
    try {
      const response = await fetch(`/api/roles/${id}?action=activate`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
      });
      
      const result = await response.json();
      
      if (!response.ok || !result.success) {
        throw new Error(result.message || "Error al activar el rol");
      }
      
      await fetchRoles();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Error al activar el rol";
      throw new Error(errorMessage);
    }
  }, [fetchRoles]);

  const deleteRole = useCallback(async (id: number) => {
    try {
      const response = await fetch(`/api/roles/${id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
      });
      
      const result = await response.json();
      
      if (!response.ok || !result.success) {
        throw new Error(result.message || "Error al eliminar el rol");
      }
      
      await fetchRoles();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Error al eliminar el rol";
      throw new Error(errorMessage);
    }
  }, [fetchRoles]);

  return {
    roles: roles || [],
    isLoading,
    error,
    fetchRoles,
    createRole,
    updateRole,
    deactivateRole,
    activateRole,
    deleteRole,
  };
} 