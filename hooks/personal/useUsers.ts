/* eslint-disable */
import { useState, useCallback, useMemo, useEffect } from 'react';
import { User } from '@/types/user';
import { useGenericFetch } from '../shared/useGenericFetch';
import { useGenericFilters } from '../shared/useGenericFilters';

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message: string;
  errors?: Array<{
    field: string;
    message: string;
  }>;
}

interface UseUsersReturn {
  users: User[];
  filteredUsers: User[];
  paginatedUsers: User[];
  isLoading: boolean;
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
  fetchUsers: () => Promise<void>;
  createUser: (
    formData: FormData
  ) => Promise<{ success: boolean; message: string; errors?: string[] }>;
  updateUser: (
    id: string | number,
    userData: FormData | Partial<User>
  ) => Promise<{ success: boolean; message: string; errors?: string[] }>;
  activateUser: (id: string | number) => Promise<{ success: boolean; message: string }>;
  deactivateUser: (id: string | number) => Promise<{ success: boolean; message: string }>;
  deleteUser: (id: string | number) => Promise<{ success: boolean; message: string }>;
  getUserById: (id: string | number) => Promise<User | null>;
  clearError: () => void;
}

export function useUsers(): UseUsersReturn {
  const [error, setError] = useState<string | null>(null);
  const [filterRole, setFilterRole] = useState<string>('all');

  const {
    data: users,
    isLoading,
    error: fetchError,
    refetch,
    setData: setUsers
  } = useGenericFetch<User>('/api/users', {
    transform: result => result.data || []
  });

  const fetchUsers = useCallback(async () => {
    await refetch();
  }, [refetch]);

  const filters = useGenericFilters(users || [], {
    searchFields: ['name', 'lastName', 'run', 'email', 'phone', 'nick', 'address'],
    initialPageSize: 5
  });

  const filteredByRole = useMemo(() => {
    if (filterRole === 'all') {
      return filters.filteredData;
    }
    return filters.filteredData.filter(
      user => user.role?.toLowerCase() === filterRole.toLowerCase()
    );
  }, [filters.filteredData, filterRole]);

  const paginatedByRole = useMemo(() => {
    const start = (filters.page - 1) * filters.pageSize;
    return filteredByRole.slice(start, start + filters.pageSize);
  }, [filteredByRole, filters.page, filters.pageSize]);

  const totalPagesWithRole = Math.max(1, Math.ceil(filteredByRole.length / filters.pageSize));

  useEffect(() => {
    filters.setPage(1);
  }, [filterRole]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const formDataToObject = (formData: FormData) => {
    const result: Record<string, string> = {};
    for (const [key, value] of formData.entries()) {
      if (typeof value === 'string') {
        result[key] = value;
      }
    }
    return result;
  };

  const mapFormToUserPatch = (fields: Record<string, string>): Partial<User> => ({
    run: fields.run,
    nick: fields.nick,
    name: fields.nombre,
    lastName: fields.apellido,
    email: fields.correo || fields.email,
    phone: fields.telefono,
    address: fields.direccion,
    maritalStatus: fields.estado_civil,
    roleId: fields.rol_id ? String(fields.rol_id) : undefined,
    afp: fields.afp,
    salary: fields.sueldo ? Number(fields.sueldo) : undefined,
    contributions: fields.aporte ? Number(fields.aporte) : undefined,
    discount: fields.descuento ? Number(fields.descuento) : undefined
  });

  const getUserById = useCallback(async (id: string | number): Promise<User | null> => {
    try {
      setError(null);

      const res = await fetch(`/api/users?id=${id}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const data: ApiResponse<User> = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Error al obtener el usuario');
      }

      return data.data || null;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error desconocido al obtener usuario';
      setError(message);
      return null;
    }
  }, []);

  const createUser = useCallback(
    async (formData: FormData) => {
      try {
        setError(null);
        let hasCriticalFields = true;
        let missingFields = [];

        const requiredFields = [
          'run',
          'nick',
          'nombre',
          'apellido',
          'direccion',
          'telefono',
          'estado_civil',
          'afp',
          'rol_id'
        ];
        for (const field of requiredFields) {
          if (!formData.has(field) || !formData.get(field)) {
            hasCriticalFields = false;
            missingFields.push(field);
          }
        }

        if (!hasCriticalFields) {
          return {
            success: false,
            message: `Faltan campos obligatorios: ${missingFields.join(', ')}`,
            errors: missingFields.map(field => `${field}: Este campo es obligatorio`)
          };
        }

        const res = await fetch('/api/users', {
          method: 'POST',
          body: formData
        });

        let data: ApiResponse<null>;
        try {
          data = await res.json();
        } catch (jsonError) {
          return {
            success: false,
            message: 'Error al procesar la respuesta del servidor'
          };
        }

        if (!res.ok || !data.success) {
          const errors = data.errors?.map(err => `${err.field}: ${err.message}`) || [];
          return {
            success: false,
            message: data.message || 'Error al crear el usuario',
            errors: errors.length > 0 ? errors : undefined
          };
        }

        await fetchUsers();

        return {
          success: true,
          message: data.message || 'Usuario creado exitosamente'
        };
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Error de conexión al crear usuario';
        return {
          success: false,
          message
        };
      }
    },
    [fetchUsers]
  );

  const updateUser = useCallback(
    async (id: string | number, userData: any) => {
      try {
        setError(null);

        const isFormData = userData instanceof FormData;

        let res;
        if (isFormData) {
          userData.append('id', id.toString());

          let hasCriticalFields = true;
          let missingFields = [];

          if (!userData.has('id')) {
            hasCriticalFields = false;
            missingFields.push('id');
          }

          if (!hasCriticalFields) {
            return {
              success: false,
              message: `Faltan campos obligatorios: ${missingFields.join(', ')}`,
              errors: missingFields.map(field => `${field}: Este campo es obligatorio`)
            };
          }

          res = await fetch('/api/users', {
            method: 'PUT',
            body: userData
          });
        } else {
          if (!id) {
            return {
              success: false,
              message: 'ID de usuario es requerido para actualización'
            };
          }

          res = await fetch('/api/users', {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ id, ...userData })
          });
        }

        let data: ApiResponse<null>;
        try {
          data = await res.json();
        } catch (jsonError) {
          return {
            success: false,
            message: 'Error al procesar la respuesta del servidor'
          };
        }

        if (!res.ok || !data.success) {
          const errors = data.errors?.map(err => `${err.field}: ${err.message}`) || [];
          return {
            success: false,
            message: data.message || 'Error al actualizar el usuario',
            errors: errors.length > 0 ? errors : undefined
          };
        }

        const patch = isFormData ? mapFormToUserPatch(formDataToObject(userData)) : userData;

        setUsers((prevUsers: User[] | undefined) =>
          (prevUsers || []).map(user =>
            String(user.id) === String(id) ? { ...user, ...patch, updated_at: new Date().toISOString() } : user
          )
        );

        return {
          success: true,
          message: data.message || 'Usuario actualizado exitosamente'
        };
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Error de conexión al actualizar usuario';

        return {
          success: false,
          message
        };
      }
    },
    [setUsers]
  );

  const activateUser = useCallback(
    async (id: string | number) => {
      try {
        setError(null);

        const res = await fetch(`/api/users?action=activate&id=${id}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json'
          }
        });

        const data: ApiResponse<null> = await res.json();

        if (!res.ok || !data.success) {
          return {
            success: false,
            message: data.message || 'Error al activar el usuario'
          };
        }

        setUsers((prevUsers: User[] | undefined) =>
          (prevUsers || []).map(user =>
            String(user.id) === String(id) ? { ...user, status: 1, updated_at: new Date().toISOString() } : user
          )
        );

        return {
          success: true,
          message: data.message || 'Usuario activado exitosamente'
        };
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Error de conexión al activar usuario';

        return {
          success: false,
          message
        };
      }
    },
    [setUsers]
  );

  const deactivateUser = useCallback(
    async (id: string | number) => {
      try {
        setError(null);

        const res = await fetch(`/api/users?action=deactivate&id=${id}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json'
          }
        });

        const data: ApiResponse<null> = await res.json();

        if (!res.ok || !data.success) {
          return {
            success: false,
            message: data.message || 'Error al desactivar el usuario'
          };
        }

        setUsers((prevUsers: User[] | undefined) =>
          (prevUsers || []).map(user =>
            String(user.id) === String(id) ? { ...user, status: 0, updated_at: new Date().toISOString() } : user
          )
        );

        return {
          success: true,
          message: data.message || 'Usuario desactivado exitosamente'
        };
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Error de conexión al desactivar usuario';

        return {
          success: false,
          message
        };
      }
    },
    [setUsers]
  );

  const deleteUser = useCallback(
    async (id: string | number) => {
      try {
        setError(null);

        const res = await fetch(`/api/users?action=delete&id=${id}`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json'
          }
        });

        const data: ApiResponse<null> = await res.json();

        if (!res.ok || !data.success) {
          return {
            success: false,
            message: data.message || 'Error al eliminar el usuario'
          };
        }

        setUsers((prevUsers: User[] | undefined) => (prevUsers || []).filter(user => user.id !== id));

        return {
          success: true,
          message: data.message || 'Usuario eliminado permanentemente'
        };
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Error de conexión al eliminar usuario';

        return {
          success: false,
          message
        };
      }
    },
    [setUsers]
  );

  return {
    users: users || [],
    filteredUsers: filteredByRole,
    paginatedUsers: paginatedByRole,
    isLoading,
    error: error || fetchError,
    searchTerm: filters.searchTerm,
    setSearchTerm: filters.setSearchTerm,
    filterStatus:
      filters.filterStatus === null ? 'all' : filters.filterStatus === 1 ? 'active' : 'inactive',
    setFilterStatus: (status: string) => {
      if (status === 'all') filters.setFilterStatus(null);
      else if (status === 'active') filters.setFilterStatus(1);
      else if (status === 'inactive') filters.setFilterStatus(0);
    },
    filterRole,
    setFilterRole,
    page: filters.page,
    setPage: filters.setPage,
    pageSize: filters.pageSize,
    setPageSize: filters.setPageSize,
    totalPages: totalPagesWithRole,
    fetchUsers,
    createUser,
    updateUser,
    activateUser,
    deactivateUser,
    deleteUser,
    getUserById,
    clearError
  };
}

