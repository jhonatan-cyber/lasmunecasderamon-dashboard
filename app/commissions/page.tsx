'use client';

import { useState, useMemo } from 'react';
import { CommissionsFilters, CommissionsList } from '@/components/commissions';
import CommissionsDetalleModal from '@/components/commissions/CommissionsDetalleModal';
import CommissionsStatsCards from '@/components/commissions/CommissionsStatsCards';

import { useCommissions } from '@/hooks/personal';
import { useCommissionStats } from '@/hooks/personal';
import { Commission } from '@/types/commission';
import { formatCurrencyCLP } from '@/lib/utils/formatters';
import { PermissionGuard } from '@/components/auth/PermissionGuard';
import { Clock, CheckCircle } from 'lucide-react';

type TabType = 'pending' | 'paid';

export default function CommissionsPage() {
  const { filteredCommissions, isLoading, searchTerm, setSearchTerm } = useCommissions();

  const { data: stats, isLoading: isLoadingStats } = useCommissionStats();

  const [rowsPerPage, setRowsPerPage] = useState(5);
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState('employeeName');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [selectedCommission, setSelectedCommission] = useState<Commission | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('pending');

  const handleClearFilters = () => {
    setSearchTerm('');
    setSortBy('employeeName');
    setSortOrder('asc');
    setRowsPerPage(5);
    setPage(1);
  };

  // Reset page when tab changes
  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    setPage(1);
  };

  const handleViewDetails = (commission: Commission) => {
    setSelectedCommission(commission);
    setShowDetailModal(true);
  };

  const handleCloseDetailModal = () => {
    setShowDetailModal(false);
    setSelectedCommission(null);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'por_pagar':
        return 'bg-yellow-100 text-yellow-800 hover:bg-yellow-100 hover:text-yellow-800';
      case 'pagado':
        return 'bg-green-100 text-green-800 hover:bg-green-100 hover:text-green-800';
      case 'anulado':
        return 'bg-red-100 text-red-800 hover:bg-red-100 hover:text-red-800';
      default:
        return 'bg-gray-100 text-gray-800 hover:bg-gray-100 hover:text-gray-800';
    }
  };

  // Ordenar comisiones
  const sortedCommissions = useMemo(() => {
    return [...filteredCommissions].sort((a: any, b: any) => {
      let aVal = a[sortBy];
      let bVal = b[sortBy];
      if (typeof aVal === 'string') aVal = aVal.toLowerCase();
      if (typeof bVal === 'string') bVal = bVal.toLowerCase();
      if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredCommissions, sortBy, sortOrder]);

  // Ordenar comisiones filtradas por tab
  const tabFilteredCommissions = useMemo(() => {
    return sortedCommissions.filter(c => {
      if (activeTab === 'pending') return c.status === 'por_pagar';
      if (activeTab === 'paid') return c.status === 'pagado';
      return true;
    });
  }, [sortedCommissions, activeTab]);

  // Paginación
  const totalPages = Math.ceil(tabFilteredCommissions.length / rowsPerPage);
  const paginatedCommissions = tabFilteredCommissions.slice(
    (page - 1) * rowsPerPage,
    page * rowsPerPage
  );

  // Filtrar por tab activo
  const pendingCount = filteredCommissions.filter(c => c.status === 'por_pagar').length;
  const paidCount = filteredCommissions.filter(c => c.status === 'pagado').length;

  return (
    <PermissionGuard module='commissions' action='view'>
      <div className='p-4 sm:p-6 lg:p-10 space-y-6 mt-4 sm:mt-6 lg:mt-10'>
        <div className='flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4'>
          <div>
            <h1 className='text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight text-gray-900'>
              Comisiones
            </h1>
            <p className='text-sm sm:text-base text-gray-500'>
              Gestiona las comisiones de las anfitrionas por ventas y servicios
            </p>
          </div>
        </div>

        {/* Estadísticas */}
        <CommissionsStatsCards
          totalComisiones={stats?.total_comisiones || 0}
          comisionVentas={stats?.comision_ventas || 0}
          comisionServicios={stats?.comision_servicios || 0}
          cantidadComisiones={stats?.cantidad_comisiones || 0}
          porcentajeVentas={stats?.porcentaje_ventas || 0}
          porcentajeServicios={stats?.porcentaje_servicios || 0}
          isLoading={isLoadingStats}
        />

        {/* Filtros y búsqueda */}
        <div className='space-y-4'>
          <CommissionsFilters
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            sortBy={sortBy}
            setSortBy={setSortBy}
            sortOrder={sortOrder}
            setSortOrder={setSortOrder}
            onClearFilters={handleClearFilters}
            rowsPerPage={rowsPerPage}
            setRowsPerPage={setRowsPerPage}
            setPage={setPage}
          />

          {/* Tabs - centrados debajo de los filtros */}
          <div className='flex justify-center gap-3 border-b pb-1'>
            <button
              onClick={() => handleTabChange('pending')}
              className={`flex items-center gap-2 px-5 py-2 text-sm font-semibold transition-all ${
                activeTab === 'pending'
                  ? 'bg-amber-100 text-amber-700 rounded-full shadow-sm'
                  : 'text-gray-500 hover:bg-gray-100 rounded-full'
              }`}
            >
              <Clock className='h-4 w-4' />
              Pendientes de Pago
              <span className={`ml-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold ${
                activeTab === 'pending' ? 'bg-amber-600 text-white' : 'bg-amber-100 text-amber-800'
              }`}>
                {pendingCount}
              </span>
            </button>
            <button
              onClick={() => handleTabChange('paid')}
              className={`flex items-center gap-2 px-5 py-2 text-sm font-semibold transition-all ${
                activeTab === 'paid'
                  ? 'bg-green-100 text-green-700 rounded-full shadow-sm'
                  : 'text-gray-500 hover:bg-gray-100 rounded-full'
              }`}
            >
              <CheckCircle className='h-4 w-4' />
              Pagadas
              <span className={`ml-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold ${
                activeTab === 'paid' ? 'bg-green-600 text-white' : 'bg-green-100 text-green-800'
              }`}>
                {paidCount}
              </span>
            </button>
          </div>
        </div>

        {/* Lista de comisiones */}
        <div className='overflow-x-auto'>
          <CommissionsList
            loading={isLoading}
            paginatedCommissions={paginatedCommissions}
            getStatusColor={getStatusColor}
            page={page}
            setPage={setPage}
            totalPages={totalPages}
            onViewDetails={handleViewDetails}
          />
        </div>

        {/* Modal de detalles */}
        <CommissionsDetalleModal
          open={showDetailModal}
          onClose={handleCloseDetailModal}
          usuario={
            selectedCommission
              ? {
                  id_usuario: selectedCommission.employeeId,
                  nombre_completo: selectedCommission.employeeName,
                  nick: selectedCommission.nick,
                  total_comisiones: selectedCommission.total,
                  total_ventas: selectedCommission.venta,
                  total_servicios: selectedCommission.servicio
                }
              : null
          }
        />
      </div>
    </PermissionGuard>
  );
}

