/* eslint-disable */
import { useMutation, useQuery } from '@tanstack/react-query';
import { queryKeys, invalidateQueries } from '@/lib/queryClient';
import { usePagination } from './usePagination';
import { useMemo, useState } from 'react';

type ApiCollection<T> = { data?: T[] } | T[] | undefined;

const toArray = <T,>(collection: ApiCollection<T>): T[] => {
  if (Array.isArray(collection)) return collection;
  return collection?.data ?? [];
};

const includesText = (value: unknown, search: string) =>
  String(value ?? '').toLowerCase().includes(search.toLowerCase());

const fetchJson = async <T,>(
  url: string,
  init?: RequestInit,
  errorMessage = 'Error al cargar datos'
): Promise<T> => {
  const response = await fetch(url, init);

  if (!response.ok) {
    throw new Error(errorMessage);
  }

  return response.json() as Promise<T>;
};

const invalidateUsers = () => invalidateQueries.users();
const invalidateSales = () => {
  invalidateQueries.sales();
  invalidateQueries.cashRegister();
};

export function useUsers(filters?: any) {
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('');

  const { data: users = [], isLoading, error } = useQuery<ApiCollection<any>>({
    queryKey: queryKeys.users.list(filters),
    queryFn: async () => fetchJson('/api/users', undefined, 'Error al cargar usuarios'),
    staleTime: 2 * 60 * 1000,
  });

  const filteredUsers = useMemo(() => {
    let filtered = toArray(users);

    if (searchTerm) {
      filtered = filtered.filter((user: any) =>
        includesText(user.username, searchTerm) ||
        includesText(user.email, searchTerm)
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

export function useSales(filters?: any) {
  const { data: sales = [], isLoading, error } = useQuery<ApiCollection<any>>({
    queryKey: queryKeys.sales.list(filters),
    queryFn: async () => fetchJson('/api/ventas', undefined, 'Error al cargar ventas'),
    staleTime: 1 * 60 * 1000,
  });

  const salesItems = toArray(sales);
  const pagination = usePagination(salesItems, { itemsPerPage: 15 });

  return {
    sales: pagination.paginatedData,
    pagination: pagination.pagination,
    controls: pagination.controls,
    visiblePages: pagination.visiblePages,
    isLoading,
    error,
    totalSales: salesItems.length,
  };
}

export function useProducts(filters?: any) {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');

  const { data: products = [], isLoading, error } = useQuery<ApiCollection<any>>({
    queryKey: queryKeys.products.list(filters),
    queryFn: async () => fetchJson('/api/products', undefined, 'Error al cargar productos'),
    staleTime: 5 * 60 * 1000,
  });

  const filteredProducts = useMemo(() => {
    let filtered = toArray(products);

    if (searchTerm) {
      filtered = filtered.filter((product: any) =>
        includesText(product.nombre, searchTerm) ||
        includesText(product.descripcion, searchTerm)
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

export function useSalesStats() {
  return useQuery({
    queryKey: queryKeys.sales.stats(),
    queryFn: async () => fetchJson('/api/sales/stats', undefined, 'Error al cargar estadisticas'),
    staleTime: 30 * 1000,
  });
}

export function useCashRegisterStatus() {
  return useQuery({
    queryKey: queryKeys.cashRegister.status(),
    queryFn: async () => fetchJson('/api/caja-status', undefined, 'Error al cargar estado de caja'),
    staleTime: 10 * 1000,
    refetchInterval: 30 * 1000,
  });
}

export function useUserMutations() {
  const createUser = useMutation({
    mutationFn: async (userData: any) =>
      fetchJson('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData),
      }, 'Error al crear usuario'),
    onSuccess: invalidateUsers,
  });

  const updateUser = useMutation({
    mutationFn: async ({ id, userData }: { id: number; userData: any }) =>
      fetchJson(`/api/users/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData),
      }, 'Error al actualizar usuario'),
    onSuccess: invalidateUsers,
  });

  const deleteUser = useMutation({
    mutationFn: async (id: number) =>
      fetchJson(`/api/users/${id}`, { method: 'DELETE' }, 'Error al eliminar usuario'),
    onSuccess: invalidateUsers,
  });

  return {
    createUser,
    updateUser,
    deleteUser,
  };
}

export function useSalesMutations() {
  const createSale = useMutation({
    mutationFn: async (saleData: any) =>
      fetchJson('/api/ventas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(saleData),
      }, 'Error al crear venta'),
    onSuccess: invalidateSales,
  });

  const updateSale = useMutation({
    mutationFn: async ({ id, saleData }: { id: number; saleData: any }) =>
      fetchJson(`/api/ventas/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(saleData),
      }, 'Error al actualizar venta'),
    onSuccess: invalidateSales,
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
