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
import Pagination from '@/components/gratificaciones/Pagination';
import { ConfirmModal } from '@/components/shared/ConfirmModal';
import SelectElements from '@/components/shared/SelectElements';
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
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('fecha_hora');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
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

  // Filters and sorting logic
  const filteredData = useMemo(() => {
    let result = [...gratificaciones];

    // Filter by search term
    if (searchTerm) {
      const lowerSearch = searchTerm.toLowerCase();
      result = result.filter(
        g => g.usuario.toLowerCase().includes(lowerSearch) || String(g.id).includes(lowerSearch)
      );
    }

    // Filter by status
    if (statusFilter !== 'all') {
      result = result.filter(g => {
        if (statusFilter === 'pagado') return g.estado === 0;
        if (statusFilter === 'por_pagar') return g.estado === 1;
        return true;
      });
    }

    // Sort
    result.sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortBy) {
        case 'fecha_hora':
          aValue = new Date(a.fecha_hora || 0);
          bValue = new Date(b.fecha_hora || 0);
          break;
        case 'monto':
          aValue = a.monto;
          bValue = b.monto;
          break;
        case 'usuario':
          aValue = a.usuario.toLowerCase();
          bValue = b.usuario.toLowerCase();
          break;
        default:
          aValue = a.fecha_hora;
          bValue = b.fecha_hora;
      }

      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    return result;
  }, [gratificaciones, searchTerm, statusFilter, sortBy, sortOrder]);

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

  const formatCurrency = (amount: number) => formatCurrencyNoDecimals(amount);

  // Cálculos para stats
  const totalPagado = gratificaciones.filter(g => g.estado === 0).reduce((acc, g) => acc + g.monto, 0);
  const totalPorPagar = gratificaciones.filter(g => g.estado === 1).reduce((acc, g) => acc + g.monto, 0);

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
    <div className='p-6 space-y-6'>
      {/* Header */}
      <div className='flex items-center justify-between'>
        <div>
          <h1 className='text-2xl font-bold text-gray-900 dark:text-gray-100'>Listado de Gratificaciones</h1>
          <p className='text-gray-600 dark:text-gray-400'>
            Control de bonificaciones de personal
          </p>
        </div>
        {hasPermission('gratificaciones', 'create') && (
          <Button
            onClick={handleOpenForm}
            disabled={!hasOpenCaja || cajaLoading}
            className='rounded-full bg-black text-white hover:scale-105 transition-all duration-200'
          >
            <Plus className='w-4 h-4 mr-2' />
            Nueva gratificación
          </Button>
        )}
      </div>

      {/* Total a pagar centrado */}
      <div className='text-center'>
        <p className='text-sm text-gray-500'>TOTAL POR PAGAR</p>
        <p className='text-2xl font-bold text-gray-900 dark:text-gray-100'>{formatCurrency(totalPorPagar)}</p>
      </div>

      {/* Filtros */}
      <div className='grid grid-cols-1 md:grid-cols-4 gap-4 p-6 bg-white dark:bg-gray-800 rounded-3xl shadow-md border-none'>
        <div>
          <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'>Buscar</label>
          <input
            type='text'
            placeholder='Buscar por nombre o ID...'
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className='w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500'
          />
        </div>
        <div>
          <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'>Estado</label>
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className='w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-full dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500'
          >
            <option value='all'>Todos</option>
            <option value='pagado'>Pagado</option>
            <option value='por_pagar'>Por pagar</option>
          </select>
        </div>
        <div>
          <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'>Ordenar por</label>
          <select
            value={sortBy}
            onChange={e => setSortBy(e.target.value)}
            className='w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-full dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500'
          >
            <option value='fecha_hora'>Fecha</option>
            <option value='monto'>Monto</option>
            <option value='usuario'>Usuario</option>
          </select>
        </div>
        <div>
          <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'>Orden</label>
          <select
            value={sortOrder}
            onChange={e => setSortOrder(e.target.value as 'asc' | 'desc')}
            className='w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-full dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500'
          >
            <option value='desc'>Descendente</option>
            <option value='asc'>Ascendente</option>
          </select>
        </div>
        <div className='flex items-center'>
          <Button
            variant='outline'
            size='sm'
            onClick={() => getGratificaciones()}
            disabled={loading}
            className='rounded-full'
          >
            {loading ? 'Cargando...' : 'Actualizar'}
          </Button>
        </div>
      </div>

      {/* Selector de filas por página */}
      <div className='flex justify-between items-center'>
        <SelectElements
          value={rowsPerPage}
          onChange={value => {
            setRowsPerPage(value);
            setCurrentPage(1);
          }}
          options={[
            { value: 5, label: '5' },
            { value: 10, label: '10' },
            { value: 20, label: '20' },
            { value: 50, label: '50' }
          ]}
        />
      </div>

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
