import { useState, useEffect, useCallback } from "react";

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
  const [categories, setCategories] = useState<Category[]>([]);
  const [filteredCategories, setFilteredCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>("");

  const fetchCategories = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/categories");
      const data = await res.json();
      if (!data.success) throw new Error(data.message);
      setCategories(data.data);
      setFilteredCategories(data.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredCategories(categories);
      return;
    }
    const lower = searchTerm.toLowerCase();
    setFilteredCategories(
      categories.filter((cat) =>
        cat.name.toLowerCase().includes(lower) ||
        (cat.description ?? "").toLowerCase().includes(lower)
      )
    );
  }, [searchTerm, categories]);

  const createCategory = useCallback(async (category: { name: string; description: string }) => {
    try {
      const res = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(category),
      });
      const data = await res.json();
      if (!data.success) return { success: false, message: data.message };
      await fetchCategories();
      return { success: true, message: data.message };
    } catch (e) {
      return { success: false, message: e instanceof Error ? e.message : "Error desconocido" };
    }
  }, [fetchCategories]);

  const updateCategory = useCallback(async (id: number, category: { name: string; description: string }) => {
    try {
      const res = await fetch(`/api/categories?id=${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(category),
      });
      const data = await res.json();
      if (!data.success) return { success: false, message: data.message };
      await fetchCategories();
      return { success: true, message: data.message };
    } catch (e) {
      return { success: false, message: e instanceof Error ? e.message : "Error desconocido" };
    }
  }, [fetchCategories]);

  const deleteCategory = useCallback(async (id: number) => {
    try {
      const res = await fetch(`/api/categories?id=${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!data.success) return { success: false, message: data.message };
      await fetchCategories();
      return { success: true, message: data.message };
    } catch (e) {
      return { success: false, message: e instanceof Error ? e.message : "Error desconocido" };
    }
  }, [fetchCategories]);

  const activateCategory = useCallback(async (id: number) => {
    try {
      const res = await fetch(`/api/categories?id=${id}&action=activate`, { method: "PATCH" });
      const data = await res.json();
      if (!data.success) return { success: false, message: data.message };
      await fetchCategories();
      return { success: true, message: data.message };
    } catch (e) {
      return { success: false, message: e instanceof Error ? e.message : "Error desconocido" };
    }
  }, [fetchCategories]);

  const deactivateCategory = useCallback(async (id: number) => {
    try {
      const res = await fetch(`/api/categories?id=${id}&action=deactivate`, { method: "PATCH" });
      const data = await res.json();
      if (!data.success) return { success: false, message: data.message };
      await fetchCategories();
      return { success: true, message: data.message };
    } catch (e) {
      return { success: false, message: e instanceof Error ? e.message : "Error desconocido" };
    }
  }, [fetchCategories]);

  const reorderCategories = useCallback(async (categories: Category[]) => {
    try {
      const res = await fetch(`/api/categories?action=reorder`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ categories }),
      });
      const data = await res.json();
      if (!data.success) return { success: false, message: data.message };
      await fetchCategories();
      return { success: true, message: data.message };
    } catch (e) {
      return { success: false, message: e instanceof Error ? e.message : "Error desconocido" };
    }
  }, [fetchCategories]);

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