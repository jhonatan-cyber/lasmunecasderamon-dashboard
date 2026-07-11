import { Product } from '@/types/product';
import { toast } from 'sonner';
import { useGenericFetch } from '../shared/useGenericFetch';
import { useGenericFilters } from '../shared/useGenericFilters';
import { useGenericMutations } from '../shared/useGenericMutations';

export default function useProducts(categoryId?: string) {
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
    onSuccess: () => {
      refetch();
    },
    showToasts: true,
    entityName: 'Producto',
    invalidateKey: endpoint
  });

  const filters = useGenericFilters(products, {
    searchFields: ['name', 'code'] as any,
    initialPageSize: 20,
    initialSortBy: 'display_order',
    initialSortOrder: 'asc'
  });

  const activateProduct = async (id: string | number) => {
    try {
      const res = await fetch(`/api/products?id=${id}&action=activate`, {
        method: 'PATCH'
      });
      const data = await res.json();
      if (data.success) {
        toast.success(data.message || 'Producto activado correctamente');
        await refetch();
      } else {
        toast.error(data.message || 'Error al activar producto');
      }
    } catch (err) {
      toast.error('Error de red al activar producto');
    }
  };

  const deactivateProduct = async (id: string | number) => {
    try {
      const res = await fetch(`/api/products?id=${id}&action=deactivate`, {
        method: 'PATCH'
      });
      const data = await res.json();
      if (data.success) {
        toast.success(data.message || 'Producto desactivado correctamente');
        await refetch();
      } else {
        toast.error(data.message || 'Error al desactivar producto');
      }
    } catch (err) {
      toast.error('Error de red al desactivar producto');
    }
  };

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
      if (data.success) {
        toast.success('Orden actualizado correctamente');
        setProducts(reorderedProducts);
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
    isMutating,
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
    activateProduct,
    deactivateProduct,
    reorderProducts
  };
}
