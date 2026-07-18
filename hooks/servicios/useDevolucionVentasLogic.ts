 
import { useState } from 'react';
import { VentaWithDetails } from '@/types/venta';
import { showSuccessToast, showErrorToast } from '@/lib/utils/toastUtils';

export const useDevolucionVentasLogic = () => {
  const [selectedVenta, setSelectedVenta] = useState<VentaWithDetails | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isDevolucionModalOpen, setIsDevolucionModalOpen] = useState(false);
  const [motivoDevolucion, setMotivoDevolucion] = useState('');

  const handleVerDetalles = (venta: VentaWithDetails) => {
    setSelectedVenta(venta);
    setIsDetailModalOpen(true);
  };

  const handleDevolucion = (venta: VentaWithDetails) => {
    setSelectedVenta(venta);
    setIsDevolucionModalOpen(true);
  };

  const confirmarDevolucion = async (getVentas: () => Promise<void>) => {
    if (!selectedVenta || !motivoDevolucion.trim()) {
      showErrorToast('Por favor ingrese un motivo para la devolución');
      return;
    }

    const total = Number(selectedVenta.total || 0);
    try {
      const response = await fetch('/api/ventas/anulacion', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ventaId: selectedVenta.id,
          motivo: motivoDevolucion,
          monto: total,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al procesar la devolución');
      }

      showSuccessToast('Solicitud de devolución enviada correctamente.');
      setIsDevolucionModalOpen(false);
      setMotivoDevolucion('');
      setSelectedVenta(null);

      await getVentas();
    } catch (error) {
      showErrorToast('Error al procesar la devolución de la venta');
    }
  };

  const resetDevolucionModal = () => {
    setMotivoDevolucion('');
    setSelectedVenta(null);
    setIsDevolucionModalOpen(false);
  };

  return {
    selectedVenta,
    isDetailModalOpen,
    isDevolucionModalOpen,
    motivoDevolucion,
    setMotivoDevolucion,
    setIsDetailModalOpen,
    setIsDevolucionModalOpen,
    handleVerDetalles,
    handleDevolucion,
    confirmarDevolucion,
    resetDevolucionModal,
  };
}; 