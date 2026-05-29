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

  // Fetch de detalles de la cuenta
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

  // Mapping de estado a badge
  const getEstadoBadge = (estado: number | string): EstadoBadge => {
    const estadoStr = String(estado).toLowerCase();
    return (
      (
        {
          0: { label: 'Cobrada', variant: 'success' },
          1: { label: 'Activa', variant: 'default' },
          2: { label: 'Solicitud anul.', variant: 'outline' },
          3: { label: 'Anulada', variant: 'destructive' },
          4: { label: 'Saldo pendiente', variant: 'secondary' }
        } as Record<string, EstadoBadge>
      )[estadoStr] || { label: 'Desconocido', variant: 'outline' as const }
    );
  };

  const handleClose = () => {
    setCuenta(null);
    setHasFetched(false);
  };

  return {
    // States
    cuenta,
    loading,
    hasFetched,

    // Methods
    handleClose,
    getEstadoBadge
  };
}
