'use client';

import { useState } from 'react';
import { CommissionsFilters, CommissionsList } from '@/components/commissions';
import CommissionsDetalleModal from '@/components/commissions/CommissionsDetalleModal';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DollarSign, Clock, CheckCircle2, TrendingUp } from 'lucide-react';

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
  const [selectedCommission, setSelectedCommission] = useState<Commission | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  const handleClearFilters = () => {
    setSearchTerm('');
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

  // Paginación
  const totalPages = Math.ceil(filteredCommissions.length / rowsPerPage);
  const paginatedCommissions = filteredCommissions.slice(
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
        <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4'>
          <Card className='bg-white shadow-sm border-slate-100'>
            <CardHeader className='flex flex-row items-center justify-between pb-2'>
              <CardTitle className='text-sm font-medium text-gray-500'>Total Comisiones</CardTitle>
              <DollarSign className='h-4 w-4 text-blue-600' />
            </CardHeader>
            <CardContent>
              <div className='text-2xl font-bold text-gray-900'>
                {isLoadingStats ? '...' : formatCurrencyCLP(stats?.total_comisiones || 0)}
              </div>
              <p className='text-xs text-gray-400 mt-1'>Acumulado en caja activa</p>
            </CardContent>
          </Card>

          <Card className='bg-white shadow-sm border-slate-100'>
            <CardHeader className='flex flex-row items-center justify-between pb-2'>
              <CardTitle className='text-sm font-medium text-gray-500'>Por Ventas</CardTitle>
              <TrendingUp className='h-4 w-4 text-green-600' />
            </CardHeader>
            <CardContent>
              <div className='text-2xl font-bold text-gray-900'>
                {isLoadingStats ? '...' : formatCurrencyCLP(stats?.comision_ventas || 0)}
              </div>
              <p className='text-xs text-gray-400 mt-1'>
                {stats?.porcentaje_ventas || 0}% del total
              </p>
            </CardContent>
          </Card>

          <Card className='bg-white shadow-sm border-slate-100'>
            <CardHeader className='flex flex-row items-center justify-between pb-2'>
              <CardTitle className='text-sm font-medium text-gray-500'>Por Servicios</CardTitle>
              <Clock className='h-4 w-4 text-purple-600' />
            </CardHeader>
            <CardContent>
              <div className='text-2xl font-bold text-gray-900'>
                {isLoadingStats ? '...' : formatCurrencyCLP(stats?.comision_servicios || 0)}
              </div>
              <p className='text-xs text-gray-400 mt-1'>
                {stats?.porcentaje_servicios || 0}% del total
              </p>
            </CardContent>
          </Card>

          <Card className='bg-white shadow-sm border-slate-100'>
            <CardHeader className='flex flex-row items-center justify-between pb-2'>
              <CardTitle className='text-sm font-medium text-gray-500'>Anfitrionas</CardTitle>
              <CheckCircle2 className='h-4 w-4 text-orange-600' />
            </CardHeader>
            <CardContent>
              <div className='text-2xl font-bold text-gray-900'>
                {isLoadingStats ? '...' : stats?.cantidad_comisiones || 0}
              </div>
              <p className='text-xs text-gray-400 mt-1'>Con comisiones registradas</p>
            </CardContent>
          </Card>
        </div>

        {/* Filtros y búsqueda */}
        <CommissionsFilters
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
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
