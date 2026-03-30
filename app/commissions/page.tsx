'use client';

import { useState, useMemo } from 'react';
import { CommissionsFilters, CommissionsList } from '@/components/commissions';
import CommissionsDetalleModal from '@/components/commissions/CommissionsDetalleModal';
import CommissionsStatsCards from '@/components/commissions/CommissionsStatsCards';

import { useCommissions } from '@/hooks/personal/useCommissions';
import useCommissionStats from '@/hooks/personal/useCommissionStats';
import { Commission } from '@/types/commission';
import { formatCurrencyCLP } from '@/lib/utils/formatters';
import { PermissionGuard } from '@/components/auth/PermissionGuard';

export default function CommissionsPage() {
  const { filteredCommissions, isLoading, searchTerm, setSearchTerm } = useCommissions();

  const { data: stats, isLoading: isLoadingStats } = useCommissionStats();

  const [rowsPerPage, setRowsPerPage] = useState(5);
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState('employeeName');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [selectedCommission, setSelectedCommission] = useState<Commission | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  const handleClearFilters = () => {
    setSearchTerm('');
    setSortBy('employeeName');
    setSortOrder('asc');
    setRowsPerPage(5);
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

  // Paginación
  const totalPages = Math.ceil(sortedCommissions.length / rowsPerPage);
  const paginatedCommissions = sortedCommissions.slice(
    (page - 1) * rowsPerPage,
    page * rowsPerPage
  );

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
