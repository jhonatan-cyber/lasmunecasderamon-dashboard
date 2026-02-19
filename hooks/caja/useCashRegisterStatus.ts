'use client';

import { useState, useEffect, useCallback } from 'react';

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
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCajaStatus = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('/api/cashregister/status', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        cache: 'no-store'
      });

      if (!response.ok) {
        throw new Error(`Error al obtener estado de caja: ${response.statusText}`);
      }

      const result = await response.json();

      const statusData = result.success ? result.data : { hasOpenCaja: false, cajaInfo: null };

      setData(statusData);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido';

      setError(errorMessage);
      setData({ hasOpenCaja: false, cajaInfo: null });
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch inicial
  useEffect(() => {
    fetchCajaStatus();
  }, [fetchCajaStatus]);

  // Polling cada 5 segundos para detectar cuando se abre/cierra una caja
  useEffect(() => {
    const interval = setInterval(() => {
      fetchCajaStatus();
    }, 5000);

    return () => clearInterval(interval);
  }, [fetchCajaStatus]);

  // Listener para eventos de apertura/cierre de caja
  useEffect(() => {
    const handleCajaOpened = () => {
      fetchCajaStatus();
    };

    const handleCajaClosed = () => {
      fetchCajaStatus();
    };

    window.addEventListener('cajaOpened', handleCajaOpened);
    window.addEventListener('cajaClosed', handleCajaClosed);

    return () => {
      window.removeEventListener('cajaOpened', handleCajaOpened);
      window.removeEventListener('cajaClosed', handleCajaClosed);
    };
  }, [fetchCajaStatus]);

  const statusData = data || { hasOpenCaja: false, cajaInfo: null };

  return {
    hasOpenCaja: statusData.hasOpenCaja,
    cajaInfo: statusData.cajaInfo,
    loading,
    error,
    refresh: fetchCajaStatus
  };
}
