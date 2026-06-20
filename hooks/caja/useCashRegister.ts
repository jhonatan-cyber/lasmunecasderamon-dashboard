 
import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Caja,
  CajaWithUser,
  CajaCreate,
  CajaUpdate,
  CajaCierre,
  CajaResumen,
  CajaRetiro
} from '@/types/caja';
import { toast } from 'sonner';
import { useGenericFetch } from '../shared/useGenericFetch';

interface UseCashRegisterReturn {
  cajas: CajaWithUser[];
  cajaActual: CajaWithUser | null;
  resumen: CajaResumen | null;
  hasOpenCaja: boolean | null;
  cajaInfo: any | null;
  loading: boolean;
  error: string | null;
  mutationError: string | null;
  getCajas: (estado?: number) => Promise<void>;
  getCajaById: (id: number) => Promise<void>;
  getResumen: () => Promise<void>;
  checkCajaStatus: () => Promise<void>;
  createCaja: (data: CajaCreate) => Promise<CajaWithUser | null>;
  updateCaja: (id: number, data: CajaUpdate) => Promise<CajaWithUser | null>;
  cerrarCaja: (data: CajaCierre) => Promise<CajaWithUser | null>;
  retirarDinero: (data: CajaRetiro) => Promise<boolean>;
  deleteCaja: (id: number) => Promise<boolean>;
}

