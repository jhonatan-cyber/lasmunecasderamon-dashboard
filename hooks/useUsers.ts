import { useState, useEffect, useCallback, useMemo } from "react";
import { User } from "@/types/user";

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
    id: number,
    userData: FormData | Partial<User>
  ) => Promise<{ success: boolean; message: string; errors?: string[] }>;
  activateUser: (id: number) => Promise<{ success: boolean; message: string }>;
  deactivateUser: (id: number) => Promise<{ success: boolean; message: string }>;
  deleteUser: (id: number) => Promise<{ success: boolean; message: string }>;
  getUserById: (id: number) => Promise<User | null>;
  clearError: () => void;
}

export function useUsers(): UseUsersReturn {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);

  // Filtrar usuarios basado en búsqueda y estado
  const filteredUsers = useMemo(() => {
    let result = users;

    // Filtrar por término de búsqueda
    if (searchTerm.trim()) {
      const lowercased = searchTerm.toLowerCase().trim();
      result = result.filter((user) => {
        const searchableFields = [
          user.name,
          user.lastName,
          user.run,
          user.email,
          user.phone,
          user.nick,
          user.address,
        ];

        return searchableFields.some((field) =>
          field?.toLowerCase().includes(lowercased)
        );
      });
    }

    // Filtrar por estado
    if (filterStatus !== "all") {
      result = result.filter((user) => {
        if (filterStatus === "active") return user.status === 1;
        if (filterStatus === "inactive") return user.status === 0;
        return true;
      });
    }

    return result;
  }, [users, searchTerm, filterStatus]);
 
  // Calcular usuarios paginados
  const paginatedUsers = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredUsers.slice(start, start + pageSize);
  }, [filteredUsers, page, pageSize]);

  // Calcular total de páginas
  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / pageSize));

  // Resetear página cuando cambien los filtros
  useEffect(() => {
    setPage(1);
  }, [searchTerm, filterStatus, pageSize]);

  // Limpiar error
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Obtener todos los usuarios
  const fetchUsers = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const res = await fetch("/api/users", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      const data: ApiResponse<User[]> = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || "Error al obtener los usuarios");
      }

      const usersData = data.data || [];
      setUsers(usersData);
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Error desconocido al cargar usuarios";
      setError(message);
      console.error("Error fetching users:", err);
    } finally {
      setIsLoading(false);
    }
  }, [setIsLoading, setError, setUsers]);

  // Obtener usuario por ID
  const getUserById = useCallback(async (id: number): Promise<User | null> => {
    try {
      setError(null);

      const res = await fetch(`/api/users?id=${id}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      const data: ApiResponse<User> = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || "Error al obtener el usuario");
      }

      return data.data || null;
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Error desconocido al obtener usuario";
      setError(message);
      console.error("Error getting user by ID:", err);
      return null;
    }
  }, []);

  // Crear nuevo usuario
  const createUser = useCallback(
    async (formData: FormData) => {
      try {
        setError(null);
        let hasCriticalFields = true;
        let missingFields = [];

        // Verificar campos obligatorios
        const requiredFields = [
          "run",
          "nick",
          "nombre",
          "apellido",
          "direccion",
          "telefono",
          "estado_civil",
          "afp",
          "rol_id",
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
            message: `Faltan campos obligatorios: ${missingFields.join(", ")}`,
            errors: missingFields.map(
              (field) => `${field}: Este campo es obligatorio`
            ),
          };
        }

        // Realizar la petición
        const res = await fetch("/api/users", {
          method: "POST",
          body: formData, // FormData se envía tal como está para archivos
        });

        // Procesar la respuesta
        let data: ApiResponse<null>;
        try {
          data = await res.json();
        } catch (jsonError) {
          console.error("Error al parsear la respuesta JSON:", jsonError);
          return {
            success: false,
            message: "Error al procesar la respuesta del servidor",
          };
        }

        console.log("Respuesta de creación:", {
          status: res.status,
          success: data.success,
          message: data.message,
          errors: data.errors,
        });

        if (!res.ok || !data.success) {
          const errors =
            data.errors?.map((err) => `${err.field}: ${err.message}`) || [];
          return {
            success: false,
            message: data.message || "Error al crear el usuario",
            errors: errors.length > 0 ? errors : undefined,
          };
        }

        // Actualizar el estado local sin recargar desde el servidor
        const newUser: User = {
          id: Date.now(), // ID temporal hasta que se confirme desde el servidor
          name: formData.get('nombre') as string,
          lastName: formData.get('apellido') as string,
          nick: formData.get('nick') as string,
          run: formData.get('run') as string,
          email: formData.get('correo') as string,
          phone: formData.get('telefono') as string,
          address: formData.get('direccion') as string,
          maritalStatus: formData.get('estado_civil') as string,
          afp: formData.get('afp') as string,
          role: 'Nuevo', // Se actualizará cuando se recargue
          status: 1,
          salary: parseFloat(formData.get('sueldo') as string) || 0,
          contributions: parseFloat(formData.get('aporte') as string) || 0,
          discount: parseFloat(formData.get('descuento') as string) || 0,
          housing_discount: false,
          foto: formData.get('foto') as string || '',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        
        setUsers(prevUsers => [newUser, ...prevUsers]);

        return {
          success: true,
          message: data.message || "Usuario creado exitosamente",
        };
      } catch (err) {
        console.error("Error en createUser:", err);
        const message =
          err instanceof Error
            ? err.message
            : "Error de conexión al crear usuario";

        return {
          success: false,
          message,
        };
      }
    },
    [fetchUsers]
  );

  // Actualizar usuario existente
  const updateUser = useCallback(
    async (id: number, userData: any) => {
      try {
        setError(null);

        console.log("🔵 updateUser iniciado con ID:", id);
        console.log("🔵 userData tipo:", typeof userData);
        console.log("🔵 userData instanceof FormData:", userData instanceof FormData);

        // Verificar si userData es FormData o un objeto regular
        const isFormData = userData instanceof FormData;
        console.log("¿Es FormData?", isFormData);

        let res;
        if (isFormData) {
          // Si es FormData, asegurarse de que tenga el ID
          userData.append("id", id.toString());

          // Verificar que formData contiene los datos críticos
          let hasCriticalFields = true;
          let missingFields = [];

          // Verificar que el ID esté presente
          if (!userData.has("id")) {
            hasCriticalFields = false;
            missingFields.push("id");
          }

          if (!hasCriticalFields) {
            console.error(
              "Faltan campos obligatorios para actualización:",
              missingFields
            );
            return {
              success: false,
              message: `Faltan campos obligatorios: ${missingFields.join(
                ", "
              )}`,
              errors: missingFields.map(
                (field) => `${field}: Este campo es obligatorio`
              ),
            };
          }

          console.log("🔵 Enviando FormData para actualización:");
          for (const pair of userData.entries()) {
            console.log(`🔵 ${pair[0]}: ${pair[1]}`);
          }

          // Verificar si hay una imagen
          const hasImage =
            userData.has("foto") && userData.get("foto") instanceof File;
          console.log("¿Contiene imagen para actualización?", hasImage);

          console.log("🔵 Haciendo fetch a /api/users con método PUT");
          res = await fetch("/api/users", {
            method: "PUT",
            body: userData,
          });
          console.log("🔵 Respuesta del servidor recibida, status:", res.status);
        } else {
          // Si es un objeto regular, verificar que tenga ID
          if (!id) {
            return {
              success: false,
              message: "ID de usuario es requerido para actualización",
            };
          }

          // Si es un objeto regular, usar JSON
          console.log("Enviando JSON para actualización:", { id, ...userData });
          res = await fetch("/api/users", {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ id, ...userData }),
          });
        }

        // Procesar la respuesta
        let data: ApiResponse<null>;
        try {
          data = await res.json();
          console.log("🔵 Respuesta JSON parseada:", data);
        } catch (jsonError) {
          console.error(
            "Error al parsear la respuesta JSON de actualización:",
            jsonError
          );
          return {
            success: false,
            message: "Error al procesar la respuesta del servidor",
          };
        }

        console.log("Respuesta de actualización:", {
          status: res.status,
          success: data.success,
          message: data.message,
          errors: data.errors,
        });

        if (!res.ok || !data.success) {
          const errors =
            data.errors?.map((err) => `${err.field}: ${err.message}`) || [];
          return {
            success: false,
            message: data.message || "Error al actualizar el usuario",
            errors: errors.length > 0 ? errors : undefined,
          };
        }

        // Actualizar el usuario en el estado local
        setUsers(prevUsers => 
          prevUsers.map(user => 
            user.id === id 
              ? { ...user, ...userData, updated_at: new Date().toISOString() }
              : user
          )
        );

        return {
          success: true,
          message: data.message || "Usuario actualizado exitosamente",
        };
      } catch (err) {
        console.error("Error en updateUser:", err);
        const message =
          err instanceof Error
            ? err.message
            : "Error de conexión al actualizar usuario";

        return {
          success: false,
          message,
        };
      }
    },
    [fetchUsers]
  );

  // Activar usuario
  const activateUser = useCallback(
    async (id: number) => {
      try {
        setError(null);

        console.log("Activando usuario con ID:", id);

        const res = await fetch(`/api/users?action=activate&id=${id}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
        });

        const data: ApiResponse<null> = await res.json();

        console.log("Respuesta de activación:", {
          status: res.status,
          success: data.success,
          message: data.message,
        });

        if (!res.ok || !data.success) {
          return {
            success: false,
            message: data.message || "Error al activar el usuario",
          };
        }

        // Actualizar el estado del usuario en el estado local
        setUsers(prevUsers => 
          prevUsers.map(user => 
            user.id === id 
              ? { ...user, status: 1, updated_at: new Date().toISOString() }
              : user
          )
        );

        return {
          success: true,
          message: data.message || "Usuario activado exitosamente",
        };
      } catch (err) {
        console.error("Error en activateUser:", err);
        const message =
          err instanceof Error
            ? err.message
            : "Error de conexión al activar usuario";

        return {
          success: false,
          message,
        };
      }
    },
    [fetchUsers]
  );

  // Desactivar usuario
  const deactivateUser = useCallback(
    async (id: number) => {
      try {
        setError(null);

        console.log("Desactivando usuario con ID:", id);

        const res = await fetch(`/api/users?action=deactivate&id=${id}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
        });

        const data: ApiResponse<null> = await res.json();

        console.log("Respuesta de desactivación:", {
          status: res.status,
          success: data.success,
          message: data.message,
        });

        if (!res.ok || !data.success) {
          return {
            success: false,
            message: data.message || "Error al desactivar el usuario",
          };
        }

        // Actualizar el estado del usuario en el estado local
        setUsers(prevUsers => 
          prevUsers.map(user => 
            user.id === id 
              ? { ...user, status: 0, updated_at: new Date().toISOString() }
              : user
          )
        );

        return {
          success: true,
          message: data.message || "Usuario desactivado exitosamente",
        };
      } catch (err) {
        console.error("Error en deactivateUser:", err);
        const message =
          err instanceof Error
            ? err.message
            : "Error de conexión al desactivar usuario";

        return {
          success: false,
          message,
        };
      }
    },
    [fetchUsers]
  );

  // Eliminar usuario permanentemente
  const deleteUser = useCallback(
    async (id: number) => {
      try {
        setError(null);

        console.log("Eliminando usuario permanentemente con ID:", id);

        const res = await fetch(`/api/users?action=delete&id=${id}`, {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
        });

        const data: ApiResponse<null> = await res.json();

        console.log("Respuesta de eliminación:", {
          status: res.status,
          success: data.success,
          message: data.message,
        });

        if (!res.ok || !data.success) {
          return {
            success: false,
            message: data.message || "Error al eliminar el usuario",
          };
        }

        // Eliminar el usuario del estado local
        setUsers(prevUsers => prevUsers.filter(user => user.id !== id));

        return {
          success: true,
          message: data.message || "Usuario eliminado permanentemente",
        };
      } catch (err) {
        console.error("Error en deleteUser:", err);
        const message =
          err instanceof Error
            ? err.message
            : "Error de conexión al eliminar usuario";

        return {
          success: false,
          message,
        };
      }
    },
    [fetchUsers]
  );

  // Cargar usuarios al montar el componente
  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  return {
    users,
    filteredUsers,
    paginatedUsers,
    isLoading,
    error,
    searchTerm,
    setSearchTerm,
    filterStatus,
    setFilterStatus,
    page,
    setPage,
    pageSize,
    setPageSize,
    totalPages,
    fetchUsers,
    createUser,
    updateUser,
    activateUser,
    deactivateUser,
    deleteUser,
    getUserById,
    clearError,
  };
}
