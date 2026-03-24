/* eslint-disable */
import { useGenericFetch } from '@/hooks/shared/useGenericFetch';
import { CashRegisterStatusSchema } from '@/lib/schemas';
import { useCallback, useEffect } from 'react';

interface CashRegisterStatus {
  hasOpenCaja: boolean | null;
  cajaInfo: {
    id_caja: number;
    usuario_id_apertura: number;
    fecha_apertura: string;
  } | null;
}

export function useCashRegisterStatus() {
  const { 
    data, 
    isLoading, 
    error, 
    refetch 
  } = useGenericFetch<CashRegisterStatus>('/api/cashregister/status', {
    schema: CashRegisterStatusSchema,
    transform: (res) => res.success ? res.data : { hasOpenCaja: false, cajaInfo: null }
  });

  // Listener para eventos de apertura/cierre de caja
  useEffect(() => {
    const handleCajaChanged = () => refetch();
    
    window.addEventListener('cajaOpened', handleCajaChanged);
    window.addEventListener('cajaClosed', handleCajaChanged);
    window.addEventListener('ventaRegistrada', handleCajaChanged);

    return () => {
      window.removeEventListener('cajaOpened', handleCajaChanged);
      window.removeEventListener('cajaClosed', handleCajaChanged);
      window.removeEventListener('ventaRegistrada', handleCajaChanged);
    };
  }, [refetch]);

  const statusData = (Array.isArray(data) ? data[0] : data) as CashRegisterStatus || { hasOpenCaja: false, cajaInfo: null };

  return {
    hasOpenCaja: statusData.hasOpenCaja,
    cajaInfo: statusData.cajaInfo,
    loading: isLoading,
    error,
    refresh: refetch
  };
}
