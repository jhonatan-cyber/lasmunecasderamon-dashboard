import { useState } from 'react';
import { toast } from 'sonner';

type EstadoBadge = {
  label: string;
  variant: 'default' | 'secondary' | 'destructive' | 'success' | 'outline';
};

export function useCuentaTableLogic() {
  const [selectedCuentaId, setSelectedCuentaId] = useState<string | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [agregarProductosOpen, setAgregarProductosOpen] = useState(false);
  const [cobrarCuentaOpen, setCobrarCuentaOpen] = useState(false);
  const [cuentaSeleccionada, setCuentaSeleccionada] = useState<any>(null);

  const getEstadoInfo = (estado: number | string): EstadoBadge => {
    const estadoStr = String(estado).toLowerCase();
    switch (estadoStr) {
      case '0':
        return { label: 'Cobrada', variant: 'success' };
      case '1':
        return { label: 'Por Cobrar', variant: 'destructive' };
      case '2':
        return { label: 'Solicitud Anul.', variant: 'outline' };
      case '3':
        return { label: 'Anulada', variant: 'secondary' };
      case '4':
        return { label: 'Anul. Parcial', variant: 'outline' };
      default:
        return { label: 'Desconocido', variant: 'secondary' };
    }
  };

  const handleVerDetalles = (cuenta: any) => {
    setCuentaSeleccionada(cuenta);
    setSelectedCuentaId(cuenta.id_cuenta || cuenta.id);
    setDetailModalOpen(true);
  };

  const handleAgregarProductos = (cuenta: any) => {
    setCuentaSeleccionada(cuenta);
    setAgregarProductosOpen(true);
  };

  const handleCobrarCuenta = (cuenta: any) => {
    setCuentaSeleccionada(cuenta);
    setCobrarCuentaOpen(true);
  };

  const handleProductosAgregados = () => {
    setAgregarProductosOpen(false);
    toast.success('Productos agregados correctamente');
  };

  const handleCuentaCobrada = () => {
    setCobrarCuentaOpen(false);
    setDetailModalOpen(false);
    toast.success('Cuenta cobrada correctamente');
  };

  const handleCloseDetail = () => {
    setDetailModalOpen(false);
    setCuentaSeleccionada(null);
    setSelectedCuentaId(null);
  };

  return {
    selectedCuentaId,
    setSelectedCuentaId,
    detailModalOpen,
    setDetailModalOpen,
    agregarProductosOpen,
    setAgregarProductosOpen,
    cobrarCuentaOpen,
    setCobrarCuentaOpen,
    cuentaSeleccionada,
    setCuentaSeleccionada,

    handleVerDetalles,
    handleAgregarProductos,
    handleCobrarCuenta,
    handleProductosAgregados,
    handleCuentaCobrada,
    handleCloseDetail,

    getEstadoInfo,
    getEstadoBadge: getEstadoInfo
  };
}
