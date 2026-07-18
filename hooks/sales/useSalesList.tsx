'use client';

import { useState, useCallback } from 'react';
import { useUserPermissions } from '@/hooks/auth/useUserPermissions';
import { VentaWithDetails } from '@/types/venta';

interface AnulacionState {
  open: boolean;
  ventaId: string | number | null;
  ventaInfo: any;
}

interface UseSalesListParams {
  onAnularVenta: (ventaId: string | number, motivo: string, monto: number) => void;
}

export function useSalesList({ onAnularVenta }: UseSalesListParams) {
  const [anulacionModal, setAnulacionModal] = useState<AnulacionState>({
    open: false,
    ventaId: null,
    ventaInfo: null,
  });

  const { hasPermission } = useUserPermissions();
  const canViewDetails = hasPermission('sales', 'view_details');
  const canAnular = hasPermission('sales', 'cancel');
  const hasAnyAction = canViewDetails || canAnular;

  const handleAnularClick = useCallback((venta: VentaWithDetails) => {
    setAnulacionModal({
      open: true,
      ventaId: venta.id,
      ventaInfo: {
        codigo: venta.codigo,
        total: venta.total,
        cliente_nombre: venta.cliente_nombre,
      },
    });
  }, []);

  const handleConfirmarAnulacion = useCallback(
    async ({ motivo, monto }: { motivo: string; monto: number }) => {
      if (anulacionModal.ventaId) {
        await onAnularVenta(anulacionModal.ventaId, motivo, monto);
        setAnulacionModal({ open: false, ventaId: null, ventaInfo: null });
      }
    },
    [anulacionModal.ventaId, onAnularVenta]
  );

  return {
    anulacionModal,
    setAnulacionModal,
    canViewDetails,
    canAnular,
    hasAnyAction,
    handleAnularClick,
    handleConfirmarAnulacion,
  };
}
