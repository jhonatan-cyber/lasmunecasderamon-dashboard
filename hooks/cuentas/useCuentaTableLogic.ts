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

  // Mapping de estado a badge - retorna datos para que el componente decida cómo renderizar
  const getEstadoInfo = (estado: number | string): EstadoBadge => {
    const estadoStr = String(estado).toLowerCase();
    switch (estadoStr) {
      case '0':
        return { label: 'Cobrada', variant: 'success' };
      case '1':
        return { label: 'Por Cobrar', variant: 'destructive' };
      case '2':
        return { label: 'Pagada', variant: 'default' };
      default:
        return { label: 'Desconocido', variant: 'secondary' };
    }
  };

  // Ver detalles de una cuenta
  const handleVerDetalles = (cuenta: any) => {
    setCuentaSeleccionada(cuenta);
    setSelectedCuentaId(cuenta.id_cuenta || cuenta.id);
    setDetailModalOpen(true);
  };

  // Abrir modal para agregar productos
  const handleAgregarProductos = (cuenta: any) => {
    setCuentaSeleccionada(cuenta);
    setAgregarProductosOpen(true);
  };

  // Abrir modal para cobrar
  const handleCobrarCuenta = (cuenta: any) => {
    setCuentaSeleccionada(cuenta);
    setCobrarCuentaOpen(true);
  };

  // Callback cuando se agregan productos
  const handleProductosAgregados = () => {
    setAgregarProductosOpen(false);
    toast.success('Productos agregados correctamente');
  };

  // Callback cuando se cobra
  const handleCuentaCobrada = () => {
    setCobrarCuentaOpen(false);
    setDetailModalOpen(false);
    toast.success('Cuenta cobrada correctamente');
  };

  // Cerrar detalles
  const handleCloseDetail = () => {
    setDetailModalOpen(false);
    setCuentaSeleccionada(null);
    setSelectedCuentaId(null);
  };

  return {
    // States
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

    // Handlers
    handleVerDetalles,
    handleAgregarProductos,
    handleCobrarCuenta,
    handleProductosAgregados,
    handleCuentaCobrada,
    handleCloseDetail,

    // Utilities
    getEstadoInfo,
    getEstadoBadge: getEstadoInfo
  };
}
