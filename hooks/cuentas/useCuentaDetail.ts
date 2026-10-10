'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { toast } from 'sonner';
import logger from '@/lib/utils/logger';

type EstadoBadge = {
  label: string;
  variant: 'default' | 'secondary' | 'destructive' | 'success' | 'outline';
};

export function useCuentaDetail(cuentaId: string | null, open: boolean) {
  const [cuenta, setCuenta] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [hasFetched, setHasFetched] = useState(false);
  const request = useRef<AbortController | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    request.current = controller;
    setCuenta(null);
    setHasFetched(false);
    if (!open || !cuentaId) {
      setCuenta(null);
      setLoading(false);
      setHasFetched(false);
      return () => controller.abort();
    }

    const fetchCuentaDetails = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/cuentas/${encodeURIComponent(cuentaId)}`, {
          signal: controller.signal
        });
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }
        const data = await res.json();
        if (controller.signal.aborted) return;
        if (data?.success === false)
          throw new Error(data.message || 'Error al cargar datos de la cuenta');
        const cuentaData = data?.success === true ? data.data : data;
        setCuenta(cuentaData ?? null);
      } catch (error) {
        if (controller.signal.aborted) return;
        logger.captureException(error, { context: 'CuentaDetail:fetchCuentaDetails' });
        toast.error('Error al cargar datos de la cuenta');
        setCuenta(null);
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
          setHasFetched(true);
        }
      }
    };

    fetchCuentaDetails();
    return () => controller.abort();
  }, [cuentaId, open]);

  const getEstadoBadge = (estado: number | string): EstadoBadge => {
    const estadoStr = String(estado).toLowerCase();
    return (
      (
        {
          0: { label: 'Cobrada', variant: 'success' },
          1: { label: 'Por Cobrar', variant: 'destructive' },
          2: { label: 'Solicitud Anul.', variant: 'outline' },
          3: { label: 'Anulada', variant: 'secondary' },
          4: { label: 'Anul. Parcial', variant: 'outline' }
        } as Record<string, EstadoBadge>
      )[estadoStr] || { label: 'Desconocido', variant: 'outline' as const }
    );
  };

  const handleClose = useCallback(() => {
    request.current?.abort();
    setCuenta(null);
    setLoading(false);
    setHasFetched(false);
  }, []);

  return {
    cuenta,
    loading,
    hasFetched,

    handleClose,
    getEstadoBadge
  };
}
