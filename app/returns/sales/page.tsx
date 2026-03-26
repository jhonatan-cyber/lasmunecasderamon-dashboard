/* eslint-disable */
'use client';

import React, { useEffect } from 'react';
import { useSales } from '@/hooks/caja/useSales';
import { useDevolucionFilters } from '@/hooks/servicios/useDevolucionFilters';
import { useDevolucionVentasLogic } from '@/hooks/servicios/useDevolucionVentasLogic';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Paginate from '@/components/ui/paginate';
import { SalesDetailModal } from '@/components/sales';
import { anfitrionaColors, metodoPagoLabels } from '@/lib/business/salesUtils';
import { DevolucionHeader } from '@/components/returns/sales/DevolucionHeader';
import { DevolucionFiltersComponent } from '@/components/returns/sales/DevolucionFilters';
import { DevolucionTable } from '@/components/returns/sales/DevolucionTable';
import { DevolucionModal } from '@/components/returns/sales/DevolucionModal';

export default function DevolucionesVentasPage() {
  const { ventas, loading, error, getVentas } = useSales();
  const { filters, updateFilter, clearFilters } = useDevolucionFilters();
  const {
    selectedVenta,
    isDetailModalOpen,
    isDevolucionModalOpen,
    motivoDevolucion,
    setMotivoDevolucion,
    setIsDetailModalOpen,
    setIsDevolucionModalOpen,
    handleVerDetalles,
    confirmarDevolucion
  } = useDevolucionVentasLogic();

  // Filtrar ventas con estado 0 (anuladas)
  const ventasAnuladas = ventas.filter(venta => venta.estado === 0);

  // Filtrar por término de búsqueda y método de pago
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

  // Calcular paginación
  const totalPages = Math.ceil(filteredVentas.length / filters.rowsPerPage);
  const startIndex = (filters.currentPage - 1) * filters.rowsPerPage;
  const endIndex = startIndex + filters.rowsPerPage;
  const paginatedVentas = filteredVentas.slice(startIndex, endIndex);

  useEffect(() => {
    getVentas();
  }, []);

  const handleConfirmarDevolucion = () => {
    confirmarDevolucion(getVentas);
  };

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

      <DevolucionFiltersComponent
        filters={filters}
        updateFilter={updateFilter}
        clearFilters={clearFilters}
      />

      <Card className='shadow-sm'>
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

          {/* Paginación */}
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

      {/* Modal de Detalles */}
      <SalesDetailModal
        open={isDetailModalOpen}
        onOpenChange={setIsDetailModalOpen}
        selectedVenta={selectedVenta}
        anfitrionaColors={anfitrionaColors}
        metodoPagoLabels={metodoPagoLabels}
      />

      {/* Modal de Devolución */}
      <DevolucionModal
        isOpen={isDevolucionModalOpen}
        onOpenChange={setIsDevolucionModalOpen}
        selectedVenta={selectedVenta}
        motivoDevolucion={motivoDevolucion}
        onMotivoChange={setMotivoDevolucion}
        onConfirmar={handleConfirmarDevolucion}
      />
    </div>
  );
}
