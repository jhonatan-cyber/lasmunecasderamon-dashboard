'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSales } from '@/hooks/caja/useSales';
import { useHabitaciones } from '@/hooks/habitaciones/useHabitaciones';
import { useTimer } from '@/contexts/TimerContext';
import { VentaWithDetails } from '@/types/venta';
import { showErrorToast, showSuccessToast } from '@/lib/utils/toastUtils';
import { useAnulacionContext } from '@/contexts/AnulacionContext';
import Paginate from '@/components/shared/Paginate';
import { PermissionGuard } from '@/components/auth/PermissionGuard';

import logger from '@/lib/utils/logger';
import { appEventBus } from '@/lib/utils/eventBus';

import {
  SalesHeader,
  SalesStatsCards,
  SalesFilters,
  SalesList,
  SalesError,
  CajaStatusBanner
} from '@/components/sales';
import {
  filterVentas,
  sortVentas,
  solicitarAnulacionVenta,
  getVentaDetails,
  formatCurrency,
  statusColors,
  statusLabels,
  metodoPagoLabels,
  anfitrionaColors
} from '@/lib/business/salesUtils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import SalesWithRoomTab from '@/components/sales/SalesWithRoomTab';
import { SalesSkeleton } from '@/components/shared/Skeletons';
import dynamic from 'next/dynamic';
import { useRefreshOnFocus } from '@/hooks/shared';

const SalesDetailModal = dynamic(
  () => import('@/components/sales/SalesDetailModal').then(mod => mod.SalesDetailModal),
  { ssr: false }
);

