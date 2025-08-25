import { useState, useEffect, useCallback } from 'react';
import { Caja, CajaWithUser, CajaCreate, CajaUpdate, CajaCierre, CajaResumen } from '@/types/caja';
import { toast } from 'sonner';

interface UseCashRegisterReturn {
  cajas: CajaWithUser[];
  cajaActual: CajaWithUser | null;
  resumen: CajaResumen | null;
  hasOpenCaja: boolean | null;
  cajaInfo: any | null;
  loading: boolean;
  error: string | null;
  getCajas: (estado?: number) => Promise<void>;
  getCajaById: (id: number) => Promise<void>;
  getResumen: () => Promise<void>;
  checkCajaStatus: () => Promise<void>;
  createCaja: (data: CajaCreate) => Promise<CajaWithUser | null>;
  updateCaja: (id: number, data: CajaUpdate) => Promise<CajaWithUser | null>;
  cerrarCaja: (data: CajaCierre) => Promise<CajaWithUser | null>;
  deleteCaja: (id: number) => Promise<boolean>;
}

export const useCashRegister = (): UseCashRegisterReturn => {
  const [cajas, setCajas] = useState<CajaWithUser[]>([]);
  const [cajaActual, setCajaActual] = useState<CajaWithUser | null>(null);
  const [resumen, setResumen] = useState<CajaResumen | null>(null);
  const [hasOpenCaja, setHasOpenCaja] = useState<boolean | null>(null);
  const [cajaInfo, setCajaInfo] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleError = (error: any, message: string) => {
  
    const errorMessage = error?.message || message;
    setError(errorMessage);
    toast.error(errorMessage);
  };

  const getCajas = useCallback(async (estado?: number) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (estado !== undefined) {
        params.append('estado', estado.toString());
      }

      const response = await fetch(`/api/cashregister?${params.toString()}`);
      const result = await response.json();

      if (!result.success) {
        throw new Error(result.message || 'Error al obtener cajas');
      }

      setCajas(result.data);
    } catch (error) {
      handleError(error, 'Error al obtener cajas');
    } finally {
      setLoading(false);
    }
  }, []);

  const getCajaById = useCallback(async (id: number) => {
    setLoading(true);
    setError(null);
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
      setLoading(false);
    }
  }, []);

  const getResumen = useCallback(async () => {
    setLoading(true);
    setError(null);
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
      setLoading(false);
    }
  }, []);

  const checkCajaStatus = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch("/api/cashregister?status=check");
      const data = await response.json();
      
      if (data.success) {
        setHasOpenCaja(data.data.hasOpenCaja);
        setCajaInfo(data.data.cajaInfo);
      } else {
        setHasOpenCaja(false);
        setCajaInfo(null);
        setError(data.message || "Error al verificar estado de caja");
      }
    } catch (err) {
    
      setError(err instanceof Error ? err.message : "Error desconocido");
      setHasOpenCaja(false);
      setCajaInfo(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const createCaja = useCallback(async (data: CajaCreate): Promise<CajaWithUser | null> => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/cashregister', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.message || 'Error al crear caja');
      }

      toast.success('Caja creada exitosamente');
      await getCajas(); // Actualizar lista
      await checkCajaStatus(); // Actualizar estado
      return result.data;
    } catch (error) {
      handleError(error, 'Error al crear caja');
      return null;
    } finally {
      setLoading(false);
    }
  }, [getCajas, checkCajaStatus]);

  const updateCaja = useCallback(async (id: number, data: CajaUpdate): Promise<CajaWithUser | null> => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/cashregister', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id, ...data }),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.message || 'Error al actualizar caja');
      }

      toast.success('Caja actualizada exitosamente');
      await getCajas(); // Actualizar lista
      return result.data;
    } catch (error) {
      handleError(error, 'Error al actualizar caja');
      return null;
    } finally {
      setLoading(false);
    }
  }, [getCajas]);

  const cerrarCaja = useCallback(async (data: CajaCierre): Promise<CajaWithUser | null> => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/cashregister', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.message || 'Error al cerrar caja');
      }

      toast.success('Caja cerrada exitosamente');
      await getCajas(); // Actualizar lista
      await checkCajaStatus(); // Actualizar estado
      return result.data;
    } catch (error) {
      handleError(error, 'Error al cerrar caja');
      return null;
    } finally {
      setLoading(false);
    }
  }, [getCajas, checkCajaStatus]);

  const deleteCaja = useCallback(async (id: number): Promise<boolean> => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/cashregister?id=${id}`, {
        method: 'DELETE',
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.message || 'Error al eliminar caja');
      }

      toast.success('Caja eliminada exitosamente');
      await getCajas(); // Actualizar lista
      return true;
    } catch (error) {
      handleError(error, 'Error al eliminar caja');
      return false;
    } finally {
      setLoading(false);
    }
  }, [getCajas]);

  // Cargar datos iniciales
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
    getCajas,
    getCajaById,
    getResumen,
    checkCajaStatus,
    createCaja,
    updateCaja,
    cerrarCaja,
    deleteCaja,
  };
}; 