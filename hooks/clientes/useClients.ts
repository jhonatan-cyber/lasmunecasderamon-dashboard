import { useState } from 'react';
import { Client } from '@/types/client';
import { useGenericFetch } from '../shared/useGenericFetch';
import { useGenericMutations } from '../shared/useGenericMutations';
import { useGenericFilters } from '../shared/useGenericFilters';

export function useClients() {
  const [isMutating, setIsMutating] = useState(false);
  const {
    data,
    setData,
    isLoading: isFetching,
    error,
    refetch
  } = useGenericFetch<Client>('/api/clients', {
    transform: (data: any[]) =>
      data.map((c: any) => ({
        id: c.id,
        run: c.run,
        name: c.name,
        lastName: c.lastName,
        phone: c.phone,
        created_at: c.created_at,
        updated_at: c.updated_at,
        status: c.status
      }))
  });

  const {
    create: createMutation,
    update: updateMutation,
    remove: removeMutation
  } = useGenericMutations<Client>('/api/clients', {
    showToasts: false,
    entityName: 'Cliente'
  });

  const filters = useGenericFilters(data, {
    searchFields: ['name', 'lastName', 'run', 'phone'],
    initialPageSize: 5
  });

  const createClient = async (payload: any) => {
    setIsMutating(true);
    try {
      const res = await createMutation(payload);
      await refetch();
      return res;
    } finally {
      setIsMutating(false);
    }
  };

  const updateClient = async (payload: any) => {
    setIsMutating(true);
    try {
      const res = await updateMutation(payload);

      setData((prev: Client[] | undefined) =>
        (prev || []).map((c: Client) =>
          String(c.id) === String(payload.id) ? { ...c, ...payload, updated_at: new Date().toISOString() } : c
        )
      );

      return res;
    } finally {
      setIsMutating(false);
    }
  };

  const deleteClient = async (id: string | number) => {
    setIsMutating(true);
    try {
      const res = await removeMutation(id);

      setData((prev: Client[] | undefined) => (prev || []).filter((c: Client) => String(c.id) !== String(id)));

      return res;
    } finally {
      setIsMutating(false);
    }
  };

  return {
    clients: filters.paginatedData,
    allClients: data,
    filteredClients: filters.filteredData,

    isLoading: isMutating,
    error,

    searchTerm: filters.searchTerm,
    setSearchTerm: filters.setSearchTerm,
    filterStatus: filters.filterStatus,
    setFilterStatus: filters.setFilterStatus,

    page: filters.page,
    setPage: filters.setPage,
    pageSize: filters.pageSize,
    setPageSize: filters.setPageSize,
    totalPages: filters.totalPages,

    fetchClients: refetch,
    createClient,
    updateClient,
    deleteClient
  };
}

export function useClientes() {
  const { allClients, isLoading, error, fetchClients } = useClients();

  return {
    clientes: allClients,
    loading: isLoading,
    error,
    getClientes: fetchClients
  };
}
