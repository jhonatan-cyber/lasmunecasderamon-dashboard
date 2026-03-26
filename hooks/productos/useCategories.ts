 
import { useState, useCallback, useMemo } from 'react';
import { useGenericFetch } from '../shared/useGenericFetch';
import { useGenericMutations } from '../shared/useGenericMutations';
import React from 'react';

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
  createCategory: (category: {
    name: string;
    description: string;
  }) => Promise<{ success: boolean; message: string }>;
  updateCategory: (
    id: number,
    category: { name: string; description: string }
  ) => Promise<{ success: boolean; message: string }>;
  deleteCategory: (id: number) => Promise<{ success: boolean; message: string }>;
  activateCategory: (id: number) => Promise<{ success: boolean; message: string }>;
  deactivateCategory: (id: number) => Promise<{ success: boolean; message: string }>;
  reorderCategories: (categories: Category[]) => Promise<{ success: boolean; message: string }>;
}

export function useCategories(): UseCategoriesReturn {
  const {
    data: categories,
    setData,
    isLoading,
    error,
    refetch
  } = useGenericFetch<Category>('/api/categories', {
    transform: result => (result.success ? result.data : [])
  });

  const refetchCategories = useCallback(async () => {
    await refetch();
  }, [refetch]);

  const [searchTerm, setSearchTerm] = useState('');

  const { create, update, remove } = useGenericMutations<Category>('/api/categories', {
    onSuccess: refetchCategories,
    showToasts: false
  });

  const filteredCategories = useMemo(() => {
    if (!categories || categories.length === 0) return [];

    const seen = new Set<number>();
    const unique = (categories || []).filter(cat => {
      if (seen.has(cat.id)) {
        return false;
      }
      seen.add(cat.id);
      return true;
    });

    if (!searchTerm.trim()) return unique;

    const lower = searchTerm.toLowerCase();
    return unique.filter(
      cat =>
        cat.name.toLowerCase().includes(lower) ||
        (cat.description ?? '').toLowerCase().includes(lower)
    );
  }, [searchTerm, categories]);

  const createCategory = useCallback(
    async (category: { name: string; description: string }) => {
      try {
        const res = await create(category);
        if (res && (res as any).id && setData) {
          const newClient: Category = {
            id: (res as any).id,
            name: category.name,
            description: category.description || '',
            status: 1,
            total_products: 0,
            created_at: new Date().toISOString(),
            display_order: (categories?.length || 0) + 1
          };
          setData((prev: Category[] | undefined) => {
            const merged = [newClient, ...(prev || [])];
            const seen = new Set<number>();
            return merged.filter(i => {
              if (seen.has(i.id)) return false;
              seen.add(i.id);
              return true;
            });
          });
        } else {
          await refetchCategories();
        }
        return { success: true, message: 'Categoría creada correctamente' };
      } catch (e) {
        return { success: false, message: e instanceof Error ? e.message : 'Error desconocido' };
      }
    },
    [create, setData, categories, refetchCategories]
  );

  const updateCategory = useCallback(
    async (id: number, category: { name: string; description: string }) => {
      try {
        const res = await update({ id, ...category });
        if (setData) {
          setData((prev: Category[] | undefined) =>
            (prev || []).map((c: Category) =>
              c.id === id ? { ...c, ...category, updated_at: new Date().toISOString() } : c
            )
          );
        } else {
          await refetchCategories();
        }
        return { success: true, message: 'Categoría actualizada correctamente' };
      } catch (e) {
        return { success: false, message: e instanceof Error ? e.message : 'Error desconocido' };
      }
    },
    [update, setData, refetchCategories]
  );

  const deleteCategory = useCallback(
    async (id: number) => {
      try {
        const res = await remove(id);
        if (setData) {
          setData((prev: Category[] | undefined) => (prev || []).filter((c: Category) => c.id !== id));
        } else {
          await refetchCategories();
        }
        return { success: true, message: 'Categoría eliminada correctamente' };
      } catch (e) {
        return { success: false, message: e instanceof Error ? e.message : 'Error desconocido' };
      }
    },
    [remove, setData, refetchCategories]
  );

  const activateCategory = useCallback(
    async (id: number) => {
      const previous = categories ? [...categories] : [];
      try {
        if (setData) {
          setData((prev: Category[] | undefined) => (prev || []).map((c: Category) => (c.id === id ? { ...c, status: 1 } : c)));
        }

        const res = await fetch(`/api/categories?id=${id}&action=activate`, { method: 'PATCH' });
        const data = await res.json();
 
        if (!data.success) {
          if (setData) setData(previous);
          const { showErrorToast } = await import('@/lib/utils/toastUtils');
          showErrorToast(data.message || 'Error al activar categoría');
          return { success: false, message: data.message };
        }

        if (setData && data.category) {
          setData((prev: Category[] | undefined) => (prev || []).map((c: Category) => (c.id === id ? { ...c, ...data.category } : c)));
        } else {
          await refetchCategories();
        }

        const { showSuccessToast } = await import('@/lib/utils/toastUtils');
        showSuccessToast(data.message || 'Categoría activada correctamente');
        return { success: true, message: data.message };
      } catch (e) {
        if (setData) setData(previous);
        const { showErrorToast } = await import('@/lib/utils/toastUtils');
        showErrorToast('Error de red al activar la categoría');
        return { success: false, message: e instanceof Error ? e.message : 'Error desconocido' };
      }
    },
    [categories, setData, refetchCategories]
  );

  const deactivateCategory = useCallback(
    async (id: number) => {
      const previous = categories ? [...categories] : [];
      try {
        if (setData) {
          setData((prev: Category[] | undefined) => (prev || []).map((c: Category) => (c.id === id ? { ...c, status: 0 } : c)));
        }

        const res = await fetch(`/api/categories?id=${id}&action=deactivate`, { method: 'PATCH' });
        const data = await res.json();

        if (!data.success) {
          if (setData) setData(previous);
          const { showErrorToast } = await import('@/lib/utils/toastUtils');
          showErrorToast(data.message || 'Error al desactivar categoría');
          return { success: false, message: data.message };
        }

        if (setData && data.category) {
          setData((prev: Category[] | undefined) => (prev || []).map((c: Category) => (c.id === id ? { ...c, ...data.category } : c)));
        } else {
          await refetchCategories();
        }

        const { showSuccessToast } = await import('@/lib/utils/toastUtils');
        showSuccessToast(data.message || 'Categoría desactivada correctamente');
        return { success: true, message: data.message };
      } catch (e) {
        if (setData) setData(previous);
        const { showErrorToast } = await import('@/lib/utils/toastUtils');
        showErrorToast('Error de red al desactivar la categoría');
        return { success: false, message: e instanceof Error ? e.message : 'Error desconocido' };
      }
    },
    [categories, setData, refetchCategories]
  );

  const reorderCategories = useCallback(
    async (newOrder: Category[]) => {
      const previous = categories ? [...categories] : [];
      try {
        if (setData) {
          const optimistic = (newOrder || []).map((c, idx) => ({ ...c, display_order: idx }));
       
          const seen = new Set<number>();
          setData(
            optimistic.filter(item => {
              if (seen.has(item.id)) return false;
              seen.add(item.id);
              return true;
            })
          );
        }
        const category_orders = (newOrder || []).map((c, idx) => ({
          id: c.id,
          display_order: idx
        }));

        const res = await fetch(`/api/categories/reorder`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ category_orders })
        });

        const data = await res.json();
   
        if (!data.success) {
          if (setData) setData(previous);
          const { showErrorToast } = await import('@/lib/utils/toastUtils');
          showErrorToast(data.message || 'Error al actualizar el orden');
          return { success: false, message: data.message };
        }

        if (setData) {
          const serverOrder = (newOrder || []).map((c, idx) => ({ ...c, display_order: idx }));
          setData(serverOrder);
        } else {
          await refetchCategories();
        }

        const { showSuccessToast } = await import('@/lib/utils/toastUtils');
        showSuccessToast('Orden actualizado correctamente');

        return { success: true, message: data.message };
      } catch (e) {
      
        if (setData) setData(previous);
        const { showErrorToast } = await import('@/lib/utils/toastUtils');
        showErrorToast('Error de red al actualizar el orden');
        return { success: false, message: e instanceof Error ? e.message : 'Error desconocido' };
      }
    },
    [categories, setData, refetchCategories]
  );

  React.useEffect(() => {
    const handler = (e: any) => {
      const payload = e?.detail;
      if (!payload || !setData) {
        refetchCategories();
        return;
      }

      try {
        const action = payload.action;

        if (action === 'created') {
          const newItem: Category = {
            id: payload.id,
            name: payload.name || 'Sin nombre',
            description: '',
            status: 1,
            total_products: 0,
            created_at: new Date().toISOString(),
            display_order: (categories?.length || 0) + 1
          };
          setData((prev: Category[] | undefined) => {
            const merged = [newItem, ...(prev || [])];
            const seen = new Set<number>();
            return merged.filter(i => {
              if (seen.has(i.id)) return false;
              seen.add(i.id);
              return true;
            });
          });
          return;
        }

        if (action === 'updated') {
          setData((prev: Category[] | undefined) =>
            (prev || []).map((c: Category) =>
              c.id === payload.id ? { ...c, name: payload.name ?? c.name } : c
            )
          );
          return;
        }

        if (action === 'deleted') {
          setData((prev: Category[] | undefined) => (prev || []).filter((c: Category) => c.id !== payload.id));
          return;
        }

        if (action === 'reordered' && Array.isArray(payload.order)) {
          setData((prev: Category[] | undefined) => {
            const prevMap = new Map<number, Category>((prev || []).map((p: Category) => [p.id, p]));
            const reordered: Category[] = payload.order
              .map((id: number, idx: number) => {
                const found = prevMap.get(id);
                if (!found) return null;
                return { ...found, display_order: idx } as Category;
              })
              .filter(Boolean) as Category[];
            return reordered;
          });
          return;
        }

        if (action === 'activated' || action === 'deactivated') {
          const newStatus = action === 'activated' ? 1 : 0;
          setData((prev: Category[] | undefined) =>
            (prev || []).map((c: Category) => (c.id === payload.id ? { ...c, status: newStatus } : c))
          );
          return;
        }

        refetchCategories();
      } catch (err) {
        refetchCategories();
      }
    };

    window.addEventListener('categoriesUpdated', handler);
    return () => window.removeEventListener('categoriesUpdated', handler);
  }, [refetchCategories, setData, categories]);

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
    reorderCategories
  };
}

