'use client';

import { useState } from 'react';
import { useGratificaciones } from '@/hooks/personal/useGratificaciones';
import { useCashRegisterStatus } from '@/hooks/caja/useCashRegisterStatus';
import { useUserPermissions } from '@/hooks/auth/useUserPermissions';
import { formatCurrencyNoDecimals } from '@/lib/formatters';
import GratificacionesFilters from '@/components/gratificaciones/GratificacionesFilters';
import GratificacionesStatsCards from '@/components/gratificaciones/GratificacionesStatsCards';
import GratificacionesTable from '@/components/gratificaciones/GratificacionesTable';
import GratificacionesFormDialog from '@/components/gratificaciones/GratificacionesFormDialog';
import GratificacionesEditDialog from '@/components/gratificaciones/GratificacionesEditDialog';
import GratificacionesDetailModal from '@/components/gratificaciones/GratificacionesDetailModal';
import Paginate from '@/components/ui/paginate';
import { PermissionGuard } from '@/components/auth/PermissionGuard';
import { ConfirmModal } from '@/components/ui/ConfirmModal';

import { Button } from '@/components/ui/button';
import { Plus, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { Gratificacion } from '@/types/gratificacion';

export default function GratificacionesPage() {
  const { gratificaciones, loading, error, getGratificaciones, deleteGratificacion } = useGratificaciones();
  const { hasOpenCaja, loading: cajaLoading } = useCashRegisterStatus();
  const { hasPermission } = useUserPermissions();
  const [searchTerm, setSearchTerm] = useState('');
  const [rowsPerPage, setRowsPerPage] = useState(5);
  const [page, setPage] = useState(1);
  const [showFormDialog, setShowFormDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedGratificacion, setSelectedGratificacion] = useState<{
    id_usuario: number;
    usuario: string;
  } | null>(null);
  const [gratificacionToEdit, setGratificacionToEdit] = useState<Gratificacion | null>(null);
  const [gratificacionToDelete, setGratificacionToDelete] = useState<Gratificacion | null>(null);

  const canCreate = hasPermission('gratificaciones', 'create');
  const canEdit = hasPermission('gratificaciones', 'edit');
  const canDelete = hasPermission('gratificaciones', 'delete');

  const gratificacionesData = gratificaciones || [];

  const filteredGratificaciones = gratificacionesData.filter(gratificacion => {
    return gratificacion.usuario.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const totalPages = Math.ceil(filteredGratificaciones.length / rowsPerPage) || 1;
  const paginatedGratificaciones = filteredGratificaciones.slice((page - 1) * rowsPerPage, page * rowsPerPage);

  const handleRefresh = () => {
    getGratificaciones();
  };

  const handleOpenFormDialog = () => {
    if (!hasOpenCaja) {
      toast.error(
        'No se puede crear gratificación sin caja abierta. Por favor, abra una caja primero.'
      );
      return;
    }
    setShowFormDialog(true);
  };

  const handleCloseFormDialog = () => {
    setShowFormDialog(false);
  };

  const handleViewDetail = (gratificacion: { id_usuario: number; usuario: string }) => {
    setSelectedGratificacion(gratificacion);
    setShowDetailModal(true);
  };

  const handleCloseDetailModal = () => {
    setShowDetailModal(false);
    setSelectedGratificacion(null);
  };

  const handleEdit = (gratificacion: Gratificacion) => {
    setGratificacionToEdit(gratificacion);
    setShowEditDialog(true);
  };

  const handleCloseEditDialog = () => {
    setShowEditDialog(false);
    setGratificacionToEdit(null);
  };

  const handleDelete = (gratificacion: Gratificacion) => {
    setGratificacionToDelete(gratificacion);
    setShowDeleteDialog(true);
  };

  const handleConfirmDelete = async () => {
    if (!gratificacionToDelete) return;
    
    try {
      await deleteGratificacion(gratificacionToDelete.id);
      toast.success('Gratificación eliminada exitosamente');
      setShowDeleteDialog(false);
      setGratificacionToDelete(null);
    } catch (error) {
      toast.error('Error al eliminar la gratificación');
    }
  };

  return (
    <PermissionGuard module="gratificaciones" action="view">
      <div className='p-4 sm:p-6 lg:p-10 space-y-4 sm:space-y-6 mt-4 sm:mt-6 lg:mt-10'>
        <div className='flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 sm:gap-6 mb-4 sm:mb-6'>
          <div className='flex flex-col'>
            <h1 className='text-xl sm:text-2xl lg:text-3xl font-bold'>Gratificaciones</h1>
            <p className='text-sm sm:text-base text-gray-600'>
              Gestiona las gratificaciones de los empleados.
            </p>
          </div>
          <div className='flex gap-2 w-full sm:w-auto'>
            <PermissionGuard module="gratificaciones" action="create" fallback={null}>
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

        {!cajaLoading && hasOpenCaja === false && (
          <div className='bg-yellow-50 border border-yellow-200 rounded-lg p-4'>
            <div className='flex items-center'>
              <AlertCircle className='h-5 w-5 text-yellow-600 mr-2' />
              <div>
                <h3 className='text-sm font-medium text-yellow-800'>Caja cerrada</h3>
                <p className='text-sm text-yellow-700 mt-1'>
                  No se pueden crear nuevas gratificaciones sin una caja abierta. Por favor, abra una
                  caja en el módulo de caja primero.
                </p>
              </div>
            </div>
          </div>
        )}

        <GratificacionesStatsCards gratificaciones={gratificacionesData} formatCurrency={formatCurrencyNoDecimals} />

        <GratificacionesFilters
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          rowsPerPage={rowsPerPage}
          setRowsPerPage={setRowsPerPage}
          setPage={setPage}
          loading={loading}
          onRefresh={handleRefresh}
        />

        <div className='overflow-x-auto'>
          <GratificacionesTable
            loading={loading}
            rows={paginatedGratificaciones}
            rowsPerPage={rowsPerPage}
            onViewDetail={handleViewDetail}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
        </div>

        {totalPages > 1 && (
          <div className='flex justify-center mt-4 sm:mt-6'>
            <Paginate page={page} totalPages={totalPages} setPage={setPage} />
          </div>
        )}

        <GratificacionesFormDialog
          open={showFormDialog}
          onClose={handleCloseFormDialog}
          onSuccess={handleRefresh}
        />

        {gratificacionToEdit && (
          <GratificacionesEditDialog
            open={showEditDialog}
            onClose={handleCloseEditDialog}
            gratificacion={gratificacionToEdit}
            onSuccess={handleRefresh}
          />
        )}

        {selectedGratificacion && (
          <GratificacionesDetailModal
            isOpen={showDetailModal}
            onClose={handleCloseDetailModal}
            userId={selectedGratificacion.id_usuario}
            userName={selectedGratificacion.usuario}
          />
        )}

        {gratificacionToDelete && (
          <ConfirmModal
            open={showDeleteDialog}
            onOpenChange={setShowDeleteDialog}
            title="Eliminar Gratificación"
            message={`¿Estás seguro de eliminar la gratificación de ${gratificacionToDelete.usuario} por ${formatCurrencyNoDecimals(gratificacionToDelete.monto)}?`}
            confirmText="Eliminar"
            type="warning"
            confirmVariant="destructive"
            onConfirm={handleConfirmDelete}
          />
        )}
      </div>
    </PermissionGuard>
  );
}
