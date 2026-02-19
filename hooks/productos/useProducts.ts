import { useState } from 'react';
import { Product } from '@/types/product';
import { toast } from 'sonner';
import { useGenericFetch } from '../shared/useGenericFetch';
import { useGenericMutations } from '../shared/useGenericMutations';

export default function useProducts(categoryId?: number) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<number | null>(null);

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

  const { create, update, remove } = useGenericMutations<Product>('/api/products', {
    onSuccess: refetch,
    showToasts: true,
    entityName: 'Producto'
  });

  const activateProduct = async (id: number) => {
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

  const deactivateProduct = async (id: number) => {
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
    products,
    isLoading,
    error,
    searchTerm,
    setSearchTerm,
    filterStatus,
    setFilterStatus,
    fetchProducts: refetch,
    createProduct: create,
    updateProduct: update,
    deleteProduct: remove,
    activateProduct,
    deactivateProduct,
    reorderProducts
  };
}
