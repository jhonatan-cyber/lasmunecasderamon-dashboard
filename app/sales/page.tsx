'use client';
import { Button } from '@/components/ui/button';

import { useState, useEffect, useCallback } from 'react';
import { useSales } from '@/hooks/cash-register/useSales';
import { useHabitaciones } from '@/hooks/rooms/useHabitaciones';
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
import { useCashRegisterStatus } from '@/hooks/cash-register/useCashRegisterStatus';
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
import SalesWithRoomTab from '@/components/sales/SalesWithRoomTab';
import { Skeleton as BoneyardSkeleton } from 'boneyard-js/react';
import dynamic from 'next/dynamic';
import { useRefreshOnFocus } from '@/hooks/shared';
import {
  closeSaleReceiptWindow,
  openSaleReceiptWindow,
  printSaleReceipt
} from '@/lib/utils/printSaleReceipt';

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
  const [salesTab, setSalesTab] = useState('all');

  const { hasOpenCaja, loading: cajaLoading } = useCashRegisterStatus();

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

  const handlePrintSale = async (venta: VentaWithDetails) => {
    const printWindow = openSaleReceiptWindow();
    if (!printWindow) {
      showErrorToast(
        'El navegador bloqueó la ventana de impresión. Permite ventanas emergentes e inténtalo nuevamente.'
      );
      return;
    }

    try {
      const response = await fetch(`/api/sales/${encodeURIComponent(String(venta.id))}`);
      const result = await response.json();
      if (!response.ok || !result.success || !result.data) {
        throw new Error(result.message || 'No se pudo cargar el detalle de la venta');
      }

      const detail = result.data as VentaWithDetails;
      const origin =
        detail.origen ||
        (detail.entrada_id
          ? 'entrada'
          : detail.servicio_id
            ? 'servicio'
            : detail.habitacion_id
              ? 'habitacion'
              : detail.pedido_id
                ? 'pedido'
                : 'barra');
      const originLabels: Record<string, string> = {
        entrada: 'Entrada',
        servicio: 'Servicio',
        habitacion: 'Habitación',
        pedido: 'Pedido',
        barra: 'Barra'
      };
      printSaleReceipt(printWindow, {
        code: detail.codigo,
        date: detail.fecha_crea,
        customer: detail.cliente_nombre,
        location: detail.habitacion_numero || detail.habitacion_nombre,
        paymentMethod: metodoPagoLabels[detail.metodo_pago] || detail.metodo_pago,
        origin: originLabels[origin] || origin,
        subtotal: Number(detail.sub_total ?? 0),
        tip: Number(detail.propina ?? 0),
        total: Number(detail.total ?? 0),
        lines: (detail.detalles ?? []).map(item => ({
          name: item.producto_nombre || item.producto_etiqueta || 'Producto',
          quantity: Number(item.cantidad ?? 0),
          unitPrice: Number(item.precio ?? 0),
          subtotal: Number(item.sub_total ?? Number(item.precio ?? 0) * Number(item.cantidad ?? 0)),
          detail: item.presentacion_nombre || undefined
        }))
      });
    } catch (error) {
      closeSaleReceiptWindow(printWindow);
      showErrorToast(error instanceof Error ? error.message : 'No se pudo imprimir el ticket');
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
        <SalesHeader
          loading={loading}
          onRefresh={handleRefresh}
          cajaDisabled={cajaLoading || !hasOpenCaja}
        />

        <BoneyardSkeleton name='sales-main' loading={loading && ventas.length === 0}>
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

            <div className='flex justify-center gap-3 border-b pb-1 mb-6'>
              <Button
                variant='unstyled'
                onClick={() => setSalesTab('all')}
                className={`flex items-center gap-2 px-5 py-2 text-sm font-semibold transition-all ${
                  salesTab === 'all'
                    ? 'bg-amber-100 text-amber-700 rounded-full shadow-xs'
                    : 'text-gray-500 hover:bg-gray-100 rounded-full'
                }`}
              >
                Todas las ventas
              </Button>
              <Button
                variant='unstyled'
                onClick={() => setSalesTab('with-room')}
                className={`flex items-center gap-2 px-5 py-2 text-sm font-semibold transition-all ${
                  salesTab === 'with-room'
                    ? 'bg-green-100 text-green-700 rounded-full shadow-xs'
                    : 'text-gray-500 hover:bg-gray-100 rounded-full'
                }`}
              >
                Ventas con habitación
              </Button>
            </div>

            {salesTab === 'all' && (
              <div className='space-y-4'>
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
                  onImprimir={handlePrintSale}
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
              </div>
            )}

            {salesTab === 'with-room' && (
              <SalesWithRoomTab
                ventas={sortedAndFilteredVentas as VentaWithDetails[]}
                loading={loading}
                onRefresh={handleRefresh}
                onVerDetalles={handleViewDetails}
              />
            )}
          </>
        </BoneyardSkeleton>
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
