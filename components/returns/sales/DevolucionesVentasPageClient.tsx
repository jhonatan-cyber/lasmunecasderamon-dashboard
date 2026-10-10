'use client';

import React, { useEffect, useState } from 'react';
import { useSales } from '@/hooks/caja/useSales';
import { useDevolucionFilters } from '@/hooks/servicios/useDevolucionFilters';
import { useDevolucionVentasLogic } from '@/hooks/servicios/useDevolucionVentasLogic';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Paginate from '@/components/shared/Paginate';
import { SalesDetailModal } from '@/components/sales';
import { anfitrionaColors, metodoPagoLabels } from '@/lib/business/salesUtils';
import { DevolucionHeader } from '@/components/returns/sales/DevolucionHeader';
import { DevolucionFilters } from '@/components/returns/DevolucionFilters';
import { DevolucionTable } from '@/components/returns/sales/DevolucionTable';
import { DevolucionModal } from '@/components/returns/sales/DevolucionModal';
import { formatCurrencyCLP } from '@/lib/utils/formatters';

import logger from '@/lib/utils/logger';

interface SolicitudAnulacion {
  id: string;
  venta_id: string;
  token: string;
  estado: string;
  motivo: string;
  monto: number;
  solicitado_por: string;
  fecha_solicitud: string;
  codigo?: string;
  cliente_nombre?: string;
  total?: number;
}

