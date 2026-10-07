'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  VentaWithDetails,
  VentaCreate,
  VentaUpdate,
  VentaResumen,
  VentaFiltros
} from '@/types/venta';
import { showErrorToast } from '@/lib/utils/toastUtils';
import { useGenericFetch } from '../shared/useGenericFetch';

export const useSales = () => {
  const [resumen, setResumen] = useState<VentaResumen | null>(null);
  const [mutationLoading, setMutationLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentFilters, setCurrentFilters] = useState<VentaFiltros | undefined>(undefined);

  const endpoint = useMemo(() => {
    const params = new URLSearchParams();

    params.append('limit', '1000');

    if (currentFilters) {
      Object.entries(currentFilters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && key !== 'limit' && key !== 'page') {
          params.append(key, value.toString());
        }
      });
    }

    return `/api/sales?${params.toString()}`;
  }, [currentFilters]);

  const {
    data: ventas,
    isLoading: fetchLoading,
    error: fetchError,
    refetch,
    setData: setVentas
  } = useGenericFetch<VentaWithDetails>(endpoint, {
    initialFetch: false,
    transform: data => {
      const payload = data?.data;
      const ventasArray = Array.isArray(payload?.data)
        ? payload.data
        : Array.isArray(payload)
          ? payload
          : Array.isArray(data)
            ? data
            : [];
      return ventasArray.filter(
        (item: unknown): item is VentaWithDetails =>
          item != null && typeof item === 'object' && 'estado' in item
      );
    }
  });

  const loading = fetchLoading || mutationLoading;

  const getVentas = useCallback(
    async (filtros?: VentaFiltros) => {
      setCurrentFilters(filtros);
      await refetch();
    },
    [refetch]
  );

  const getVentaById = async (id: string | number): Promise<VentaWithDetails | null> => {
    try {
      const response = await fetch(`/api/sales/${id}`);
      if (!response.ok) {
        throw new Error('Error al cargar la venta');
      }
      return await response.json();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
      return null;
    }
  };

  const createVenta = useCallback(
    async (ventaData: VentaCreate): Promise<any> => {
      setMutationLoading(true);
      setError(null);
      try {
        const response = await fetch('/api/sales', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(ventaData)
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error?.message || errorData.message || 'Error al crear venta');
        }

        const nuevaVenta = await response.json();
        if (
          setVentas &&
          nuevaVenta?.data &&
          typeof nuevaVenta.data === 'object' &&
          'estado' in nuevaVenta.data
        ) {
          setVentas((prev: VentaWithDetails[] | undefined) => [nuevaVenta.data, ...(prev || [])]);
        }
        return nuevaVenta;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
        setError(errorMessage);

        showErrorToast(errorMessage);

        return null;
      } finally {
        setMutationLoading(false);
      }
    },
    [setVentas]
  );

  const updateVenta = useCallback(
    async (id: string | number, ventaData: VentaUpdate): Promise<boolean> => {
      setMutationLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/sales/${id}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(ventaData)
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Error al actualizar venta');
        }

        await getVentas(currentFilters);
        return true;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
        setError(errorMessage);
        showErrorToast('Error al actualizar la venta');
        return false;
      } finally {
        setMutationLoading(false);
      }
    },
    [getVentas, currentFilters]
  );

  const deleteVenta = useCallback(
    async (id: string | number): Promise<boolean> => {
      setMutationLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/sales/${id}`, {
          method: 'DELETE'
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Error al eliminar venta');
        }

        if (setVentas) {
          setVentas((prev: VentaWithDetails[] | undefined) =>
            (prev || []).filter((venta: VentaWithDetails) => String(venta.id) !== String(id))
          );
        }
        return true;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
        setError(errorMessage);
        showErrorToast('Error al eliminar la venta');
        return false;
      } finally {
        setMutationLoading(false);
      }
    },
    [setVentas]
  );

  const getResumen = useCallback(async (filtros?: VentaFiltros) => {
    setMutationLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.append('tipo', 'resumen');

      if (filtros) {
        Object.entries(filtros).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            params.append(key, value.toString());
          }
        });
      }

      const response = await fetch(`/api/sales?${params.toString()}`);
      if (!response.ok) {
        throw new Error('Error al cargar resumen de ventas');
      }
      const data = await response.json();
      setResumen(data.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setMutationLoading(false);
    }
  }, []);

  // ponytail: removed cancelarVenta and devolverVenta — both pointed to non-existent routes

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  useEffect(() => {
    const handleUpdateSales = () => {
      getVentas(currentFilters);
    };

    window.addEventListener('updateSales', handleUpdateSales);

    return () => {
      window.removeEventListener('updateSales', handleUpdateSales);
    };
  }, [getVentas, currentFilters]);

  return {
    ventas,
    resumen,
    loading,
    error,
    getVentas,
    getVentaById,
    createVenta,
    updateVenta,
    deleteVenta,
    getResumen,
    cancelarVenta: undefined,
    devolverVenta: undefined,
    clearError
  };
};
