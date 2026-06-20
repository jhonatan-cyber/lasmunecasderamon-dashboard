import { useState, useEffect, useCallback, useMemo } from 'react';
import { useGenericFetch } from '../shared/useGenericFetch';
import { useGenericMutations } from '../shared/useGenericMutations';
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

  totalCommissions: number;
  totalSales: number;
  pendingCommissions: number;
  paidCommissions: number;
  avgCommissionRate: number;
}

export function useCommissions(): UseCommissionsReturn {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [employeeFilter, setEmployeeFilter] = useState<string>('all');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState<string>('');

  const buildUrl = useCallback(() => {
    const params = new URLSearchParams();
    if (statusFilter !== 'all') params.append('status', statusFilter);
    if (employeeFilter !== 'all') params.append('employeeId', employeeFilter);
    if (debouncedSearchTerm.trim()) params.append('search', debouncedSearchTerm.trim());
    params.append('limit', '100');
    return `/api/commissions?${params.toString()}`;
  }, [statusFilter, employeeFilter, debouncedSearchTerm]);

  const {
    data: commissions,
    isLoading,
    error,
    refetch,
    setData
  } = useGenericFetch<Commission>(buildUrl(), {
    transform: result => (result.success ? result.data : [])
  });

  const { create, update, remove } = useGenericMutations<Commission>('/api/commissions', {
    onSuccess: () => {
      refetch();
    },
    showToasts: true,
    entityName: 'Comisión'
  });

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    refetch();
  }, [statusFilter, employeeFilter, debouncedSearchTerm, refetch]);

  const filteredCommissions = useMemo(() => {
    if (!commissions) return [];
    let filtered = [...commissions];

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

    if (statusFilter !== 'all') {
      filtered = filtered.filter(commission => commission.status === statusFilter);
    }

    if (employeeFilter !== 'all') {
      filtered = filtered.filter(commission => commission.employeeId === employeeFilter);
    }

    return filtered;
  }, [commissions, debouncedSearchTerm, statusFilter, employeeFilter]);

  const clearError = useCallback(() => {}, []);

  const getCommissionById = useCallback(async (id: string): Promise<Commission | null> => {
    try {
      const res = await fetch(`/api/commissions?id=${id}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });
      const data: ApiResponse<Commission> = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Error al obtener la comisión');
      }
      return data.data || null;
    } catch (err) {
      return null;
    }
  }, []);

  const createCommission = useCallback(
    async (commissionData: Partial<Commission>) => {
      try {
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

        await create(commissionData);
        return { success: true, message: 'Comisión creada exitosamente' };
      } catch (err) {
        return {
          success: false,
          message: err instanceof Error ? err.message : 'Error al crear comisión'
        };
      }
    },
    [create]
  );

  const updateCommission = useCallback(
    async (id: string, commissionData: Partial<Commission>) => {
      try {
        if (!id) {
          return { success: false, message: 'ID de comisión es requerido para actualización' };
        }
        await update({ id, ...commissionData });
        return { success: true, message: 'Comisión actualizada exitosamente' };
      } catch (err) {
        return {
          success: false,
          message: err instanceof Error ? err.message : 'Error al actualizar comisión'
        };
      }
    },
    [update]
  );

  const deleteCommission = useCallback(
    async (id: string) => {
      try {
        if (!id) {
          return { success: false, message: 'ID de comisión es requerido' };
        }
        await remove(id);
        return { success: true, message: 'Comisión eliminada exitosamente' };
      } catch (err) {
        return {
          success: false,
          message: err instanceof Error ? err.message : 'Error al eliminar comisión'
        };
      }
    },
    [remove]
  );

  const totalCommissions = useMemo(
    () => (commissions || []).reduce((sum, commission) => sum + commission.total, 0),
    [commissions]
  );

  const totalSales = useMemo(
    () =>
      (commissions || []).reduce(
        (sum, commission) => sum + commission.venta + commission.servicio,
        0
      ),
    [commissions]
  );

  const pendingCommissions = useMemo(
    () => (commissions || []).filter(commission => commission.status === 'por_pagar').length,
    [commissions]
  );

  const paidCommissions = useMemo(
    () => (commissions || []).filter(commission => commission.status === 'pagado').length,
    [commissions]
  );

  const avgCommissionRate = useMemo(() => {
    const comms = commissions || [];
    return comms.length > 0
      ? comms.reduce((sum, commission) => {
          const saleAmount = commission.venta + commission.servicio;
          return sum + (saleAmount > 0 ? (commission.total / saleAmount) * 100 : 0);
        }, 0) / comms.length
      : 0;
  }, [commissions]);

  return {
    commissions: commissions || [],
    filteredCommissions,
    isLoading,
    error,
    searchTerm,
    setSearchTerm,
    statusFilter,
    setStatusFilter,
    employeeFilter,
    setEmployeeFilter,
    fetchCommissions: async () => {
      await refetch();
    },
    createCommission,
    updateCommission,
    deleteCommission,
    getCommissionById,
    clearError,

    totalCommissions,
    totalSales,
    pendingCommissions,
    paidCommissions,
    avgCommissionRate
  };
}
