'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { CuentaWithDetails } from '@/types/cuenta';
import { useTimer } from '@/contexts/TimerContext';

const formatMontoInput = (value: string) => {
  const digits = value.replace(/\D/g, '');
  if (!digits) return '';
  return new Intl.NumberFormat('es-CL').format(Number(digits));
};

const parseMontoInput = (value: string) => {
  const digits = value.replace(/\D/g, '');
  return digits ? Number(digits) : 0;
};

interface UseCuentaAnulacionProps {
  onRefresh?: () => void;
  onOrderStatusChange?: () => void;
  showConfirm: (opts: {
    title: string;
    message: string;
    confirmText: string;
    type: 'question' | 'warning' | 'info' | 'success';
  }) => Promise<boolean>;
}

export function useCuentaAnulacion({
  onRefresh,
  onOrderStatusChange,
  showConfirm
}: UseCuentaAnulacionProps) {
  const { getTimerByServicioId, stopTimerByServicioId } = useTimer();

  const [anulacionDialogOpen, setAnulacionDialogOpen] = useState(false);
  const [cuentaParaAnular, setCuentaParaAnular] = useState<CuentaWithDetails | null>(null);
  const [motivoAnulacion, setMotivoAnulacion] = useState('');
  const [montoAnulacion, setMontoAnulacion] = useState('');
  const [anulandoCuenta, setAnulandoCuenta] = useState(false);

  const handleFinalizarTemporizador = async (cuenta: CuentaWithDetails) => {
    const cuentaId = String(cuenta.id_cuenta ?? (cuenta as any).id ?? '');
    const activeTimer = cuentaId ? getTimerByServicioId(cuentaId) : null;
    if (!activeTimer) {
      toast.error('La cuenta no tiene un temporizador activo');
      return;
    }

    const anfitrionas =
      cuenta.usuarios
        ?.map((u: any) => u.usuario_nombre)
        .filter(Boolean)
        .join(', ') || 'Sin anfitrionas';
    const cliente = cuenta.cliente_nombre || `Cliente ${cuenta.cliente_id}`;
    const confirmed = await showConfirm({
      title: 'Finalizar temporizador',
      message: `¿Finalizar el temporizador de la cuenta ${cuenta.codigo}?\n\nEl tiempo dejará de correr y la cuenta quedará lista para cobrar.\n\nCliente: ${cliente}\nAnfitriona(s): ${anfitrionas}`,
      confirmText: 'Sí, finalizar',
      type: 'question'
    });

    if (!confirmed) return;

    try {
      await stopTimerByServicioId(cuentaId);
      toast.success('Temporizador finalizado');
      onRefresh?.();
      onOrderStatusChange?.();
    } catch {
      toast.error('No se pudo finalizar el temporizador');
    }
  };

  const handleSolicitarAnulacion = async (cuenta: CuentaWithDetails) => {
    const cuentaId = String(cuenta.id_cuenta ?? (cuenta as any).id ?? '');
    const activeTimer = cuentaId ? getTimerByServicioId(cuentaId) : null;
    if (activeTimer?.isActive) {
      toast.error('Finaliza el temporizador antes de solicitar la anulacion');
      return;
    }

    setCuentaParaAnular(cuenta);
    setMotivoAnulacion('');
    setMontoAnulacion(formatMontoInput(String(Number(cuenta.total || 0))));
    setAnulacionDialogOpen(true);
  };

  const handleConfirmarSolicitudAnulacion = async () => {
    const cuenta = cuentaParaAnular;
    if (!cuenta) return;
    const cuentaId = String(cuenta.id_cuenta ?? (cuenta as any).id ?? '');
    const motivo = motivoAnulacion.trim();
    const monto = parseMontoInput(montoAnulacion);
    if (!motivo) {
      toast.error('Debes ingresar el motivo de la anulacion');
      return;
    }
    if (!Number.isFinite(monto) || monto <= 0) {
      toast.error('Debes ingresar un monto mayor a 0');
      return;
    }
    if (monto > Number(cuenta.total || 0)) {
      toast.error('El monto no puede ser mayor al total de la cuenta');
      return;
    }

    setAnulandoCuenta(true);
    try {
      const response = await fetch('/api/cuentas/anulacion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cuentaId,
          clienteNombre: cuenta.cliente_nombre || '',
          motivo,
          monto
        })
      });

      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.success) {
        throw new Error(result.message || 'No se pudo solicitar la anulacion');
      }

      toast.success('La anulacion fue solicitada por WhatsApp');
      setAnulacionDialogOpen(false);
      setCuentaParaAnular(null);
      setMotivoAnulacion('');
      setMontoAnulacion('');
      onRefresh?.();
      onOrderStatusChange?.();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo solicitar la anulacion');
    } finally {
      setAnulandoCuenta(false);
    }
  };

  const closeAnulacionDialog = () => {
    setAnulacionDialogOpen(false);
    setCuentaParaAnular(null);
    setMotivoAnulacion('');
    setMontoAnulacion('');
  };

  return {
    // Anulación state
    anulacionDialogOpen,
    setAnulacionDialogOpen,
    cuentaParaAnular,
    motivoAnulacion,
    setMotivoAnulacion,
    montoAnulacion,
    setMontoAnulacion,
    anulandoCuenta,

    // Anulación actions
    handleSolicitarAnulacion,
    handleConfirmarSolicitudAnulacion,
    closeAnulacionDialog,

    // Timer actions
    handleFinalizarTemporizador,
    getTimerByServicioId,

    // Utils
    formatMontoInput,
    parseMontoInput
  };
}
