'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
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

/**
 * Resultado de pedir el cierre.
 *
 * `pendiente` no es un error: el cajero no cierra la caja, pide autorización y la
 * caja queda abierta hasta que el administrador responda el link del WhatsApp.
 * `null` sí es un fracaso (ya avisado por toast).
 */
export interface CierreCajaResultado {
  estado: 'cerrada' | 'pendiente';
  caja: CajaWithUser | null;
  mensaje: string;
  /** Saldos de clientes que se descuentan del efectivo al cerrar. */
  saldoClientesDescontado: number;
  saldoClientesPorDevolver: number;
  montoCierre: number;
}

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
  cerrarCaja: (data: CajaCierre & { motivo?: string }) => Promise<CierreCajaResultado | null>;
  retirarDinero: (data: CajaRetiro) => Promise<boolean>;
  deleteCaja: (id: number) => Promise<boolean>;
}

const cashRegisterData = (data: any) => (data.success && Array.isArray(data.data) ? data.data : []);

export const useCashRegister = (): UseCashRegisterReturn => {
  const [cajaActual, setCajaActual] = useState<CajaWithUser | null>(null);
  const [resumen, setResumen] = useState<CajaResumen | null>(null);
  const [hasOpenCaja, setHasOpenCaja] = useState<boolean | null>(null);
  const [cajaInfo, setCajaInfo] = useState<any | null>(null);
  const [pendingOperations, setPendingOperations] = useState(0);
  const writeInProgress = useRef(false);
  const detailRequest = useRef<AbortController | null>(null);
  useEffect(() => () => detailRequest.current?.abort(), []);
  const [mutationError, setMutationError] = useState<string | null>(null);
  const [estadoFilter, setEstadoFilter] = useState<number | undefined>(undefined);

  const cajasEndpoint = useMemo(() => {
    if (estadoFilter === undefined) return '/api/cashregister';
    return `/api/cashregister?estado=${estadoFilter}`;
  }, [estadoFilter]);

  const {
    data: cajas,
    isFetching: fetchLoading,
    error: fetchError,
    fetchEndpoint
  } = useGenericFetch<CajaWithUser>(cajasEndpoint, {
    initialFetch: false,
    transform: cashRegisterData
  });

  const loading = fetchLoading || pendingOperations > 0;
  const error = fetchError || mutationError;

  const handleError = useCallback((error: any, message: string) => {
    const errorMessage = error?.message || message;
    setMutationError(errorMessage);
    toast.error(errorMessage);
  }, []);

  const getCajas = useCallback(
    async (estado?: number) => {
      setMutationError(null);
      setEstadoFilter(estado);
      try {
        await fetchEndpoint(
          estado === undefined ? '/api/cashregister' : `/api/cashregister?estado=${estado}`
        );
      } catch (error) {
        handleError(error, 'Error al obtener cajas');
      }
    },
    [fetchEndpoint, handleError]
  );

  const getCajaById = useCallback(
    async (id: number) => {
      detailRequest.current?.abort();
      const controller = new AbortController();
      detailRequest.current = controller;
      setCajaActual(null);
      setPendingOperations(count => count + 1);
      setMutationError(null);
      try {
        const response = await fetch(`/api/cashregister?id=${id}`, { signal: controller.signal });
        const result = await response.json();
        if (controller.signal.aborted) return;

        if (!response.ok || !result.success) {
          throw new Error(result.message || 'Error al obtener caja');
        }

        setCajaActual(result.data);
      } catch (error) {
        if (controller.signal.aborted) return;
        handleError(error, 'Error al obtener caja');
      } finally {
        setPendingOperations(count => Math.max(0, count - 1));
      }
    },
    [handleError]
  );

  const getResumen = useCallback(async () => {
    setPendingOperations(count => count + 1);
    setMutationError(null);
    try {
      const response = await fetch('/api/cashregister?resumen=1');
      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || 'Error al obtener resumen');
      }

      setResumen(result.data);
    } catch (error) {
      handleError(error, 'Error al obtener resumen');
    } finally {
      setPendingOperations(count => Math.max(0, count - 1));
    }
  }, [handleError]);

  const checkCajaStatus = useCallback(async () => {
    try {
      setPendingOperations(count => count + 1);
      setMutationError(null);
      const response = await fetch('/api/cashregister/status');
      const data = await response.json();

      if (response.ok && data.success) {
        setHasOpenCaja(data.data.hasOpenCaja);
        setCajaInfo(data.data.cajaInfo);
      } else {
        setHasOpenCaja(null);
        setCajaInfo(null);
        setMutationError(data.message || 'Error al verificar estado de caja');
      }
    } catch (err) {
      setMutationError(err instanceof Error ? err.message : 'Error desconocido');
      setHasOpenCaja(null);
      setCajaInfo(null);
    } finally {
      setPendingOperations(count => Math.max(0, count - 1));
    }
  }, []);

  const createCaja = useCallback(
    async (data: CajaCreate): Promise<CajaWithUser | null> => {
      if (writeInProgress.current) return null;
      writeInProgress.current = true;
      setPendingOperations(count => count + 1);
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

        if (!response.ok || !result.success) {
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
        writeInProgress.current = false;
        setPendingOperations(count => Math.max(0, count - 1));
      }
    },
    [getCajas, checkCajaStatus, handleError]
  );

  const updateCaja = useCallback(
    async (id: number, data: CajaUpdate): Promise<CajaWithUser | null> => {
      if (writeInProgress.current) return null;
      writeInProgress.current = true;
      setPendingOperations(count => count + 1);
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

        if (!response.ok || !result.success) {
          throw new Error(result.message || 'Error al actualizar caja');
        }

        toast.success('Caja actualizada exitosamente');
        await getCajas();
        return result.data;
      } catch (error) {
        handleError(error, 'Error al actualizar caja');
        return null;
      } finally {
        writeInProgress.current = false;
        setPendingOperations(count => Math.max(0, count - 1));
      }
    },
    [getCajas, handleError]
  );

  const cerrarCaja = useCallback(
    async (data: CajaCierre & { motivo?: string }): Promise<CierreCajaResultado | null> => {
      if (writeInProgress.current) return null;
      writeInProgress.current = true;
      setPendingOperations(count => count + 1);
      setMutationError(null);
      try {
        // Nunca cierra directo: el endpoint decide. El administrador cierra en el
        // acto; cualquier otro rol genera la solicitud y avisa por WhatsApp.
        const response = await fetch('/api/cashregister/cierre', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ id_caja: data.id_caja, motivo: data.motivo })
        });

        const result = await response.json().catch(() => ({}));

        // 202: la solicitud quedó creada pero el WhatsApp no salió. Sigue pendiente
        // de autorización igual, así que no se trata como error.
        if (
          !response.ok ||
          (result.success === false &&
            !(response.status === 202 && result.data?.estado === 'pendiente')) ||
          !['pendiente', 'cerrada'].includes(result.data?.estado)
        ) {
          throw new Error(result.message || 'Error al cerrar caja');
        }

        const payload = result.data ?? {};
        const pendiente = payload.estado === 'pendiente';

        toast.success(
          result.message ||
            (pendiente
              ? 'Solicitud de cierre enviada al administrador'
              : 'Caja cerrada exitosamente')
        );
        await getCajas();
        await checkCajaStatus();

        if (!pendiente) {
          window.dispatchEvent(new CustomEvent('cajaClosed', { detail: payload.caja }));
        }

        return {
          estado: pendiente ? 'pendiente' : 'cerrada',
          caja: payload.caja ?? null,
          mensaje: result.message || '',
          saldoClientesDescontado: Number(payload.saldo_clientes_descontado || 0),
          saldoClientesPorDevolver: Number(payload.saldo_clientes_por_devolver || 0),
          montoCierre: Number(payload.monto_cierre_calculado ?? payload.caja?.monto_cierre ?? 0)
        };
      } catch (error) {
        handleError(error, 'Error al cerrar caja');
        return null;
      } finally {
        writeInProgress.current = false;
        setPendingOperations(count => Math.max(0, count - 1));
      }
    },
    [getCajas, checkCajaStatus, handleError]
  );

  const retirarDinero = useCallback(
    async (data: CajaRetiro): Promise<boolean> => {
      if (writeInProgress.current) return false;
      writeInProgress.current = true;
      setPendingOperations(count => count + 1);
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

        if (!response.ok || !result.success) {
          throw new Error(result.message || 'Error al retirar dinero');
        }

        toast.success('Retiro realizado exitosamente');
        await Promise.all([getCajas(), getResumen()]);
        return true;
      } catch (error) {
        handleError(error, 'Error al retirar dinero');
        return false;
      } finally {
        writeInProgress.current = false;
        setPendingOperations(count => Math.max(0, count - 1));
      }
    },
    [getCajas, getResumen, handleError]
  );

  const deleteCaja = useCallback(
    async (id: number): Promise<boolean> => {
      if (writeInProgress.current) return false;
      writeInProgress.current = true;
      setPendingOperations(count => count + 1);
      setMutationError(null);
      try {
        const response = await fetch(`/api/cashregister?id=${id}`, {
          method: 'DELETE'
        });

        const result = await response.json();

        if (!response.ok || !result.success) {
          throw new Error(result.message || 'Error al eliminar caja');
        }

        toast.success('Caja eliminada exitosamente');
        await getCajas();
        return true;
      } catch (error) {
        handleError(error, 'Error al eliminar caja');
        return false;
      } finally {
        writeInProgress.current = false;
        setPendingOperations(count => Math.max(0, count - 1));
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
