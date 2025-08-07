'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSales } from '@/hooks/useSales';
import { VentaWithDetails } from '@/types/venta';
import { showErrorToast, showSuccessToast } from '@/lib/toastUtils';
import { useAnulacionContext } from '@/contexts/AnulacionContext';
import Paginate from '@/components/ui/paginate';

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

  // Memoizar la función de actualización
  const handleRefresh = useCallback(async () => {
    await getVentas();
    await getResumen();
  }, [getVentas, getResumen]);

  // Cargar datos iniciales
  useEffect(() => {
    handleRefresh();
  }, []); // Solo se ejecuta una vez al montar el componente

  // Configurar el callback de actualización para el contexto de anulación
  useEffect(() => {
    setRefreshCallback(() => handleRefresh);
  }, [setRefreshCallback]); // Solo dependemos de setRefreshCallback

  // Filtrar ventas
  const filteredVentas = filterVentas(ventas, searchTerm, statusFilter, paymentFilter);

  // Paginación
  const totalPages = Math.ceil(filteredVentas.length / rowsPerPage);
  const paginatedVentas = filteredVentas.slice((page - 1) * rowsPerPage, page * rowsPerPage);

  // Limpiar filtros
  const handleClearFilters = () => {
    setSearchTerm('');
    setStatusFilter('all');
    setPaymentFilter('all');
    setRowsPerPage(5); // Resetear a 5 elementos por página
    setPage(1);
  };

  // Ver detalles de venta
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

      {totalPages > 1 && (
        <div className='flex justify-center'>
          <Paginate page={page} totalPages={totalPages} setPage={setPage} />
        </div>
      )}

      <SalesDetailModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        selectedVenta={selectedVenta}
        anfitrionaColors={anfitrionaColors}
        metodoPagoLabels={metodoPagoLabels}
      />
    </div>
  );
}
