'use client';

import { useState, useMemo } from 'react';
import { Plus, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  GratificacionesTable,
  GratificacionesFilters,
  GratificacionesStatsCards,
  GratificacionesForm,
  GratificacionesDetailModal
} from '@/components/gratificaciones';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import Pagination from '@/components/ui/Pagination';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { useGratificaciones } from '@/hooks/personal/useGratificaciones';
import { useCashRegisterStatus } from '@/hooks/caja/useCashRegisterStatus';
import { useUserPermissions } from '@/hooks/auth/useUserPermissions';
import { formatCurrencyNoDecimals } from '@/lib/utils/formatters';
import { getNowInBusinessTimezone } from '@/lib/business/timezoneService';
import { Gratificacion } from '@/types/gratificacion';

export default function GratificacionesPage() {
  const {
    gratificaciones,
    loading,
    error,
    getGratificaciones,
    createGratificacion,
    updateGratificacion,
    deleteGratificacion
  } = useGratificaciones();

  const { hasOpenCaja, loading: cajaLoading } = useCashRegisterStatus();
  const { hasPermission } = useUserPermissions();

  // States
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [gratificacionToEdit, setGratificacionToEdit] = useState<Gratificacion | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedGratificacion, setSelectedGratificacion] = useState<Gratificacion | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [gratificacionToDelete, setGratificacionToDelete] = useState<Gratificacion | null>(null);
  const [isSubmitLoading, setIsSubmitLoading] = useState(false);

  // Filters logic
  const filteredData = useMemo(() => {
    if (!searchTerm) return gratificaciones;
    const lowerSearch = searchTerm.toLowerCase();
    return gratificaciones.filter(
      g => g.usuario.toLowerCase().includes(lowerSearch) || String(g.id).includes(lowerSearch)
    );
  }, [gratificaciones, searchTerm]);

  const totalPages = Math.ceil(filteredData.length / rowsPerPage);
  const paginatedData = filteredData.slice(
    (currentPage - 1) * rowsPerPage,
    currentPage * rowsPerPage
  );

  // Pagination helper: Calculate visible pages (showing up to 5 around current)
  const visiblePages = useMemo(() => {
    if (totalPages <= 1) return [1];
    const pages = [];
    const maxVisible = 5;
    let start = Math.max(1, currentPage - Math.floor(maxVisible / 2));
    let end = Math.min(totalPages, start + maxVisible - 1);

    if (end - start + 1 < maxVisible) {
      start = Math.max(1, end - maxVisible + 1);
    }

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    return pages;
  }, [currentPage, totalPages]);

  // Handlers
  const handleOpenForm = () => {
    setGratificacionToEdit(null);
    setIsModalOpen(true);
  };

  const handleEdit = (gratificacion: Gratificacion) => {
    setGratificacionToEdit(gratificacion);
    setIsModalOpen(true);
  };

  const handleViewDetail = (gratificacion: Gratificacion) => {
    setSelectedGratificacion(gratificacion);
    setShowDetailModal(true);
  };

  const handleDeleteClick = (gratificacion: Gratificacion) => {
    setGratificacionToDelete(gratificacion);
    setShowDeleteDialog(true);
  };

  const confirmDelete = async () => {
    if (!gratificacionToDelete) return;
    await deleteGratificacion(gratificacionToDelete.id);
    setShowDeleteDialog(false);
    getGratificaciones();
  };

  const handleFormSubmit = async (data: any) => {
    setIsSubmitLoading(true);
    try {
      if (gratificacionToEdit) {
        await updateGratificacion({
          id: gratificacionToEdit.id,
          monto: data.monto,
          descripcion: data.descripcion
        });
      } else {
        await createGratificacion({
          usuario_id: data.usuario_id,
          monto: data.monto,
          descripcion: data.descripcion,
          fecha_hora: getNowInBusinessTimezone()
        });
      }
      setIsModalOpen(false);
      getGratificaciones();
    } finally {
      setIsSubmitLoading(false);
    }
  };

  if (error) {
    return (
      <div className='flex flex-col items-center justify-center min-h-[60vh] gap-4'>
        <AlertCircle className='h-12 w-12 text-red-500' />
        <h2 className='text-xl font-bold'>Lo sentimos, ocurrió un error</h2>
        <p className='text-zinc-500'>{error}</p>
        <button
          onClick={() => getGratificaciones()}
          className='px-6 py-2 bg-black text-white rounded-full'
        >
          Reintentar
        </button>
      </div>
    );
  }

  return (
    <div className='p-4 sm:p-6 lg:p-8 max-w-[1600px] mx-auto space-y-6 animate-in fade-in duration-700 bg-white dark:bg-neutral-900 min-h-screen'>
      {/* Header Premium */}
      <div className='flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-zinc-50 dark:bg-neutral-800/50 p-6 rounded-[2.5rem] border border-zinc-100 dark:border-neutral-800'>
        <div className='flex items-center gap-5'>
          <div>
            <h1 className='text-3xl font-black text-zinc-900 dark:text-zinc-100 tracking-tighter'>
              Gratificaciones
            </h1>
            <p className='text-zinc-500 text-sm font-semibold mt-1 uppercase tracking-widest'>
              Control de bonificaciones de personal
            </p>
          </div>
        </div>

        <div className='flex items-center gap-3 w-full md:w-auto'>
          {!hasOpenCaja && !cajaLoading && (
            <div className='hidden xl:flex items-center gap-2 bg-amber-50 text-amber-700 px-4 py-2 rounded-full text-xs font-bold border border-amber-100'>
              <AlertCircle className='h-4 w-4' />
              Apertura de caja requerida
            </div>
          )}
          {hasPermission('gratificaciones', 'create') && (
            <Button
              onClick={handleOpenForm}
              disabled={!hasOpenCaja || cajaLoading}
              className='w-full md:w-auto rounded-full px-6 h-11 bg-black text-white hover:bg-zinc-800 transition-all shadow-md hover:scale-105 active:scale-95 disabled:opacity-50 font-bold text-sm'
            >
              <Plus className='h-4 w-4' />
              Nueva gratificación
            </Button>
          )}
        </div>
      </div>

      <GratificacionesStatsCards
        gratificaciones={gratificaciones}
        formatCurrency={formatCurrencyNoDecimals}
      />

      <GratificacionesFilters
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        rowsPerPage={rowsPerPage}
        setRowsPerPage={setRowsPerPage}
        setPage={setCurrentPage}
        loading={loading}
        onRefresh={getGratificaciones}
      />

      <GratificacionesTable
        loading={loading}
        rows={paginatedData}
        rowsPerPage={rowsPerPage}
        onViewDetail={handleViewDetail}
        onEdit={handleEdit}
        onDelete={handleDeleteClick}
      />

      <div className='mt-8 flex justify-center'>
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={filteredData.length}
          itemsPerPage={rowsPerPage}
          visiblePages={visiblePages}
          onPageChange={setCurrentPage}
          onItemsPerPageChange={val => {
            setRowsPerPage(val);
            setCurrentPage(1);
          }}
        />
      </div>

      {/* Modales */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className='w-[95vw] max-w-[95vw] sm:w-full sm:max-w-[500px] max-h-[90vh] flex flex-col p-0'>
          <DialogHeader className='flex-shrink-0 px-6 pt-6 pb-4 border-b'>
            <DialogTitle className='text-lg sm:text-xl lg:text-2xl font-bold'>
              {gratificacionToEdit ? 'Editar Gratificación' : 'Nueva Gratificación'}
            </DialogTitle>
            <DialogDescription className='sr-only'>Formulario de gratificación</DialogDescription>
          </DialogHeader>
          <div className='flex-1 overflow-y-auto px-6 py-4'>
            <GratificacionesForm
              open={isModalOpen}
              onSubmit={handleFormSubmit}
              onCancel={() => setIsModalOpen(false)}
              isEditMode={!!gratificacionToEdit}
              gratificacion={gratificacionToEdit}
              isLoading={isSubmitLoading}
              hideButtons={true}
            />
          </div>
          <div className='flex-shrink-0 border-t px-6 py-4 bg-white dark:bg-neutral-900'>
            <div className='flex flex-col sm:flex-row justify-center gap-2 w-full'>
              <Button
                type='button'
                variant='outline'
                size='sm'
                className='rounded-full px-6 hover:scale-105 transition-all duration-200 hover:bg-black hover:text-white w-full sm:w-auto'
                onClick={() => setIsModalOpen(false)}
                disabled={isSubmitLoading}
              >
                Cancelar
              </Button>
              <Button
                type='submit'
                form='gratificaciones-form'
                variant='outline'
                size='sm'
                className='bg-black text-white rounded-full px-6 hover:scale-105 transition-all duration-200 w-full sm:w-auto'
                disabled={isSubmitLoading}
              >
                {isSubmitLoading
                  ? 'Guardando...'
                  : gratificacionToEdit
                    ? 'Guardar Cambios'
                    : 'Guardar'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <GratificacionesDetailModal
        isOpen={showDetailModal}
        onClose={() => setShowDetailModal(false)}
        gratificacion={selectedGratificacion}
      />

      <ConfirmModal
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        title='¿Deseas eliminar esta gratificación?'
        message='Esta acción no se puede deshacer. Se eliminará el registro permanentemente.'
        type='warning'
        confirmVariant='destructive'
        onConfirm={confirmDelete}
      />
    </div>
  );
}
