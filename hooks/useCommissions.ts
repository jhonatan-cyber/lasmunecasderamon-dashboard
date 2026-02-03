import { useState, useEffect, useCallback } from 'react';
import { showSuccessToast, showErrorToast } from '@/lib/toastUtils';
import { Commission, ApiResponse } from '@/types/commission';

interface UseCommissionsReturn {
  commissions: Commission[];
  filteredCommissions: Commission[];
  isLoading: boolean;
  error: string | null;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  statusFilter: string;
  setStatusFilter: (status: string) => void;
  employeeFilter: string;
  setEmployeeFilter: (employeeId: string) => void;
  fetchCommissions: () => Promise<void>;
  createCommission: (
    commissionData: Partial<Commission>
  ) => Promise<{ success: boolean; message: string; errors?: string[] }>;
  updateCommission: (
    id: string,
    commissionData: Partial<Commission>
  ) => Promise<{ success: boolean; message: string; errors?: string[] }>;
  deleteCommission: (id: string) => Promise<{ success: boolean; message: string }>;
  getCommissionById: (id: string) => Promise<Commission | null>;
  clearError: () => void;
  // Estadísticas calculadas
  totalCommissions: number;
  totalSales: number;
  pendingCommissions: number;
  paidCommissions: number;
  avgCommissionRate: number;
}

