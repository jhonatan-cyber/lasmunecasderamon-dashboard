'use client';

import { useGenericFetch } from '../shared/useGenericFetch';

interface CashRegisterStatus {
  hasOpenCaja: boolean | null;
  cajaInfo: {
    id_caja: number;
    usuario_id_apertura: number;
    fecha_apertura: string;
  } | null;
  loading: boolean;
  error: string | null;
}

export function useCashRegisterStatus() {
  const {
    data,
    isLoading: loading,
    error,
    refetch: refresh,
  } = useGenericFetch<any>('/api/cashregister?status=check', {
    initialFetch: true,
    transform: (data) => (data.success ? data.data : { hasOpenCaja: false, cajaInfo: null }),
  });

  const statusData = data?.[0] || { hasOpenCaja: false, cajaInfo: null };

  return {
    hasOpenCaja: statusData.hasOpenCaja,
    cajaInfo: statusData.cajaInfo,
    loading,
    error,
    refresh
  };
}
