'use client';

import { useState, useCallback, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { User } from '@/types/user';
import { useDebounce } from 'use-debounce';

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  total?: number;
  message: string;
  /** Alta en el lector pedida al crear: resultado del intento (nunca bloquea). */
  altaEquipo?: AltaEquipoInfo;
  /** Sincronía con el lector al activar/desactivar (qué se quitó/restauró). */
  lector?: LectorSyncInfo;
  errors?: Array<{
    field: string;
    message: string;
  }>;
}

async function readUsersResponse<T>(response: Response): Promise<ApiResponse<T>> {
  const result = await response.json();
  return {
    ...result,
    success: response.ok && result.success === true,
    message: result.message || result.error?.message || result.error || 'Error al procesar usuarios'
  };
}

/** Lo que PATCH /api/users?action=… devuelve sobre el lector de la puerta. */
export interface LectorSyncInfo {
  /** Hubo algo que sincronizar (la persona tenía código y plantillas). */
  intentado: boolean;
  /** Equipos donde la persona quedó quitada/restaurada. */
  equiposOk: string[];
  /** Equipos que no respondieron o rechazaron: quedan pendientes. */
  equiposFallo: string[];
}

/** Lo que `POST /api/users` devuelve sobre la alta automática en el lector. */
export interface AltaEquipoInfo {
  ok: boolean;
  mensaje: string;
  motivo?: string;
  codigo?: string;
  carasEnEquipo?: number | null;
}

interface UseUsersReturn {
  users: User[];
  isLoading: boolean;
  isMutating: boolean;
  error: string | null;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  filterStatus: string;
  setFilterStatus: (status: string) => void;
  filterRole: string;
  setFilterRole: (role: string) => void;
  page: number;
  setPage: (page: number) => void;
  pageSize: number;
  setPageSize: (size: number) => void;
  totalPages: number;
  createUser: (formData: FormData) => Promise<{
    success: boolean;
    message: string;
    errors?: string[];
    id?: string;
    altaEquipo?: AltaEquipoInfo;
  }>;
  updateUser: (
    id: string | number,
    userData: FormData | Partial<User>
  ) => Promise<{ success: boolean; message: string; errors?: string[] }>;
  activateUser: (
    id: string | number
  ) => Promise<{ success: boolean; message: string; lector?: LectorSyncInfo }>;
  deactivateUser: (
    id: string | number
  ) => Promise<{ success: boolean; message: string; lector?: LectorSyncInfo }>;
  deleteUser: (id: string | number) => Promise<{ success: boolean; message: string }>;
  getUserById: (id: string | number) => Promise<User | null>;
}

export function useUsers(): UseUsersReturn {
  const queryClient = useQueryClient();

  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm] = useDebounce(searchTerm, 500);
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterRole, setFilterRole] = useState('all');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearchTerm, filterStatus, filterRole]);

  const {
    data,
    isLoading,
    error: queryError
  } = useQuery({
    queryKey: ['users', debouncedSearchTerm, filterStatus, filterRole, page, pageSize],
    queryFn: async ({ signal }) => {
      const params = new URLSearchParams({
        search: debouncedSearchTerm.trim(),
        status: filterStatus === 'active' ? '1' : filterStatus === 'inactive' ? '0' : 'all',
        role: filterRole,
        limit: pageSize.toString(),
        offset: ((page - 1) * pageSize).toString()
      });

      const res = await fetch(`/api/users?${params.toString()}`, { signal });
      if (!res.ok) throw new Error('Error al obtener usuarios');
      const result = await readUsersResponse<User[]>(res);
      if (!result.success) throw new Error(result.message);
      return result;
    },
    placeholderData: previousData => previousData
  });

  const users = data?.data || [];
  const total = data?.total || 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const createMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const res = await fetch('/api/users', { method: 'POST', body: formData });
      return readUsersResponse<{ id?: string | number } | null>(res);
    },
    onSuccess: result => {
      if (result.success) return queryClient.invalidateQueries({ queryKey: ['users'] });
    }
  });

  const updateMutation = useMutation({
    mutationFn: async ({
      id,
      userData
    }: {
      id: string | number;
      userData: FormData | Partial<User>;
    }) => {
      const isFormData = userData instanceof FormData;
      let body;

      if (isFormData) {
        if (!userData.has('id')) userData.append('id', id.toString());
        body = userData;
      } else {
        body = JSON.stringify({ id, ...userData });
      }

      const res = await fetch('/api/users', {
        method: 'PUT',
        headers: isFormData ? {} : { 'Content-Type': 'application/json' },
        body
      });
      return readUsersResponse<null>(res);
    },
    onSuccess: result => {
      if (result.success) return queryClient.invalidateQueries({ queryKey: ['users'] });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async ({ id, action }: { id: string | number; action: string }) => {
      const method = action === 'delete' ? 'DELETE' : 'PATCH';
      const url = `/api/users?action=${action}&id=${encodeURIComponent(String(id))}`;
      const res = await fetch(url, { method });
      return readUsersResponse<null>(res);
    },
    onSuccess: result => {
      if (result.success) return queryClient.invalidateQueries({ queryKey: ['users'] });
    }
  });

  const createUser = async (formData: FormData) => {
    const result = await createMutation.mutateAsync(formData);
    return {
      success: result.success,
      message: result.message,
      errors: result.errors?.map(e => `${e.field}: ${e.message}`),
      id: result.data?.id != null ? String(result.data.id) : undefined,
      altaEquipo: result.altaEquipo
    };
  };

  const updateUser = async (id: string | number, userData: FormData | Partial<User>) => {
    const result = await updateMutation.mutateAsync({ id, userData });
    return {
      success: result.success,
      message: result.message,
      errors: result.errors?.map(e => `${e.field}: ${e.message}`)
    };
  };

  const activateUser = async (id: string | number) => {
    const result = await deleteMutation.mutateAsync({ id, action: 'activate' });
    return { success: result.success, message: result.message, lector: result.lector };
  };

  const deactivateUser = async (id: string | number) => {
    const result = await deleteMutation.mutateAsync({ id, action: 'deactivate' });
    return { success: result.success, message: result.message, lector: result.lector };
  };

  const deleteUser = async (id: string | number) => {
    const result = await deleteMutation.mutateAsync({ id, action: 'delete' });
    return { success: result.success, message: result.message };
  };

  const getUserById = useCallback(async (id: string | number): Promise<User | null> => {
    try {
      const res = await fetch(`/api/users?id=${encodeURIComponent(String(id))}`);
      const data = await res.json();
      return res.ok && data.success ? data.data : null;
    } catch (e) {
      return null;
    }
  }, []);

  const changePageSize = useCallback((size: number) => {
    if (!Number.isInteger(size) || size <= 0) return;
    setPageSize(size);
    setPage(1);
  }, []);

  return {
    users,
    isLoading,
    isMutating: createMutation.isPending || updateMutation.isPending || deleteMutation.isPending,
    error: queryError ? (queryError as Error).message : null,
    searchTerm,
    setSearchTerm,
    filterStatus,
    setFilterStatus,
    filterRole,
    setFilterRole,
    page,
    setPage,
    pageSize,
    setPageSize: changePageSize,
    totalPages,
    createUser,
    updateUser,
    activateUser,
    deactivateUser,
    deleteUser,
    getUserById
  };
}