export function useCommissions(): UseCommissionsReturn {
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [filteredCommissions, setFilteredCommissions] = useState<Commission[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [employeeFilter, setEmployeeFilter] = useState<string>('all');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState<string>('');

  // Debounce para el término de búsqueda
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Filtrar comisiones basado en los filtros aplicados
  useEffect(() => {
    let filtered = [...commissions];

    // Filtro por término de búsqueda
    if (debouncedSearchTerm.trim()) {
      const lowercased = debouncedSearchTerm.toLowerCase().trim();
      filtered = filtered.filter(commission => {
        const searchableFields = [
          commission.employeeName,
          commission.nick,
          commission.description,
          commission.clientName
        ];

        return searchableFields.some(field => field?.toLowerCase().includes(lowercased));
      });
    }

    // Filtro por estado
    if (statusFilter !== 'all') {
      filtered = filtered.filter(commission => commission.status === statusFilter);
    }

    // Filtro por empleado
    if (employeeFilter !== 'all') {
      filtered = filtered.filter(commission => commission.employeeId === employeeFilter);
    }

    setFilteredCommissions(filtered);
  }, [debouncedSearchTerm, statusFilter, employeeFilter, commissions]);

  // Limpiar error
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Obtener todas las comisiones con filtros
  const fetchCommissions = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (employeeFilter !== 'all') params.append('employeeId', employeeFilter);
      if (debouncedSearchTerm.trim()) params.append('search', debouncedSearchTerm.trim());
      // Aumentar el límite por defecto para traer más datos si no hay paginación en el servidor aún manejada por el hook
      params.append('limit', '100');

      const res = await fetch(`/api/commissions?${params.toString()}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const data: ApiResponse<Commission[]> = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Error al obtener las comisiones');
      }

      const commissionsData = data.data || [];
      setCommissions(commissionsData);
      setFilteredCommissions(commissionsData);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error desconocido al cargar comisiones';
      setError(message);

      showErrorToast(message);
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter, employeeFilter, debouncedSearchTerm]);

  // Obtener comisión por ID
  const getCommissionById = useCallback(async (id: string): Promise<Commission | null> => {
    try {
      setError(null);

      const res = await fetch(`/api/commissions?id=${id}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const data: ApiResponse<Commission> = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Error al obtener la comisión');
      }

      return data.data || null;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error desconocido al obtener comisión';
      setError(message);

      showErrorToast(message);
      return null;
    }
  }, []);

  // Crear nueva comisión
  const createCommission = useCallback(
    async (commissionData: Partial<Commission>) => {
      try {
        setError(null);

        // Validar campos requeridos
        const requiredFields = ['employeeId', 'venta', 'servicio', 'total'];
        const missingFields = requiredFields.filter(
          field => !commissionData[field as keyof Commission]
        );

        if (missingFields.length > 0) {
          return {
            success: false,
            message: `Faltan campos obligatorios: ${missingFields.join(', ')}`,
            errors: missingFields.map(field => `${field}: Este campo es obligatorio`)
          };
        }

        const res = await fetch('/api/commissions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(commissionData)
        });

        const data: ApiResponse<null> = await res.json();

        if (!res.ok || !data.success) {
          const errors = data.errors?.map(err => `${err.field}: ${err.message}`) || [];
          return {
            success: false,
            message: data.message || 'Error al crear la comisión',
            errors: errors.length > 0 ? errors : undefined
          };
        }

        // Recargar la lista de comisiones después de crear una nueva
        await fetchCommissions();
        showSuccessToast(data.message || 'Comisión creada exitosamente');

        return {
          success: true,
          message: data.message || 'Comisión creada exitosamente'
        };
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Error de conexión al crear comisión';

        showErrorToast(message);
        return {
          success: false,
          message
        };
      }
    },
    [fetchCommissions]
  );

  // Actualizar comisión existente
  const updateCommission = useCallback(
    async (id: string, commissionData: Partial<Commission>) => {
      try {
        setError(null);

        if (!id) {
          return {
            success: false,
            message: 'ID de comisión es requerido para actualización'
          };
        }

        const res = await fetch(`/api/commissions?id=${id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(commissionData)
        });

        const data: ApiResponse<null> = await res.json();

        if (!res.ok || !data.success) {
          const errors = data.errors?.map(err => `${err.field}: ${err.message}`) || [];
          return {
            success: false,
            message: data.message || 'Error al actualizar la comisión',
            errors: errors.length > 0 ? errors : undefined
          };
        }

        // Recargar la lista de comisiones después de actualizar
        await fetchCommissions();
        showSuccessToast(data.message || 'Comisión actualizada exitosamente');

        return {
          success: true,
          message: data.message || 'Comisión actualizada exitosamente'
        };
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Error de conexión al actualizar comisión';

        showErrorToast(message);
        return {
          success: false,
          message
        };
      }
    },
    [fetchCommissions]
  );

  // Eliminar (desactivar) comisión
  const deleteCommission = useCallback(
    async (id: string) => {
      try {
        setError(null);

        if (!id) {
          return {
            success: false,
            message: 'ID de comisión es requerido'
          };
        }

        const res = await fetch(`/api/commissions?id=${id}`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json'
          }
        });

        const data: ApiResponse<null> = await res.json();

        if (!res.ok || !data.success) {
          return {
            success: false,
            message: data.message || 'Error al eliminar la comisión'
          };
        }

        // Recargar la lista de comisiones después de eliminar
        await fetchCommissions();
        showSuccessToast(data.message || 'Comisión eliminada exitosamente');

        return {
          success: true,
          message: data.message || 'Comisión eliminada exitosamente'
        };
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Error de conexión al eliminar comisión';

        showErrorToast(message);
        return {
          success: false,
          message
        };
      }
    },
    [fetchCommissions]
  );

  // Cargar comisiones al montar el componente
  useEffect(() => {
    fetchCommissions();
  }, [fetchCommissions]);

  // Calcular estadísticas
  const totalCommissions = commissions.reduce((sum, commission) => sum + commission.total, 0);
  const totalSales = commissions.reduce(
    (sum, commission) => sum + commission.venta + commission.servicio,
    0
  );
  const pendingCommissions = commissions.filter(
    commission => commission.status === 'por_pagar'
  ).length;
  const paidCommissions = commissions.filter(commission => commission.status === 'pagado').length;
  const avgCommissionRate =
    commissions.length > 0
      ? commissions.reduce((sum, commission) => {
          const saleAmount = commission.venta + commission.servicio;
          return sum + (saleAmount > 0 ? (commission.total / saleAmount) * 100 : 0);
        }, 0) / commissions.length
      : 0;

  return {
    commissions,
    filteredCommissions,
    isLoading,
    error,
    searchTerm,
    setSearchTerm,
    statusFilter,
    setStatusFilter,
    employeeFilter,
    setEmployeeFilter,
    fetchCommissions,
    createCommission,
    updateCommission,
    deleteCommission,
    getCommissionById,
    clearError,
    // Estadísticas
    totalCommissions,
    totalSales,
    pendingCommissions,
    paidCommissions,
    avgCommissionRate
  };
}
