'use client';

import { Receipt } from 'lucide-react';
import { CuentaWithDetails } from '@/types/cuenta';
import { useUserPermissions } from '@/hooks/auth/useUserPermissions';
import { useTimer } from '@/contexts/TimerContext';
import { useConfirmModal } from '@/hooks/shared';
import { ConfirmModal } from '@/components/shared/ConfirmModal';
import { useCuentaTableLogic } from '@/hooks/cuentas/useCuentaTableLogic';
import { useCuentaAnulacion } from '@/hooks/cuentas/useCuentaAnulacion';
import CuentaDetailModal from '../modals/CuentaDetailModal';
import AgregarProductosModal from '../modals/AgregarProductosModal';
import CobrarCuentaModal from '../modals/CobrarCuentaModal';
import { SolicitarAnulacionModal } from '../modals/SolicitarAnulacionModal';
import { MobileCardView } from './MobileCardView';
import { DesktopTableView } from './DesktopTableView';
import type { CuentaTableViewsProps } from './CuentaTableViewsProps';

interface CuentaTableProps {
  loading: boolean;
  rows: CuentaWithDetails[];
  rowsPerPage: number;
  onRefresh?: () => void;
  onOrderStatusChange?: () => void;
}

export default function CuentaTable({
  loading,
  rows,
  onRefresh,
  onOrderStatusChange
}: CuentaTableProps) {
  const { hasPermission } = useUserPermissions();
  const { getTimerByServicioId } = useTimer();
  const { modalState, showConfirm, closeModal } = useConfirmModal();
  const {
    selectedCuentaId,
    detailModalOpen,
    setDetailModalOpen,
    agregarProductosOpen,
    setAgregarProductosOpen,
    cobrarCuentaOpen,
    setCobrarCuentaOpen,
    cuentaSeleccionada,
    handleVerDetalles,
    handleAgregarProductos,
    handleCobrarCuenta,
    handleProductosAgregados: hookHandleProductosAgregados,
    handleCuentaCobrada: hookHandleCuentaCobrada,
    getEstadoBadge
  } = useCuentaTableLogic();

  const {
    anulacionDialogOpen,
    setAnulacionDialogOpen,
    cuentaParaAnular,
    motivoAnulacion,
    setMotivoAnulacion,
    montoAnulacion,
    setMontoAnulacion,
    anulandoCuenta,
    handleSolicitarAnulacion,
    handleConfirmarSolicitudAnulacion,
    closeAnulacionDialog,
    handleFinalizarTemporizador,
    formatMontoInput
  } = useCuentaAnulacion({ onRefresh, onOrderStatusChange, showConfirm });

  const canViewDetails = hasPermission('cuentas', 'ver_detalles');
  const canAddProducts = hasPermission('cuentas', 'agregar_productos');
  const canCobrar = hasPermission('cuentas', 'cobrar');

  const hasAnyAction = canViewDetails || canAddProducts || canCobrar;

  const selectedCuentaIdForAction = cuentaSeleccionada
    ? String(cuentaSeleccionada.id_cuenta ?? cuentaSeleccionada.id ?? '')
    : null;

  const handleProductosAgregados = () => {
    hookHandleProductosAgregados();
    if (onRefresh) {
      onRefresh();
    }
  };

  const handleCuentaCobrada = () => {
    hookHandleCuentaCobrada();
    if (onRefresh) {
      onRefresh();
    }
  };

  if (loading) {
    return (
      <div className='bg-white dark:bg-slate-900/40 backdrop-blur-xs rounded-3xl border-none shadow-md overflow-hidden p-8'>
        <div className='animate-pulse space-y-4'>
          <div className='h-12 bg-gray-100 dark:bg-gray-800 rounded-xl' />
          <div className='h-12 bg-gray-100 dark:bg-gray-800 rounded-xl' />
          <div className='h-12 bg-gray-100 dark:bg-gray-800 rounded-xl' />
        </div>
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className='bg-white dark:bg-slate-900/40 backdrop-blur-xs rounded-3xl border-none shadow-md overflow-hidden p-8'>
        <div className='text-center py-12'>
          <div className='w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4'>
            <Receipt className='w-8 h-8 text-gray-400' />
          </div>
          <h3 className='text-lg font-medium text-gray-900 dark:text-white mb-2'>No hay cuentas</h3>
          <p className='text-sm text-gray-500'>No se encontraron cuentas para mostrar</p>
        </div>
      </div>
    );
  }

  const viewProps: CuentaTableViewsProps = {
    rows,
    getEstadoBadge,
    hasAnyAction,
    canViewDetails,
    canAddProducts,
    canCobrar,
    handleVerDetalles,
    handleFinalizarTemporizador,
    handleAgregarProductos,
    handleCobrarCuenta,
    handleSolicitarAnulacion,
    getTimerByServicioId
  };

  return (
    <>
      <MobileCardView {...viewProps} />
      <DesktopTableView {...viewProps} />

      <CuentaDetailModal
        open={detailModalOpen}
        onOpenChange={setDetailModalOpen}
        cuentaId={selectedCuentaId}
      />

      <AgregarProductosModal
        open={agregarProductosOpen}
        onOpenChange={setAgregarProductosOpen}
        cuentaId={selectedCuentaIdForAction}
        onProductosAgregados={handleProductosAgregados}
      />

      <CobrarCuentaModal
        open={cobrarCuentaOpen}
        onClose={() => setCobrarCuentaOpen(false)}
        cuenta={cuentaSeleccionada}
        onCuentaCobrada={handleCuentaCobrada}
        onOrderStatusChange={onOrderStatusChange}
      />

      <ConfirmModal
        open={modalState.open}
        onOpenChange={closeModal}
        title={modalState.title}
        message={modalState.message}
        confirmText={modalState.confirmText}
        type={modalState.type as 'question' | 'warning' | 'info' | 'success'}
        onConfirm={modalState.onConfirm || (() => {})}
      />

      <SolicitarAnulacionModal
        open={anulacionDialogOpen}
        onOpenChange={setAnulacionDialogOpen}
        cuenta={cuentaParaAnular}
        motivo={motivoAnulacion}
        onMotivoChange={setMotivoAnulacion}
        monto={montoAnulacion}
        onMontoChange={value => setMontoAnulacion(formatMontoInput(value))}
        anulando={anulandoCuenta}
        onConfirmar={handleConfirmarSolicitudAnulacion}
        onCancelar={closeAnulacionDialog}
      />
    </>
  );
}
