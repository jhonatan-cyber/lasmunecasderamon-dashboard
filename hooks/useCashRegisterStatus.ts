'use client';

import { useState, useEffect } from 'react';

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
  const [status, setStatus] = useState<CashRegisterStatus>({
    hasOpenCaja: null,
    cajaInfo: null,
    loading: true,
    error: null
  });

  const checkCashRegisterStatus = async () => {
    try {
      setStatus(prev => ({ ...prev, loading: true, error: null }));

      const response = await fetch('/api/cashregister?status=check');
      const data = await response.json();

      if (data.success) {
        setStatus({
          hasOpenCaja: data.data.hasOpenCaja,
          cajaInfo: data.data.cajaInfo,
          loading: false,
          error: null
        });
      } else {
        setStatus({
          hasOpenCaja: false,
          cajaInfo: null,
          loading: false,
          error: data.message || 'Error al verificar estado de caja'
        });
      }
    } catch (error) {
      setStatus({
        hasOpenCaja: false,
        cajaInfo: null,
        loading: false,
        error: 'Error de conexión al verificar estado de caja'
      });
    }
  };

  useEffect(() => {
    checkCashRegisterStatus();
  }, []);

  return {
    ...status,
    refresh: checkCashRegisterStatus
  };
}
