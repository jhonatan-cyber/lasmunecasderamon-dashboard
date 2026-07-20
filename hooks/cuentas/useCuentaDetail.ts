'use client';

import { useState, useEffect } from 'react';
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

  useEffect(() => {
    if (!open || !cuentaId) {
      setCuenta(null);
      setLoading(false);
      setHasFetched(false);
      return;
    }

    const fetchCuentaDetails = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/cuentas/${cuentaId}`);
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }
        const data = await res.json();
        const cuentaData = data?.success === true ? data.data : data;
        setCuenta(cuentaData ?? null);
      } catch (error) {
        logger.captureException(error, { context: 'CuentaDetail:fetchCuentaDetails' });
        toast.error('Error al cargar datos de la cuenta');
        setCuenta(null);
      } finally {
        setLoading(false);
        setHasFetched(true);
      }
    };

    fetchCuentaDetails();
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

  const handleClose = () => {
    setCuenta(null);
    setHasFetched(false);
  };

  return {
    cuenta,
    loading,
    hasFetched,

    handleClose,
    getEstadoBadge
  };
}
