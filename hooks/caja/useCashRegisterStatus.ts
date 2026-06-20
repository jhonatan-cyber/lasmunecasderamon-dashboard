'use client';

import { useGenericFetch } from '@/hooks/shared';
import { CashRegisterStatusSchema } from '@/lib/business/schemas';
import { useCallback, useEffect } from 'react';

interface CashRegisterStatus {
  hasOpenCaja: boolean | null;
  cajaInfo: {
    id_caja: number;
    usuario_id_apertura: number;
    fecha_apertura: string;
    efectivo_en_caja: number;
  } | null;
}

export function useCashRegisterStatus() {
  const { data, isLoading, error, refetch } = useGenericFetch<CashRegisterStatus>(
    '/api/cashregister/status',
    {
      schema: CashRegisterStatusSchema,
      transform: res => (res.success ? res.data : { hasOpenCaja: false, cajaInfo: null })
    }
  );

  useEffect(() => {
    const handleCajaChanged = () => refetch();

    window.addEventListener('cajaOpened', handleCajaChanged);
    window.addEventListener('cajaClosed', handleCajaChanged);
    window.addEventListener('ventaRegistrada', handleCajaChanged);
    window.addEventListener('pagoSueldo', handleCajaChanged);
    window.addEventListener('anticipoOtorgado', handleCajaChanged);

    return () => {
      window.removeEventListener('cajaOpened', handleCajaChanged);
      window.removeEventListener('cajaClosed', handleCajaChanged);
      window.removeEventListener('ventaRegistrada', handleCajaChanged);
      window.removeEventListener('pagoSueldo', handleCajaChanged);
      window.removeEventListener('anticipoOtorgado', handleCajaChanged);
    };
  }, [refetch]);

  const statusData = ((Array.isArray(data) ? data[0] : data) as CashRegisterStatus) || {
    hasOpenCaja: false,
    cajaInfo: null
  };

  return {
    hasOpenCaja: statusData.hasOpenCaja,
    cajaInfo: statusData.cajaInfo,
    efectivoEnCaja: statusData.cajaInfo?.efectivo_en_caja || 0,
    loading: isLoading,
    error,
    refresh: refetch
  };
}
