import { useState, useCallback, useMemo } from "react";
import { useGenericFetch } from "../shared/useGenericFetch";
import { useGenericMutations } from "../shared/useGenericMutations";

export interface Category {
  id: number;
  name: string;
  description: string;
  status: number;
  total_products?: number;
  created_at?: string;
  display_order?: number;
}

interface UseCategoriesReturn {
  filteredCategories: Category[];
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  isLoading: boolean;
  error: string | null;
  createCategory: (category: { name: string; description: string }) => Promise<{ success: boolean; message: string }>;
  updateCategory: (id: number, category: { name: string; description: string }) => Promise<{ success: boolean; message: string }>;
  deleteCategory: (id: number) => Promise<{ success: boolean; message: string }>;
  activateCategory: (id: number) => Promise<{ success: boolean; message: string }>;
  deactivateCategory: (id: number) => Promise<{ success: boolean; message: string }>;
  reorderCategories: (categories: Category[]) => Promise<{ success: boolean; message: string }>;
}

export function useCategories(): UseCategoriesReturn {
  // Fetch de datos con transformación
  const { data: categories, isLoading, error, refetch } = useGenericFetch<Category>(
    "/api/categories",
    {
      transform: (result) => result.success ? result.data : []
    }
  );

  // Búsqueda local
  const [searchTerm, setSearchTerm] = useState("");

  // Mutaciones CRUD sin toasts (no los tenía originalmente)
  const { create, update, remove } = useGenericMutations<Category>("/api/categories", {
    onSuccess: refetch,
    showToasts: false
  });

  // Filtrado local
  const filteredCategories = useMemo(() => {
    if (!categories || categories.length === 0) return [];
    if (!searchTerm.trim()) return categories;
    
    const lower = searchTerm.toLowerCase();
    return categories.filter((cat) =>
      cat.name.toLowerCase().includes(lower) ||
      (cat.description ?? "").toLowerCase().includes(lower)
    );
  }, [searchTerm, categories]);

  // Wrappers para mantener API original
  const createCategory = useCallback(async (category: { name: string; description: string }) => {
    try {
      await create(category);
      return { success: true, message: "Categoría creada correctamente" };
    } catch (e) {
      return { success: false, message: e instanceof Error ? e.message : "Error desconocido" };
    }
  }, [create]);

  const updateCategory = useCallback(async (id: number, category: { name: string; description: string }) => {
    try {
      await update({ id, ...category });
      return { success: true, message: "Categoría actualizada correctamente" };
    } catch (e) {
      return { success: false, message: e instanceof Error ? e.message : "Error desconocido" };
    }
  }, [update]);

  const deleteCategory = useCallback(async (id: number) => {
    try {
      await remove(id);
      return { success: true, message: "Categoría eliminada correctamente" };
    } catch (e) {
      return { success: false, message: e instanceof Error ? e.message : "Error desconocido" };
    }
  }, [remove]);

  // Funciones especiales
  const activateCategory = useCallback(async (id: number) => {
    try {
      const res = await fetch(`/api/categories?id=${id}&action=activate`, { method: "PATCH" });
      const data = await res.json();
      if (!data.success) return { success: false, message: data.message };
      await refetch();
      return { success: true, message: data.message };
    } catch (e) {
      return { success: false, message: e instanceof Error ? e.message : "Error desconocido" };
    }
  }, [refetch]);

  const deactivateCategory = useCallback(async (id: number) => {
    try {
      const res = await fetch(`/api/categories?id=${id}&action=deactivate`, { method: "PATCH" });
      const data = await res.json();
      if (!data.success) return { success: false, message: data.message };
      await refetch();
      return { success: true, message: data.message };
    } catch (e) {
      return { success: false, message: e instanceof Error ? e.message : "Error desconocido" };
    }
  }, [refetch]);

  const reorderCategories = useCallback(async (categories: Category[]) => {
    try {
      const res = await fetch(`/api/categories?action=reorder`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ categories }),
      });
      const data = await res.json();
      if (!data.success) return { success: false, message: data.message };
      await refetch();
      return { success: true, message: data.message };
    } catch (e) {
      return { success: false, message: e instanceof Error ? e.message : "Error desconocido" };
    }
  }, [refetch]);

  return {
    filteredCategories,
    searchTerm,
    setSearchTerm,
    isLoading,
    error,
    createCategory,
    updateCategory,
    deleteCategory,
    activateCategory,
    deactivateCategory,
    reorderCategories,
  };
} 