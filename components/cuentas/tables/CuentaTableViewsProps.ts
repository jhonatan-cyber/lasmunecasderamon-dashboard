import { CuentaWithDetails } from '@/types/cuenta';

export interface CuentaTableViewsProps {
  rows: CuentaWithDetails[];
  getEstadoBadge: (estado: number | string) => {
    label: string;
    variant: 'default' | 'secondary' | 'destructive' | 'success' | 'outline';
  };
  hasAnyAction: boolean;
  canViewDetails: boolean;
  canAddProducts: boolean;
  canCobrar: boolean;
  handleVerDetalles: (cuenta: CuentaWithDetails) => void;
  handleFinalizarTemporizador: (cuenta: CuentaWithDetails) => void;
  handleAgregarProductos: (cuenta: CuentaWithDetails) => void;
  handleCobrarCuenta: (cuenta: CuentaWithDetails) => void;
  handleSolicitarAnulacion: (cuenta: CuentaWithDetails) => void;
  getTimerByServicioId: (sid: string) => any;
}
