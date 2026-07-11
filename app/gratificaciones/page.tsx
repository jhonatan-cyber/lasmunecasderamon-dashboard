'use client';

import { useState, useMemo } from 'react';
import { Plus, AlertCircle, Clock, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  GratificacionesTable,
  GratificacionesFilters,
  GratificacionesDetailModal
} from '@/components/gratificaciones';
import { GratificacionDialog } from '@/components/gratificaciones/GratificacionDialog';
import Pagination from '@/components/gratificaciones/Pagination';
import { ConfirmModal } from '@/components/shared/ConfirmModal';
import { useGratificaciones } from '@/hooks/personal';
import { useCashRegisterStatus } from '@/hooks/caja/useCashRegisterStatus';
import { useUserPermissions } from '@/hooks/auth/useUserPermissions';
import { formatCurrencyNoDecimals } from '@/lib/utils/formatters';
import { Gratificacion } from '@/types/gratificacion';

type TabType = 'pending' | 'paid';

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

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('fecha_crea');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [activeTab, setActiveTab] = useState<TabType>('pending');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [gratificacionToEdit, setGratificacionToEdit] = useState<Gratificacion | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedGratificacion, setSelectedGratificacion] = useState<Gratificacion | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [gratificacionToDelete, setGratificacionToDelete] = useState<Gratificacion | null>(null);
  const [isSubmitLoading, setIsSubmitLoading] = useState(false);

  const filteredData = useMemo(() => {
    let result = [...gratificaciones];

    if (activeTab === 'pending') {
      result = result.filter(g => g.estado === 1);
    } else if (activeTab === 'paid') {
      result = result.filter(g => g.estado === 0);
    }

    if (searchTerm) {
      const lowerSearch = searchTerm.toLowerCase();
      result = result.filter(
        g => g.usuario.toLowerCase().includes(lowerSearch) || String(g.id).includes(lowerSearch)
      );
    }

    result.sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortBy) {
        case 'fecha_crea':
          aValue = new Date(a.fecha_crea || 0);
          bValue = new Date(b.fecha_crea || 0);
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
          aValue = a.fecha_crea;
          bValue = b.fecha_crea;
      }

      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    return result;
  }, [gratificaciones, searchTerm, sortBy, sortOrder, activeTab]);

  const pendingCount = gratificaciones.filter(g => g.estado === 1).length;
  const paidCount = gratificaciones.filter(g => g.estado === 0).length;

  const totalPages = Math.ceil(filteredData.length / rowsPerPage);
  const paginatedData = filteredData.slice(
    (currentPage - 1) * rowsPerPage,
    currentPage * rowsPerPage
  );

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
          descripcion: data.descripcion
        });
      }
      setIsModalOpen(false);
      getGratificaciones();
    } finally {
      setIsSubmitLoading(false);
    }
  };

  const formatCurrency = (amount: number) => formatCurrencyNoDecimals(amount);

  const totalPagado = gratificaciones
    .filter(g => g.estado === 0)
    .reduce((acc, g) => acc + g.monto, 0);
  const totalPorPagar = gratificaciones
    .filter(g => g.estado === 1)
    .reduce((acc, g) => acc + g.monto, 0);

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
      {}
      <div className='flex items-center justify-between'>
        <div>
          <h1 className='text-2xl font-bold text-gray-900 dark:text-gray-100'>
            Listado de Gratificaciones
          </h1>
          <p className='text-gray-600 dark:text-gray-400'>Control de bonificaciones de personal</p>
        </div>
        {hasPermission('gratificaciones', 'create') && (
          <Button
            onClick={() => {
              setGratificacionToEdit(null);
              setIsModalOpen(true);
            }}
            disabled={!hasOpenCaja || cajaLoading}
            className='rounded-full bg-black text-white hover:scale-105 transition-all duration-200'
          >
            <Plus className='w-4 h-4 mr-2' />
            Nueva gratificación
          </Button>
        )}
      </div>

      {}
      <div className='text-center'>
        <p className='text-sm text-gray-500'>TOTAL POR PAGAR</p>
        <p className='text-2xl font-bold text-gray-900 dark:text-gray-100'>
          {formatCurrency(totalPorPagar)}
        </p>
      </div>

      {}
      <div className='flex justify-center gap-3 border-b pb-1'>
        <button
          onClick={() => {
            setActiveTab('pending');
            setCurrentPage(1);
          }}
          className={`flex items-center gap-2 px-5 py-2 text-sm font-semibold transition-all ${
            activeTab === 'pending'
              ? 'bg-amber-100 text-amber-700 rounded-full shadow-sm'
              : 'text-gray-500 hover:bg-gray-100 rounded-full'
          }`}
        >
          <Clock className='h-4 w-4' />
          Por Pagar
          <span
            className={`ml-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold ${
              activeTab === 'pending' ? 'bg-amber-600 text-white' : 'bg-amber-100 text-amber-800'
            }`}
          >
            {pendingCount}
          </span>
        </button>
        <button
          onClick={() => {
            setActiveTab('paid');
            setCurrentPage(1);
          }}
          className={`flex items-center gap-2 px-5 py-2 text-sm font-semibold transition-all ${
            activeTab === 'paid'
              ? 'bg-green-100 text-green-700 rounded-full shadow-sm'
              : 'text-gray-500 hover:bg-gray-100 rounded-full'
          }`}
        >
          <CheckCircle className='h-4 w-4' />
          Pagadas
          <span
            className={`ml-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold ${
              activeTab === 'paid' ? 'bg-green-600 text-white' : 'bg-green-100 text-green-800'
            }`}
          >
            {paidCount}
          </span>
        </button>
      </div>

      {}
      <GratificacionesFilters
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        filterStatus={statusFilter}
        setFilterStatus={setStatusFilter}
        sortBy={sortBy}
        setSortBy={setSortBy}
        sortOrder={sortOrder}
        setSortOrder={setSortOrder}
        onClearFilters={() => {
          setSearchTerm('');
          setStatusFilter('all');
          setSortBy('fecha_crea');
          setSortOrder('desc');
          setRowsPerPage(10);
          setCurrentPage(1);
        }}
        rowsPerPage={rowsPerPage}
        setRowsPerPage={setRowsPerPage}
        setPage={setCurrentPage}
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
          onPageChange={setCurrentPage}
          onItemsPerPageChange={val => {
            setRowsPerPage(val);
            setCurrentPage(1);
          }}
        />
      </div>

      {}
      <GratificacionDialog
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        gratificacion={gratificacionToEdit}
        isLoading={isSubmitLoading}
        onSubmit={handleFormSubmit}
      />

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