export function DevolucionesVentasPageClient() {
  const { ventas, loading, error, getVentas } = useSales();
  const { filters, updateFilter, clearFilters } = useDevolucionFilters();
  const {
    selectedVenta,
    isDetailModalOpen,
    isDevolucionModalOpen,
    motivoDevolucion,
    isSubmitting,
    setMotivoDevolucion,
    setIsDetailModalOpen,
    setIsDevolucionModalOpen,
    handleVerDetalles,
    confirmarDevolucion
  } = useDevolucionVentasLogic();

  const [solicitudes, setSolicitudes] = useState<SolicitudAnulacion[]>([]);
  const [loadingSolicitudes, setLoadingSolicitudes] = useState(true);
  const [activeTab, setActiveTab] = useState<'pendientes' | 'anuladas'>('pendientes');

  useEffect(() => {
    const fetchSolicitudes = async () => {
      try {
        const res = await fetch('/api/ventas/solicitud-anulacion?list=true');
        const data = await res.json();
        if (data.solicitudes) {
          setSolicitudes(data.solicitudes);
        }
      } catch (err) {
        logger.captureException(err, { context: 'DevolucionesVentasPageClient:fetchSolicitudes' });
      } finally {
        setLoadingSolicitudes(false);
      }
    };
    fetchSolicitudes();
  }, []);

  const handleProcesarSolicitud = async (
    solicitudId: string,
    status: 'confirmada' | 'rechazada'
  ) => {
    try {
      const res = await fetch('/api/ventas/anulacion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId: solicitudId, status })
      });
      const data = await res.json();
      if (data.success) {
        const res2 = await fetch('/api/ventas/solicitud-anulacion?list=true');
        const data2 = await res2.json();
        if (data2.solicitudes) {
          setSolicitudes(data2.solicitudes);
        }
      }
    } catch (err) {
      logger.captureException(err, { context: 'DevolucionesVentasPageClient:fetchDevoluciones' });
    }
  };

  const ventasAnuladas = ventas.filter(venta => venta.estado === 0);
  const filteredVentas = ventasAnuladas.filter(venta => {
    const matchesSearch =
      filters.searchTerm === '' ||
      venta.codigo?.toLowerCase().includes(filters.searchTerm.toLowerCase()) ||
      venta.cliente_nombre?.toLowerCase().includes(filters.searchTerm.toLowerCase()) ||
      venta.habitacion_numero?.toString().includes(filters.searchTerm);

    const matchesPayment =
      filters.paymentFilter === 'all' || venta.metodo_pago === filters.paymentFilter;

    return matchesSearch && matchesPayment;
  });

  const totalPages = Math.ceil(filteredVentas.length / filters.rowsPerPage);
  const startIndex = (filters.currentPage - 1) * filters.rowsPerPage;
  const endIndex = startIndex + filters.rowsPerPage;
  const paginatedVentas = filteredVentas.slice(startIndex, endIndex);

  useEffect(() => {
    getVentas();
  }, [getVentas]);

  if (error) {
    return (
      <div className='p-4 sm:p-6 lg:p-10 space-y-4 sm:space-y-6 mt-4 sm:mt-6 lg:mt-10'>
        <div className='bg-red-50 border border-red-200 rounded-lg p-4'>
          <p className='text-red-800 text-sm sm:text-base'>Error al cargar las ventas: {error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className='p-4 sm:p-6 lg:p-10 space-y-4 sm:space-y-6 mt-4 sm:mt-6 lg:mt-10'>
      <DevolucionHeader />

      {}
      <div className='flex justify-center gap-3 border-b pb-1 mb-4'>
        <button
          onClick={() => setActiveTab('pendientes')}
          className={`flex items-center gap-2 px-5 py-2 text-sm font-semibold transition-all ${
            activeTab === 'pendientes'
              ? 'bg-amber-100 text-amber-700 rounded-full shadow-xs'
              : 'text-gray-500 hover:bg-gray-100 rounded-full'
          }`}
        >
          Pendientes
          <span
            className={`ml-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold ${
              activeTab === 'pendientes' ? 'bg-amber-600 text-white' : 'bg-amber-100 text-amber-800'
            }`}
          >
            {solicitudes.length}
          </span>
        </button>
        <button
          onClick={() => setActiveTab('anuladas')}
          className={`flex items-center gap-2 px-5 py-2 text-sm font-semibold transition-all ${
            activeTab === 'anuladas'
              ? 'bg-green-100 text-green-700 rounded-full shadow-xs'
              : 'text-gray-500 hover:bg-gray-100 rounded-full'
          }`}
        >
          Anuladas
          <span
            className={`ml-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold ${
              activeTab === 'anuladas' ? 'bg-green-600 text-white' : 'bg-green-100 text-green-800'
            }`}
          >
            {filteredVentas.length}
          </span>
        </button>
      </div>

      {}
      {activeTab === 'pendientes' && (
        <Card className='shadow-xs'>
          <CardHeader className='p-4 sm:p-6'>
            <CardTitle className='text-lg sm:text-xl lg:text-2xl'>
              Solicitudes de Anulación Pendientes
            </CardTitle>
          </CardHeader>
          <CardContent className='p-4 sm:p-6'>
            {loadingSolicitudes ? (
              <div className='text-center py-8'>Cargando solicitudes...</div>
            ) : solicitudes.length === 0 ? (
              <div className='text-center py-8 text-gray-500'>
                No hay solicitudes de anulación pendientes
              </div>
            ) : (
              <div className='space-y-3'>
                {solicitudes.map(sol => (
                  <div
                    key={sol.id}
                    className='flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 border rounded-lg bg-gray-50 dark:bg-gray-900'
                  >
                    <div className='flex-1'>
                      <div className='font-bold text-lg'>Venta #{sol.codigo}</div>
                      <div className='text-sm text-gray-600 dark:text-gray-400'>
                        Cliente: {sol.cliente_nombre}
                      </div>
                      <div className='text-sm text-gray-600 dark:text-gray-400'>
                        Monto solicitado: {formatCurrencyCLP(sol.monto)}
                      </div>
                      <div className='text-sm text-gray-600 dark:text-gray-400'>
                        Motivo: {sol.motivo}
                      </div>
                      <div className='text-xs text-gray-500'>
                        Solicitado por: {sol.solicitado_por} - {sol.fecha_solicitud}
                      </div>
                    </div>
                    <div className='flex gap-2'>
                      <Button
                        size='sm'
                        variant='destructive'
                        onClick={() => handleProcesarSolicitud(sol.id, 'rechazada')}
                        className='flex-1 sm:flex-none text-xs sm:text-sm rounded-full'
                      >
                        Rechazar
                      </Button>
                      <Button
                        size='sm'
                        variant='default'
                        onClick={() => handleProcesarSolicitud(sol.id, 'confirmada')}
                        className='flex-1 sm:flex-none text-xs sm:text-sm rounded-full'
                      >
                        Aprobar
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {}
      {activeTab === 'anuladas' && (
        <>
          <DevolucionFilters
            filters={filters}
            updateFilter={updateFilter}
            clearFilters={clearFilters}
          />

          <Card className='shadow-xs'>
            <CardHeader className='p-4 sm:p-6'>
              <CardTitle className='text-lg sm:text-xl lg:text-2xl'>
                Ventas Anuladas ({filteredVentas.length})
              </CardTitle>
            </CardHeader>
            <CardContent className='p-4 sm:p-6'>
              <div className='overflow-x-auto'>
                <DevolucionTable
                  ventas={paginatedVentas}
                  loading={loading}
                  onVerDetalles={handleVerDetalles}
                />
              </div>

              {totalPages > 1 && (
                <div className='mt-4 sm:mt-6 flex justify-center'>
                  <Paginate
                    page={filters.currentPage}
                    totalPages={totalPages}
                    setPage={page => updateFilter('currentPage', page)}
                  />
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      <SalesDetailModal
        open={isDetailModalOpen}
        onOpenChange={setIsDetailModalOpen}
        selectedVenta={selectedVenta}
        anfitrionaColors={anfitrionaColors}
        metodoPagoLabels={metodoPagoLabels}
      />

      <DevolucionModal
        isOpen={isDevolucionModalOpen}
        onOpenChange={setIsDevolucionModalOpen}
        selectedVenta={selectedVenta}
        motivoDevolucion={motivoDevolucion}
        onMotivoChange={setMotivoDevolucion}
        onConfirmar={() => confirmarDevolucion(getVentas)}
        isSubmitting={isSubmitting}
      />
    </div>
  );
}