export const useCashRegister = (): UseCashRegisterReturn => {
  const [cajaActual, setCajaActual] = useState<CajaWithUser | null>(null);
  const [resumen, setResumen] = useState<CajaResumen | null>(null);
  const [hasOpenCaja, setHasOpenCaja] = useState<boolean | null>(null);
  const [cajaInfo, setCajaInfo] = useState<any | null>(null);
  const [mutationLoading, setMutationLoading] = useState(false);
  const [mutationError, setMutationError] = useState<string | null>(null);
  const [estadoFilter, setEstadoFilter] = useState<number | undefined>(undefined);

  const cajasEndpoint = useMemo(() => {
    if (estadoFilter === undefined) return '/api/cashregister';
    return `/api/cashregister?estado=${estadoFilter}`;
  }, [estadoFilter]);

  const {
    data: cajas,
    isLoading: fetchLoading,
    error: fetchError,
    refetch: refetchCajas,
    setData: setCajas
  } = useGenericFetch<CajaWithUser>(cajasEndpoint, {
    initialFetch: false,
    transform: data => (data.success ? data.data : [])
  });

  const loading = fetchLoading || mutationLoading;
  const error = fetchError || mutationError;

  const handleError = useCallback((error: any, message: string) => {
    const errorMessage = error?.message || message;
    setMutationError(errorMessage);
    toast.error(errorMessage);
  }, []);

  const getCajas = useCallback(
    async (estado?: number) => {
      setEstadoFilter(estado);
      await refetchCajas();
    },
    [refetchCajas]
  );

  const getCajaById = useCallback(
    async (id: number) => {
      setMutationLoading(true);
      setMutationError(null);
      try {
        const response = await fetch(`/api/cashregister?id=${id}`);
        const result = await response.json();

        if (!result.success) {
          throw new Error(result.message || 'Error al obtener caja');
        }

        setCajaActual(result.data);
      } catch (error) {
        handleError(error, 'Error al obtener caja');
      } finally {
        setMutationLoading(false);
      }
    },
    [handleError]
  );

  const getResumen = useCallback(async () => {
    setMutationLoading(true);
    setMutationError(null);
    try {
      const response = await fetch('/api/cashregister?resumen=1');
      const result = await response.json();

      if (!result.success) {
        throw new Error(result.message || 'Error al obtener resumen');
      }

      setResumen(result.data);
    } catch (error) {
      handleError(error, 'Error al obtener resumen');
    } finally {
      setMutationLoading(false);
    }
  }, [handleError]);

  const checkCajaStatus = useCallback(async () => {
    try {
      setMutationLoading(true);
      setMutationError(null);
      const response = await fetch('/api/cashregister/status');
      const data = await response.json();

      if (data.success) {
        setHasOpenCaja(data.data.hasOpenCaja);
        setCajaInfo(data.data.cajaInfo);
      } else {
        setHasOpenCaja(false);
        setCajaInfo(null);
        setMutationError(data.message || 'Error al verificar estado de caja');
      }
    } catch (err) {
      setMutationError(err instanceof Error ? err.message : 'Error desconocido');
      setHasOpenCaja(false);
      setCajaInfo(null);
    } finally {
      setMutationLoading(false);
    }
  }, []);

  const createCaja = useCallback(
    async (data: CajaCreate): Promise<CajaWithUser | null> => {
      setMutationLoading(true);
      setMutationError(null);
      try {
        const response = await fetch('/api/cashregister', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(data)
        });

        const result = await response.json();

        if (!result.success) {
          throw new Error(result.message || 'Error al crear caja');
        }

        toast.success('Caja creada exitosamente');
        await getCajas();
        await checkCajaStatus();

        window.dispatchEvent(new CustomEvent('cajaOpened', { detail: result.data }));

        return result.data;
      } catch (error) {
        handleError(error, 'Error al crear caja');
        return null;
      } finally {
        setMutationLoading(false);
      }
    },
    [getCajas, checkCajaStatus, handleError]
  );

  const updateCaja = useCallback(
    async (id: number, data: CajaUpdate): Promise<CajaWithUser | null> => {
      setMutationLoading(true);
      setMutationError(null);
      try {
        const response = await fetch('/api/cashregister', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ id_caja: id, ...data })
        });

        const result = await response.json();

        if (!result.success) {
          throw new Error(result.message || 'Error al actualizar caja');
        }

        toast.success('Caja actualizada exitosamente');
        await getCajas();
        return result.data;
      } catch (error) {
        handleError(error, 'Error al actualizar caja');
        return null;
      } finally {
        setMutationLoading(false);
      }
    },
    [getCajas, handleError]
  );

  const cerrarCaja = useCallback(
    async (data: CajaCierre): Promise<CajaWithUser | null> => {
      setMutationLoading(true);
      setMutationError(null);
      try {
        const response = await fetch('/api/cashregister', {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(data)
        });

        const result = await response.json();

        if (!result.success) {
          throw new Error(result.message || 'Error al cerrar caja');
        }

        toast.success('Caja cerrada exitosamente');
        await getCajas();
        await checkCajaStatus();

        
        window.dispatchEvent(new CustomEvent('cajaClosed', { detail: result.data }));

        return result.data;
      } catch (error) {
        handleError(error, 'Error al cerrar caja');
        return null;
      } finally {
        setMutationLoading(false);
      }
    },
    [getCajas, checkCajaStatus, handleError]
  );

  const retirarDinero = useCallback(
    async (data: CajaRetiro): Promise<boolean> => {
      setMutationLoading(true);
      setMutationError(null);
      try {
        const response = await fetch('/api/cashregister/retiros', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(data)
        });

        const result = await response.json();

        if (!result.success) {
          throw new Error(result.message || 'Error al retirar dinero');
        }

        toast.success('Retiro realizado exitosamente');
        void getCajas();
        void getResumen();
        return true;
      } catch (error) {
        handleError(error, 'Error al retirar dinero');
        return false;
      } finally {
        setMutationLoading(false);
      }
    },
    [getCajas, getResumen, handleError]
  );

  const deleteCaja = useCallback(
    async (id: number): Promise<boolean> => {
      setMutationLoading(true);
      setMutationError(null);
      try {
        const response = await fetch(`/api/cashregister?id=${id}`, {
          method: 'DELETE'
        });

        const result = await response.json();

        if (!result.success) {
          throw new Error(result.message || 'Error al eliminar caja');
        }

        toast.success('Caja eliminada exitosamente');
        await getCajas();
        return true;
      } catch (error) {
        handleError(error, 'Error al eliminar caja');
        return false;
      } finally {
        setMutationLoading(false);
      }
    },
    [getCajas, handleError]
  );

  
  useEffect(() => {
    getCajas();
    getResumen();
    checkCajaStatus();
  }, [getCajas, getResumen, checkCajaStatus]);

  return {
    cajas,
    cajaActual,
    resumen,
    hasOpenCaja,
    cajaInfo,
    loading,
    error,
    mutationError,
    getCajas,
    getCajaById,
    getResumen,
    checkCajaStatus,
    createCaja,
    updateCaja,
    cerrarCaja,
    retirarDinero,
    deleteCaja
  };
};

