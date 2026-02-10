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
    transform: (data) => {
      console.log('[useCashRegisterStatus] 📦 Datos recibidos:', data);
      const result = data.success ? data.data : { hasOpenCaja: false, cajaInfo: null };
      console.log('[useCashRegisterStatus] ✅ Resultado transformado:', result);
      return result;
    },
  });

  // CORRECCIÓN: data ya es el objeto transformado, no un array
  const statusData = data || { hasOpenCaja: false, cajaInfo: null };

  console.log('[useCashRegisterStatus] 🔍 Estado final:', {
    hasOpenCaja: statusData.hasOpenCaja,
    cajaInfo: statusData.cajaInfo,
    loading,
    error,
    dataRaw: data
  });

  return {
    hasOpenCaja: statusData.hasOpenCaja,
    cajaInfo: statusData.cajaInfo,
    loading,
    error,
    refresh
  };
}