export default function Sales() {
  const { ventas, loading, error, getVentas, getResumen } = useSales();
  const { setRefreshCallback } = useAnulacionContext();
  const { setRefreshCallback: setTimerRefreshCallback } = useTimer();
  const { getHabitaciones } = useHabitaciones();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [paymentFilter, setPaymentFilter] = useState<string>('all');
  const [selectedVenta, setSelectedVenta] = useState<VentaWithDetails | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [rowsPerPage, setRowsPerPage] = useState(5);
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState('fecha_crea');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const handleRefresh = useCallback(async () => {
    await Promise.all([getVentas(), getResumen(), getHabitaciones()]);
  }, [getHabitaciones, getResumen, getVentas]);

  useEffect(() => {
    handleRefresh();
  }, [handleRefresh]);
  useRefreshOnFocus(handleRefresh);

  useEffect(() => {
    const refresh = () => handleRefresh();
    const unsub1 = appEventBus.on('ventaRegistrada', refresh);
    const unsub2 = appEventBus.on('updateSales', refresh);
    const unsub3 = appEventBus.on('timer_ended_event', refresh);
    return () => {
      unsub1();
      unsub2();
      unsub3();
    };
  }, [handleRefresh]);

  useEffect(() => {
    setRefreshCallback(() => handleRefresh);
    setTimerRefreshCallback(() => handleRefresh);
  }, [handleRefresh, setRefreshCallback, setTimerRefreshCallback]);

  const filteredVentas = filterVentas(ventas, searchTerm, statusFilter, paymentFilter);
  const sortedAndFilteredVentas = sortVentas(filteredVentas, sortBy, sortOrder);

  const totalPages = Math.ceil(sortedAndFilteredVentas.length / rowsPerPage);
  const paginatedVentas = sortedAndFilteredVentas.slice(
    (page - 1) * rowsPerPage,
    page * rowsPerPage
  );

  const handleClearFilters = () => {
    setSearchTerm('');
    setStatusFilter('all');
    setPaymentFilter('all');
    setSortBy('fecha_crea');
    setSortOrder('desc');
    setRowsPerPage(5);
    setPage(1);
  };

  const handleViewDetails = async (ventaId: string | number) => {
    try {
      const ventaDetails = await getVentaDetails(ventaId, ventas);
      setSelectedVenta(ventaDetails);
      setIsModalOpen(true);
    } catch (error) {
      showErrorToast('Error al cargar los detalles de la venta');
    }
  };

  const handleAnularVenta = async (ventaId: string | number, motivo: string, monto: number) => {
    try {
      const authResponse = await fetch('/api/test-auth');
      if (!authResponse.ok) {
        showErrorToast('Sesión expirada. Por favor, inicia sesión nuevamente.');
        return;
      }

      const result = await solicitarAnulacionVenta(ventaId, motivo, monto);
      if (result.success) {
        showSuccessToast('Solicitud de anulación enviada al administrador');
        await handleRefresh();
      } else {
        if (result.error?.includes('401') || result.error?.includes('Token')) {
          showErrorToast('Sesión expirada. Por favor, inicia sesión nuevamente.');
        } else if (result.error?.includes('404')) {
          showErrorToast('Venta no encontrada');
        } else if (result.error?.includes('400')) {
          showErrorToast(result.error || 'La venta no puede ser anulada');
        } else if (result.error?.includes('500')) {
          showErrorToast('Error del servidor. Intenta nuevamente.');
        } else {
          showErrorToast(result.error || 'Error al solicitar la anulación');
        }
      }
    } catch (error) {
      logger.captureException(error, { context: 'Sales:fetchSales' });
      showErrorToast('Error de conexión. Verifica tu conexión a internet.');
    }
  };

  if (error) {
    return <SalesError error={error} onRetry={handleRefresh} />;
  }

  return (
    <PermissionGuard module='sales' action='view'>
      <div className='p-4 sm:p-6 lg:p-10 space-y-4 sm:space-y-6 mt-4 sm:mt-6 lg:mt-10'>
        <CajaStatusBanner />
        <SalesHeader loading={loading} onRefresh={handleRefresh} />

        {loading && ventas.length === 0 ? (
          <SalesSkeleton />
        ) : (
          <>
            <SalesStatsCards ventas={ventas} />

            <SalesFilters
              searchTerm={searchTerm}
              setSearchTerm={setSearchTerm}
              filterStatus={statusFilter}
              setFilterStatus={setStatusFilter}
              filterMetodoPago={paymentFilter}
              setFilterMetodoPago={setPaymentFilter}
              sortBy={sortBy}
              setSortBy={setSortBy}
              sortOrder={sortOrder}
              setSortOrder={setSortOrder}
              onClearFilters={handleClearFilters}
              rowsPerPage={rowsPerPage}
              setRowsPerPage={setRowsPerPage}
              setPage={setPage}
            />

            <Tabs defaultValue='all' className='w-full'>
              <TabsList className='grid w-full grid-cols-2 mb-6 p-1 bg-gray-200/80 dark:bg-slate-800/80 rounded-full max-w-md mx-auto border dark:border-slate-700 shadow-sm'>
                <TabsTrigger
                  value='all'
                  className='rounded-full data-[state=active]:bg-black data-[state=active]:text-white dark:data-[state=active]:bg-white dark:data-[state=active]:text-black transition-all'
                >
                  Todas las ventas
                </TabsTrigger>
                <TabsTrigger
                  value='with-room'
                  className='rounded-full data-[state=active]:bg-black data-[state=active]:text-white dark:data-[state=active]:bg-white dark:data-[state=active]:text-black transition-all'
                >
                  Ventas con habitación
                </TabsTrigger>
              </TabsList>

              <TabsContent value='all' className='space-y-4'>
                <SalesList
                  loading={loading}
                  paginatedVentas={paginatedVentas}
                  searchTerm={searchTerm}
                  filterStatus={statusFilter}
                  filterMetodoPago={paymentFilter}
                  statusColors={statusColors}
                  statusLabels={statusLabels}
                  metodoPagoLabels={metodoPagoLabels}
                  anfitrionaColors={anfitrionaColors}
                  formatCurrency={formatCurrency}
                  onVerDetalles={handleViewDetails}
                  onAnularVenta={handleAnularVenta}
                  page={page}
                  setPage={setPage}
                  totalPages={totalPages}
                />

                {filteredVentas.length > rowsPerPage && (
                  <div className='flex justify-center'>
                    <Paginate page={page} totalPages={totalPages} setPage={setPage} />
                  </div>
                )}
              </TabsContent>

              <TabsContent value='with-room'>
                <SalesWithRoomTab
                  ventas={sortedAndFilteredVentas as VentaWithDetails[]}
                  loading={loading}
                  onRefresh={handleRefresh}
                  onVerDetalles={handleViewDetails}
                />
              </TabsContent>
            </Tabs>
          </>
        )}
      </div>

      <SalesDetailModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        selectedVenta={selectedVenta}
        anfitrionaColors={anfitrionaColors}
        metodoPagoLabels={metodoPagoLabels}
      />
    </PermissionGuard>
  );
}
