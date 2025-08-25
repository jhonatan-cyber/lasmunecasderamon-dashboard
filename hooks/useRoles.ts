import { useState, useEffect, useCallback } from "react";
import { Permission } from "./usePermissions";

export interface Role {
  id: number; // Este será mapeado desde id_rol
  name: string; // Este será mapeado desde nombre
  description: string; // Este será mapeado desde descripcion
  status: number; // Este será mapeado desde estado
  created_at: string; // Este será mapeado desde fecha_crea
  updated_at: string | null; // Este será mapeado desde fecha_mod
  deleted_at: string | null; // Este será mapeado desde fecha_baja
  userCount?: number;
  color?: string;
  permissions?: Permission[];
}

export function useRoles() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRoles = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/roles", {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });
      
      if (!response.ok) {
        throw new Error("Error al obtener los roles");
      }
      
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.message || "Error al obtener los roles");
      }
      
      if (!Array.isArray(result.data)) {
        throw new Error("La respuesta de roles no tiene el formato esperado");
      }
      
    
      const formattedData = result.data.map((role: any) => ({
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
    
      
      setRoles(formattedData);
      setError(null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "No se pudieron cargar los roles. Por favor, inténtalo de nuevo más tarde.";
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { 
    fetchRoles(); 
  }, [fetchRoles]);

  const createRole = useCallback(async (newRole: { name: string; description: string }) => {
    try {
      const response = await fetch("/api/roles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newRole),
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.message || "Error al crear el rol");
      }
      
      if (!result.success) {
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
      
      if (!response.ok) {
        throw new Error(result.message || "Error al actualizar el rol");
      }
      
      if (!result.success) {
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
      
      if (!response.ok) {
        throw new Error(result.message || "Error al desactivar el rol");
      }
      
      if (!result.success) {
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
      
      if (!response.ok) {
        throw new Error(result.message || "Error al activar el rol");
      }
      
      if (!result.success) {
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
      
      if (!response.ok) {
        throw new Error(result.message || "Error al eliminar el rol");
      }
      
      if (!result.success) {
        throw new Error(result.message || "Error al eliminar el rol");
      }
      
      await fetchRoles();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Error al eliminar el rol";
      throw new Error(errorMessage);
    }
  }, [fetchRoles]);

  return {
    roles,
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