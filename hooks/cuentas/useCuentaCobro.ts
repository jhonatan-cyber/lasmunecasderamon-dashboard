'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from 'sonner';
import { useGenericFetch } from '@/hooks/shared/useGenericFetch';
import { queryKeys } from '@/lib/api/queryClient';
import logger from '@/lib/utils/logger';
import { isChampagneProduct } from '@/components/orders/productModalRules';

export function useCuentaCobro() {
  const cobroEnCurso = useRef(false);
  const clavesCobro = useRef(new Map<string, string>());
  const { data: rooms } = useGenericFetch<any>('/api/rooms', {
    queryKey: queryKeys.rooms.all,
    transform: result => (result.success ? result.data : [])
  });
  const [searchRoom, setSearchRoom] = useState('');
  const [isCobrando, setIsCobrando] = useState(false);
  const [metodoPago, setMetodoPago] = useState('');
  const [propina, setPropina] = useState<number | null>(null);
  const [propinaActiva, setPropinaActiva] = useState(false);
  const [habitacionId, setHabitacionId] = useState<string | null>(null);
  const [showError, setShowError] = useState(false);

  // Estado de caja para el cobro (paridad con las apps: el cobro registra una
  // venta y escribe en caja). `null` = desconocido => no bloquea.
  const [hasOpenCaja, setHasOpenCaja] = useState<boolean | null>(null);

  const refreshCajaStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/cashregister/status');
      const data = await res.json();
      if (data.success && typeof data.data?.hasOpenCaja === 'boolean') {
        setHasOpenCaja(data.data.hasOpenCaja);
      }
    } catch (error) {
      logger.captureException(error, { context: 'CuentaCobro:refreshCajaStatus' });
      // Silencioso: estado desconocido no bloquea.
    }
  }, []);

  useEffect(() => {
    refreshCajaStatus();
  }, [refreshCajaStatus]);

  const habitacionesActivas = rooms.filter(r => r.status === 1 || r.estado === 1);

  const habitacionesFiltradas = searchRoom.trim()
    ? habitacionesActivas.filter(
        r =>
          (r.nombre || r.name || '').toLowerCase().includes(searchRoom.toLowerCase()) ||
          (r.numero || '').toLowerCase().includes(searchRoom.toLowerCase())
      )
    : habitacionesActivas;

  const resetStates = () => {
    setSearchRoom('');
    setIsCobrando(false);
    setMetodoPago('');
    setPropina(null);
    setPropinaActiva(false);
    setHabitacionId(null);
    setShowError(false);
  };

  const handleCobrarCuenta = async (
    cuenta: any,
    propinaMonto: number | null,
    metodoPagoSeleccionado: string,
    onSuccess: () => void
  ) => {
    const cuentaId = cuenta?.id_cuenta ?? cuenta?.id ?? null;
    const montoFinal = Number(cuenta?.total ?? cuenta?.sub_total ?? 0);
    const propinaFinal = Number(propinaMonto ?? 0);

    if (!cuenta || !cuentaId || !metodoPagoSeleccionado) {
      setShowError(true);
      toast.error('Método de pago requerido');
      return;
    }

    // Guard de caja cerrada (paridad con las apps y nueva venta).
    if (hasOpenCaja === false) {
      toast.error('No hay caja abierta. No se pueden realizar ventas sin una caja abierta.');
      return;
    }

    if (cobroEnCurso.current) return;
    cobroEnCurso.current = true;
    const key =
      clavesCobro.current.get(String(cuentaId)) ??
      (globalThis.crypto?.randomUUID?.() ||
        `cobro-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    clavesCobro.current.set(String(cuentaId), key);
    setIsCobrando(true);

    try {
      const cobroRes = await fetch(`/api/cuentas/${cuentaId}/cobrar-con-venta`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-idempotency-key': key },
        body: JSON.stringify({
          metodoPago: metodoPagoSeleccionado,
          metodo_pago: metodoPagoSeleccionado,
          tipoPago: metodoPagoSeleccionado,
          montoFinal,
          total_cobrado: montoFinal,
          propinaFinal,
          propina: propinaFinal
        })
      });

      if (!cobroRes.ok) {
        if (cobroRes.status >= 400 && cobroRes.status < 500 && cobroRes.status !== 409) {
          clavesCobro.current.delete(String(cuentaId));
        }
        let errorMessage = 'Error al cobrar la cuenta';
        try {
          const rawError = await cobroRes.text();
          const errorData = rawError ? JSON.parse(rawError) : null;
          errorMessage =
            errorData?.message ||
            errorData?.error?.message ||
            errorData?.error?.details?.[0]?.message ||
            errorMessage;
        } catch {}
        throw new Error(errorMessage);
      }

      await cobroRes.json();

      clavesCobro.current.delete(String(cuentaId));
      toast.success('Cuenta cobrada exitosamente');
      resetStates();
      onSuccess();
    } catch (error) {
      logger.captureException(error, { context: 'CuentaCobro:handleCobrarCuenta' });
      toast.error(error instanceof Error ? error.message : 'Error al cobrar la cuenta');
      setShowError(true);
    } finally {
      cobroEnCurso.current = false;
      setIsCobrando(false);
    }
  };

  return {
    rooms,
    searchRoom,
    isCobrando,
    metodoPago,
    propina,
    propinaActiva,
    habitacionId,
    showError,
    hasOpenCaja,
    refreshCajaStatus,

    setSearchRoom,
    setMetodoPago,
    setPropina,
    setPropinaActiva,
    setHabitacionId,
    setShowError,

    habitacionesActivas,
    habitacionesFiltradas,

    handleCobrarCuenta,
    resetStates,
    isChampagneProduct
  };
}
