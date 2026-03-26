'use client';

import { useState } from 'react';
import { useOvertime } from '@/hooks/personal/useOvertime';
import { useCashRegisterStatus } from '@/hooks/caja/useCashRegisterStatus';
import { useUserPermissions } from '@/hooks/auth/useUserPermissions';
import { formatCurrencyCLP } from '@/lib/utils/formatters';
import OvertimeFilters from '@/components/overtime/OvertimeFilters';
import OvertimeStatsCards from '@/components/overtime/OvertimeStatsCards';
import OvertimeTable from '@/components/overtime/OvertimeTable';
import { OvertimeForm } from '@/components/overtime/OvertimeForm';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import OvertimeDetailModal from '@/components/overtime/OvertimeDetailModal';
import Paginate from '@/components/ui/paginate';
import { PermissionGuard } from '@/components/auth/PermissionGuard';

import { Button } from '@/components/ui/button';
import { Plus, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

export default function OvertimePage() {
  const { overtime, loading, error, getOvertime, createOvertime } = useOvertime();
  const { hasOpenCaja, loading: cajaLoading } = useCashRegisterStatus();
  const { hasPermission } = useUserPermissions();
  const [searchTerm, setSearchTerm] = useState('');
  const [rowsPerPage, setRowsPerPage] = useState(5);
  const [page, setPage] = useState(1);
  const [showFormDialog, setShowFormDialog] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedOvertime, setSelectedOvertime] = useState<{
    id_usuario: number;
    usuario: string;
  } | null>(null);

  // Verificar permiso para crear horas extras
  const canCreate = hasPermission('overtime', 'create');

  // Asegurar que overtime sea siempre un array
  const overtimeData = overtime || [];

  const filteredOvertime = overtimeData.filter(overtime => {
    return overtime.usuario.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const totalPages = Math.ceil(filteredOvertime.length / rowsPerPage) || 1;
  const paginatedOvertime = filteredOvertime.slice((page - 1) * rowsPerPage, page * rowsPerPage);

  const handleRefresh = () => {
    getOvertime();
  };

  const handleOpenFormDialog = () => {
    if (!hasOpenCaja) {
      toast.error(
        'No se puede crear horas extras sin caja abierta. Por favor, abra una caja primero.'
      );
      return;
    }
    setShowFormDialog(true);
  };

  const handleCloseFormDialog = () => {
    setShowFormDialog(false);
  };

  const handleOvertimeSubmit = async (data: {
    usuario_id: string;
    hora: number;
    monto: number;
  }) => {
    if (!data.usuario_id || !data.hora || !data.monto) {
      toast.error('Todos los campos son requeridos');
      return;
    }
    if (data.hora <= 0 || data.monto <= 0) {
      toast.error('Las horas y el monto deben ser mayores a 0');
      return;
    }
    if (data.hora > 24) {
      toast.error('Las horas no pueden ser mayores a 24');
      return;
    }
    try {
      await createOvertime({ usuario_id: data.usuario_id, hora: data.hora, monto: data.monto });
      toast.success('Hora extra creada exitosamente');
      setShowFormDialog(false);
      handleRefresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error al crear la hora extra');
    }
  };

  const handleViewDetail = (overtime: { id_usuario: number; usuario: string }) => {
    setSelectedOvertime(overtime);
    setShowDetailModal(true);
  };

  const handleCloseDetailModal = () => {
    setShowDetailModal(false);
    setSelectedOvertime(null);
  };

  return (
    <PermissionGuard module='overtime' action='view'>
      <div className='p-4 sm:p-6 lg:p-10 space-y-4 sm:space-y-6 mt-4 sm:mt-6 lg:mt-10'>
        <div className='flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 sm:gap-6 mb-4 sm:mb-6'>
          <div className='flex flex-col'>
            <h1 className='text-xl sm:text-2xl lg:text-3xl font-bold'>Horas Extras</h1>
            <p className='text-sm sm:text-base text-gray-600'>
              Gestiona las horas extras de los empleados.
            </p>
          </div>
          <div className='flex gap-2 w-full sm:w-auto'>
            <PermissionGuard module='overtime' action='create' fallback={null}>
              <Button
                size='sm'
                disabled={cajaLoading || !hasOpenCaja}
                className={`whitespace-nowrap inline-flex items-center px-4 sm:px-6 py-2 rounded-full duration-200 text-sm sm:text-base w-full sm:w-auto ${
                  hasOpenCaja
                    ? 'bg-black text-white hover:scale-105'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
                onClick={handleOpenFormDialog}
              >
                {cajaLoading ? (
                  <>
                    <div className='animate-spin rounded-full h-3 w-3 sm:h-4 sm:w-4 border-b-2 border-gray-500 mr-1' />
                    Verificando...
                  </>
                ) : hasOpenCaja ? (
                  <>
                    <Plus className='w-3 h-3 sm:w-4 sm:h-4 mr-1' />
                    Nuevo
                  </>
                ) : (
                  <>
                    <AlertCircle className='w-3 h-3 sm:w-4 sm:h-4 mr-1' />
                    Sin Caja
                  </>
                )}
              </Button>
            </PermissionGuard>
          </div>
        </div>

        {/* Mensaje de advertencia cuando no hay caja abierta */}
        {!cajaLoading && hasOpenCaja === false && (
          <div className='bg-yellow-50 border border-yellow-200 rounded-lg p-4'>
            <div className='flex items-center'>
              <AlertCircle className='h-5 w-5 text-yellow-600 mr-2' />
              <div>
                <h3 className='text-sm font-medium text-yellow-800'>Caja cerrada</h3>
                <p className='text-sm text-yellow-700 mt-1'>
                  No se pueden crear nuevas horas extras sin una caja abierta. Por favor, abra una
                  caja en el módulo de caja primero.
                </p>
              </div>
            </div>
          </div>
        )}

        <OvertimeStatsCards overtime={overtimeData} formatCurrency={formatCurrencyCLP} />

        <OvertimeFilters
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          rowsPerPage={rowsPerPage}
          setRowsPerPage={setRowsPerPage}
          setPage={setPage}
          loading={loading}
          onRefresh={handleRefresh}
        />

        <div className='overflow-x-auto'>
          <OvertimeTable
            loading={loading}
            rows={paginatedOvertime}
            rowsPerPage={rowsPerPage}
            onViewDetail={handleViewDetail}
          />
        </div>

        {totalPages > 1 && (
          <div className='flex justify-center mt-4 sm:mt-6'>
            <Paginate page={page} totalPages={totalPages} setPage={setPage} />
          </div>
        )}

        {/* Modal para agregar nueva hora extra */}
        <Dialog open={showFormDialog} onOpenChange={setShowFormDialog}>
          <DialogContent className='w-[95vw] max-w-[95vw] sm:w-auto sm:max-w-[500px] max-h-[90vh] flex flex-col p-0'>
            <DialogHeader className='flex-shrink-0 px-6 pt-6 pb-4 border-b'>
              <DialogTitle className='text-center text-lg sm:text-xl lg:text-2xl font-semibold'>
                Nueva Hora Extra
              </DialogTitle>
              <DialogDescription className='sr-only'>Formulario de hora extra</DialogDescription>
            </DialogHeader>
            <div className='flex-1 overflow-y-auto px-6 py-4'>
              <OvertimeForm
                open={showFormDialog}
                onSubmit={handleOvertimeSubmit}
                onCancel={handleCloseFormDialog}
                hideButtons={true}
              />
            </div>
            <div className='flex-shrink-0 border-t px-6 py-4'>
              <div className='flex flex-col sm:flex-row justify-center gap-2 w-full'>
                <Button
                  type='button'
                  onClick={handleCloseFormDialog}
                  variant='outline'
                  size='sm'
                  className='rounded-full px-6 hover:scale-105 transition-all duration-200 hover:bg-black hover:text-white w-full sm:w-auto'
                >
                  Cancelar
                </Button>
                <Button
                  type='submit'
                  form='overtime-form'
                  variant='outline'
                  size='sm'
                  className='rounded-full px-6 hover:scale-105 transition-all duration-200 bg-black text-white w-full sm:w-auto'
                >
                  Guardar
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Modal de detalles */}
        {selectedOvertime && (
          <OvertimeDetailModal
            isOpen={showDetailModal}
            onClose={handleCloseDetailModal}
            userId={selectedOvertime.id_usuario}
            userName={selectedOvertime.usuario}
          />
        )}
      </div>
    </PermissionGuard>
  );
}
