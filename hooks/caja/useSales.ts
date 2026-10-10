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

function salesEndpoint(filters?: VentaFiltros): string {
  const params = new URLSearchParams({ limit: '1000' });
  for (const [key, value] of Object.entries(filters ?? {})) {
    if (value != null && key !== 'limit' && key !== 'page') params.append(key, String(value));
  }
  return `/api/sales?${params.toString()}`;
}

function salesArray(data: any): VentaWithDetails[] {
  const payload = data?.data;
  const rows = Array.isArray(payload?.data)
    ? payload.data
    : Array.isArray(payload)
      ? payload
      : Array.isArray(data)
        ? data
        : [];
  return rows.filter(
    (item: unknown): item is VentaWithDetails =>
      item != null && typeof item === 'object' && 'estado' in item
  );
}

export const useSales = () => {
  const [resumen, setResumen] = useState<VentaResumen | null>(null);
  const [mutationLoading, setMutationLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentFilters, setCurrentFilters] = useState<VentaFiltros | undefined>(undefined);

  const endpoint = useMemo(() => salesEndpoint(currentFilters), [currentFilters]);

  const {
    data: ventas,
    isFetching: fetchLoading,
    error: fetchError,
    fetchEndpoint,
    setData: setVentas
  } = useGenericFetch<VentaWithDetails>(endpoint, {
    initialFetch: false,
    transform: salesArray
  });

  const loading = fetchLoading || mutationLoading;

  const getVentas = useCallback(
    async (filtros?: VentaFiltros) => {
      setCurrentFilters(filtros);
      setError(null);
      try {
        await fetchEndpoint(salesEndpoint(filtros));
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error al cargar ventas');
      }
    },
    [fetchEndpoint]
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
    error: error || fetchError,
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
