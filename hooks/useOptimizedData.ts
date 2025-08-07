import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys, invalidateQueries } from '@/lib/queryClient';
import { usePagination } from './usePagination';
import { useState, useMemo } from 'react';

// Hook para obtener usuarios con caché y paginación
export function useUsers(filters?: any) {
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('');

  const { data: users = [], isLoading, error } = useQuery({
    queryKey: queryKeys.users.list(filters),
    queryFn: async () => {
      const response = await fetch('/api/users');
      if (!response.ok) {
        throw new Error('Error al cargar usuarios');
      }
      return response.json();
    },
    staleTime: 2 * 60 * 1000, // 2 minutos
  });

  // Filtrar datos localmente
  const filteredUsers = useMemo(() => {
    let filtered = users.data || users;
    
    if (searchTerm) {
      filtered = filtered.filter((user: any) =>
        user.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    if (roleFilter) {
      filtered = filtered.filter((user: any) => user.rol === roleFilter);
    }
    
    return filtered;
  }, [users, searchTerm, roleFilter]);

  const pagination = usePagination(filteredUsers, { itemsPerPage: 10 });

  return {
    users: pagination.paginatedData,
    pagination: pagination.pagination,
    controls: pagination.controls,
    visiblePages: pagination.visiblePages,
    isLoading,
    error,
    searchTerm,
    setSearchTerm,
    roleFilter,
    setRoleFilter,
    totalUsers: filteredUsers.length,
  };
}

// Hook para obtener ventas con caché y paginación
export function useSales(filters?: any) {
  const { data: sales = [], isLoading, error } = useQuery({
    queryKey: queryKeys.sales.list(filters),
    queryFn: async () => {
      const response = await fetch('/api/ventas');
      if (!response.ok) {
        throw new Error('Error al cargar ventas');
      }
      return response.json();
    },
    staleTime: 1 * 60 * 1000, // 1 minuto (datos más dinámicos)
  });

  const pagination = usePagination(sales.data || sales, { itemsPerPage: 15 });

  return {
    sales: pagination.paginatedData,
    pagination: pagination.pagination,
    controls: pagination.controls,
    visiblePages: pagination.visiblePages,
    isLoading,
    error,
    totalSales: (sales.data || sales).length,
  };
}

// Hook para obtener productos con caché y paginación
export function useProducts(filters?: any) {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');

  const { data: products = [], isLoading, error } = useQuery({
    queryKey: queryKeys.products.list(filters),
    queryFn: async () => {
      const response = await fetch('/api/products');
      if (!response.ok) {
        throw new Error('Error al cargar productos');
      }
      return response.json();
    },
    staleTime: 5 * 60 * 1000, // 5 minutos (datos más estáticos)
  });

  // Filtrar productos localmente
  const filteredProducts = useMemo(() => {
    let filtered = products.data || products;
    
    if (searchTerm) {
      filtered = filtered.filter((product: any) =>
        product.nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.descripcion?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    if (categoryFilter) {
      filtered = filtered.filter((product: any) => product.categoria_id === categoryFilter);
    }
    
    return filtered;
  }, [products, searchTerm, categoryFilter]);

  const pagination = usePagination(filteredProducts, { itemsPerPage: 12 });

  return {
    products: pagination.paginatedData,
    pagination: pagination.pagination,
    controls: pagination.controls,
    visiblePages: pagination.visiblePages,
    isLoading,
    error,
    searchTerm,
    setSearchTerm,
    categoryFilter,
    setCategoryFilter,
    totalProducts: filteredProducts.length,
  };
}

// Hook para estadísticas de ventas
export function useSalesStats() {
  return useQuery({
    queryKey: queryKeys.sales.stats(),
    queryFn: async () => {
      const response = await fetch('/api/sales/stats');
      if (!response.ok) {
        throw new Error('Error al cargar estadísticas');
      }
      return response.json();
    },
    staleTime: 30 * 1000, // 30 segundos (datos muy dinámicos)
  });
}

// Hook para estado de caja
export function useCashRegisterStatus() {
  return useQuery({
    queryKey: queryKeys.cashRegister.status(),
    queryFn: async () => {
      const response = await fetch('/api/caja-status');
      if (!response.ok) {
        throw new Error('Error al cargar estado de caja');
      }
      return response.json();
    },
    staleTime: 10 * 1000, // 10 segundos
    refetchInterval: 30 * 1000, // Refetch cada 30 segundos
  });
}

// Hook para mutaciones de usuarios
export function useUserMutations() {
  const queryClient = useQueryClient();

  const createUser = useMutation({
    mutationFn: async (userData: any) => {
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData),
      });
      if (!response.ok) {
        throw new Error('Error al crear usuario');
      }
      return response.json();
    },
    onSuccess: () => {
      invalidateQueries.users();
    },
  });

  const updateUser = useMutation({
    mutationFn: async ({ id, userData }: { id: number; userData: any }) => {
      const response = await fetch(`/api/users/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData),
      });
      if (!response.ok) {
        throw new Error('Error al actualizar usuario');
      }
      return response.json();
    },
    onSuccess: () => {
      invalidateQueries.users();
    },
  });

  const deleteUser = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/users/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        throw new Error('Error al eliminar usuario');
      }
      return response.json();
    },
    onSuccess: () => {
      invalidateQueries.users();
    },
  });

  return {
    createUser,
    updateUser,
    deleteUser,
  };
}

// Hook para mutaciones de ventas
export function useSalesMutations() {
  const queryClient = useQueryClient();

  const createSale = useMutation({
    mutationFn: async (saleData: any) => {
      const response = await fetch('/api/ventas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(saleData),
      });
      if (!response.ok) {
        throw new Error('Error al crear venta');
      }
      return response.json();
    },
    onSuccess: () => {
      invalidateQueries.sales();
      invalidateQueries.cashRegister();
    },
  });

  const updateSale = useMutation({
    mutationFn: async ({ id, saleData }: { id: number; saleData: any }) => {
      const response = await fetch(`/api/ventas/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(saleData),
      });
      if (!response.ok) {
        throw new Error('Error al actualizar venta');
      }
      return response.json();
    },
    onSuccess: () => {
      invalidateQueries.sales();
      invalidateQueries.cashRegister();
    },
  });

  return {
    createSale,
    updateSale,
  };
}

export default {
  useUsers,
  useSales,
  useProducts,
  useSalesStats,
  useCashRegisterStatus,
  useUserMutations,
  useSalesMutations,
}; 