'use client';

import { useRef, useState } from 'react';
import { VentaWithDetails } from '@/types/venta';
import { showSuccessToast, showErrorToast } from '@/lib/utils/toastUtils';

export const useDevolucionVentasLogic = () => {
  const [selectedVenta, setSelectedVenta] = useState<VentaWithDetails | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isDevolucionModalOpen, setIsDevolucionModalOpen] = useState(false);
  const [motivoDevolucion, setMotivoDevolucion] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submitting = useRef(false);

  const handleVerDetalles = (venta: VentaWithDetails) => {
    setSelectedVenta(venta);
    setIsDetailModalOpen(true);
  };

  const handleDevolucion = (venta: VentaWithDetails) => {
    setSelectedVenta(venta);
    setIsDevolucionModalOpen(true);
  };

  const confirmarDevolucion = async (getVentas: () => Promise<void>) => {
    if (submitting.current) return;
    if (!selectedVenta || !motivoDevolucion.trim()) {
      showErrorToast('Por favor ingrese un motivo para la devolución');
      return;
    }

    const total = Number(selectedVenta.total || 0);
    if (!Number.isFinite(total) || total <= 0) {
      showErrorToast('El monto de la venta debe ser mayor a cero');
      return;
    }
    submitting.current = true;
    setIsSubmitting(true);
    try {
      const response = await fetch('/api/ventas/anulacion', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ventaId: selectedVenta.id,
          motivo: motivoDevolucion.trim(),
          monto: total
        })
      });

      const data = await response.json().catch(() => null);
      if (!response.ok || !data?.success) {
        throw new Error(data?.error || data?.message || 'Error al procesar la devolución');
      }

      showSuccessToast('Solicitud de devolución enviada correctamente.');
      setIsDevolucionModalOpen(false);
      setMotivoDevolucion('');
      setSelectedVenta(null);

      try {
        await getVentas();
      } catch {
        showErrorToast('La solicitud fue enviada, pero no se pudo actualizar la lista de ventas');
      }
    } catch (error) {
      showErrorToast(
        error instanceof Error ? error.message : 'Error al procesar la devolución de la venta'
      );
    } finally {
      submitting.current = false;
      setIsSubmitting(false);
    }
  };

  const resetDevolucionModal = () => {
    setMotivoDevolucion('');
    setSelectedVenta(null);
    setIsDevolucionModalOpen(false);
  };

  return {
    selectedVenta,
    isSubmitting,
    isDetailModalOpen,
    isDevolucionModalOpen,
    motivoDevolucion,
    setMotivoDevolucion,
    setIsDetailModalOpen,
    setIsDevolucionModalOpen,
    handleVerDetalles,
    handleDevolucion,
    confirmarDevolucion,
    resetDevolucionModal
  };
};
