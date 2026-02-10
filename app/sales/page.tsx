'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSales } from '@/hooks/caja/useSales';
import { VentaWithDetails } from '@/types/venta';
import { showErrorToast, showSuccessToast } from '@/lib/toastUtils';
import { useAnulacionContext } from '@/contexts/AnulacionContext';
import Paginate from '@/components/ui/paginate';
import { PermissionGuard } from '@/components/auth/PermissionGuard';

import {
  SalesHeader,
  SalesStatsCard,
  SalesFilters,
  SalesList,
  SalesDetailModal,
  SalesError,
  CajaStatusBanner
} from '@/components/sales';
import {
  filterVentas,
  solicitarAnulacionVenta,
  getVentaDetails,
  formatCurrency,
  statusColors,
  statusLabels,
  metodoPagoLabels,
  anfitrionaColors
} from '@/lib/salesUtils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import SalesWithRoomTab from '@/components/sales/SalesWithRoomTab';

export default function Sales() {
  const { ventas, loading, error, getVentas, getResumen } = useSales();
  const { setRefreshCallback } = useAnulacionContext();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [paymentFilter, setPaymentFilter] = useState<string>('all');
  const [selectedVenta, setSelectedVenta] = useState<VentaWithDetails | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [rowsPerPage, setRowsPerPage] = useState(5);
  const [page, setPage] = useState(1);


  const handleRefresh = useCallback(async () => {
    await getVentas();
    await getResumen();
  }, [getVentas, getResumen]);

 
  useEffect(() => {
    handleRefresh();
  }, []); 

  // Escuchar evento de venta registrada para refrescar automáticamente
  useEffect(() => {
    const handleVentaRegistrada = () => {
      console.log('[Sales] Evento ventaRegistrada recibido - refrescando ventas');
      handleRefresh();
    };

    window.addEventListener('ventaRegistrada', handleVentaRegistrada);
    
    return () => {
      window.removeEventListener('ventaRegistrada', handleVentaRegistrada);
    };
  }, [handleRefresh]);

 
  useEffect(() => {
    setRefreshCallback(() => handleRefresh);
  }, [setRefreshCallback]); 

  
  const filteredVentas = filterVentas(ventas, searchTerm, statusFilter, paymentFilter);

  
  const totalPages = Math.ceil(filteredVentas.length / rowsPerPage);
  const paginatedVentas = filteredVentas.slice((page - 1) * rowsPerPage, page * rowsPerPage);

  
  const handleClearFilters = () => {
    setSearchTerm('');
    setStatusFilter('all');
    setPaymentFilter('all');
    setRowsPerPage(5); 
    setPage(1);
  };

  
  const handleViewDetails = async (ventaId: number) => {
    try {
      const ventaDetails = await getVentaDetails(ventaId, ventas);
      setSelectedVenta(ventaDetails);
      setIsModalOpen(true);
    } catch (error) {
      showErrorToast('Error al cargar los detalles de la venta');
    }
  };

  // Solicitar anulación de venta
  const handleAnularVenta = async (ventaId: number, motivo?: string) => {
    try {
      // Primero verificar autenticación
      const authResponse = await fetch('/api/test-auth');
      if (!authResponse.ok) {
        showErrorToast('Sesión expirada. Por favor, inicia sesión nuevamente.');
        return;
      }

      const result = await solicitarAnulacionVenta(ventaId, motivo);
      if (result.success) {
        showSuccessToast('Solicitud de anulación enviada al administrador');
        await handleRefresh();
      } else {
        // Manejar diferentes tipos de errores
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
      console.error('Error al solicitar anulación:', error);
      showErrorToast('Error de conexión. Verifica tu conexión a internet.');
    }
  };

  if (error) {
    return <SalesError error={error} onRetry={handleRefresh} />;
  }

  return (
    <PermissionGuard module="ventas" action="listar">
      <div className='p-4 sm:p-6 lg:p-10 space-y-4 sm:space-y-6 mt-4 sm:mt-6 lg:mt-10'>
      <SalesHeader loading={loading} onRefresh={handleRefresh} />

      <CajaStatusBanner />

      <SalesStatsCard />

      <SalesFilters
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        filterStatus={statusFilter}
        setFilterStatus={setStatusFilter}
        filterMetodoPago={paymentFilter}
        setFilterMetodoPago={setPaymentFilter}
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
          <div className='overflow-x-auto'>
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
          </div>

          {filteredVentas.length > rowsPerPage && (
            <div className='flex justify-center'>
              <Paginate page={page} totalPages={totalPages} setPage={setPage} />
            </div>
          )}
        </TabsContent>

        <TabsContent value='with-room'>
          <SalesWithRoomTab
            ventas={filteredVentas as VentaWithDetails[]}
            loading={loading}
            onRefresh={handleRefresh}
          />
        </TabsContent>
      </Tabs>

      <SalesDetailModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        selectedVenta={selectedVenta}
        anfitrionaColors={anfitrionaColors}
        metodoPagoLabels={metodoPagoLabels}
      />
    </div>
    </PermissionGuard>
  );
}
