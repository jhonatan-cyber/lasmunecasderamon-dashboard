import { Product } from '@/types/product';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useGenericFetch } from '../shared/useGenericFetch';
import { useGenericFilters } from '../shared/useGenericFilters';
import { useGenericMutations } from '../shared/useGenericMutations';

const PRODUCT_SEARCH_FIELDS: (keyof Product)[] = ['name', 'code'];

export default function useProducts(categoryId?: string) {
  const queryClient = useQueryClient();
  const endpoint = categoryId ? `/api/products?category_id=${categoryId}` : '/api/products';

  const {
    data: products,
    isLoading,
    error,
    refetch,
    setData: setProducts
  } = useGenericFetch<Product>(endpoint, {
    transform: (data: any) => {
      if (data.success && Array.isArray(data.data)) {
        return data.data;
      }
      return Array.isArray(data) ? data : [];
    }
  });

  const {
    create,
    update,
    remove,
    isLoading: isMutating
  } = useGenericMutations<Product>('/api/products', {
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['product-presentations'] }),
    showToasts: true,
    entityName: 'Producto',
    invalidateKey: endpoint
  });

  const { remove: deletePresentation, isLoading: isDeletingPresentation } = useGenericMutations(
    '/api/products/presentations',
    {
      entityName: 'Presentación',
      onSuccess: async () => {
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: [endpoint] }),
          queryClient.invalidateQueries({ queryKey: ['product-presentations'] })
        ]);
      }
    }
  );

  const filters = useGenericFilters(products, {
    searchFields: PRODUCT_SEARCH_FIELDS,
    initialPageSize: 20,
    initialSortBy: 'display_order',
    initialSortOrder: 'asc'
  });

  const changeProductStatus = async (id: string | number, action: 'activate' | 'deactivate') => {
    const operation = action === 'activate' ? 'activar' : 'desactivar';
    const completed = action === 'activate' ? 'activado' : 'desactivado';
    try {
      const res = await fetch(
        `/api/products?id=${encodeURIComponent(String(id))}&action=${action}`,
        {
          method: 'PATCH'
        }
      );
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        toast.success(data.message || `Producto ${completed} correctamente`);
        await Promise.all([
          refetch(),
          queryClient.invalidateQueries({ queryKey: ['product-presentations'] })
        ]);
      } else {
        toast.error(data.error?.message || data.message || `Error al ${operation} producto`);
      }
    } catch (err) {
      toast.error(`Error de red al ${operation} producto`);
    }
  };

  const activateProduct = (id: string | number) => changeProductStatus(id, 'activate');
  const deactivateProduct = (id: string | number) => changeProductStatus(id, 'deactivate');

  const reorderProducts = async (reorderedProducts: Product[]) => {
    if (!categoryId) {
      toast.error('No se puede reordenar sin una categoría');
      return;
    }

    try {
      const product_orders = reorderedProducts.map((product, index) => ({
        id: product.id,
        display_order: index + 1
      }));

      const res = await fetch('/api/products/reorder', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          category_id: categoryId,
          product_orders
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        toast.success('Orden actualizado correctamente');
        setProducts(
          reorderedProducts.map((product, index) => ({ ...product, display_order: index + 1 }))
        );
      } else {
        toast.error(data.message || 'Error al actualizar el orden');
        await refetch();
      }
    } catch (err) {
      toast.error('Error de red al actualizar el orden');
      await refetch();
    }
  };

  return {
    products: filters.paginatedData,
    allProducts: products,
    isLoading,
    isMutating: isMutating || isDeletingPresentation,
    error,
    searchTerm: filters.searchTerm,
    setSearchTerm: filters.setSearchTerm,
    filterStatus: filters.filterStatus,
    setFilterStatus: filters.setFilterStatus,
    sortBy: filters.sortBy,
    setSortBy: filters.setSortBy,
    page: filters.page,
    setPage: filters.setPage,
    totalPages: filters.totalPages,
    fetchProducts: async () => {
      await refetch();
    },
    createProduct: create,
    updateProduct: update,
    deleteProduct: remove,
    deletePresentation,
    activateProduct,
    deactivateProduct,
    reorderProducts
  };
}
