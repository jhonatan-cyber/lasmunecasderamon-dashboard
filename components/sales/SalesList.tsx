'use client';

import { VentaWithDetails } from '@/types/venta';
import { AnulacionModal } from './AnulacionModal';
import { useSalesList } from '@/hooks/ventas/useSalesList';
import { SalesListItem } from './SalesListItem';
import { SaleCardSkeleton, SalesListEmptyState } from './SalesListEmpty';

interface SalesListProps {
  loading: boolean;
  paginatedVentas: VentaWithDetails[];
  searchTerm: string;
  filterStatus: string;
  filterMetodoPago: string;
  statusColors: Record<number, string>;
  statusLabels: Record<number, string>;
  metodoPagoLabels: Record<string, string>;
  anfitrionaColors: string[];
  formatCurrency: (value: number) => string;
  onVerDetalles: (ventaId: string | number) => void;
  onAnularVenta: (ventaId: string | number, motivo: string, monto: number) => void;
  page: number;
  setPage: (value: number) => void;
  totalPages: number;
}

export function SalesList({
  loading,
  paginatedVentas,
  searchTerm,
  filterStatus,
  filterMetodoPago,
  statusLabels,
  metodoPagoLabels,
  anfitrionaColors,
  formatCurrency,
  onVerDetalles,
  onAnularVenta
}: SalesListProps) {
  const hasFilters = !!(searchTerm || filterStatus !== 'all' || filterMetodoPago !== 'all');
  const {
    anulacionModal,
    setAnulacionModal,
    canViewDetails,
    canAnular,
    hasAnyAction,
    handleAnularClick,
    handleConfirmarAnulacion
  } = useSalesList({ onAnularVenta });

  return (
    <>
      <div className='grid gap-4 grid-cols-1 md:grid-cols-2 xl:grid-cols-3'>
        {' '}
        {loading ? (
          Array.from({ length: 6 }).map((_, i) => <SaleCardSkeleton key={i} />)
        ) : paginatedVentas.length === 0 ? (
          <SalesListEmptyState hasFilters={hasFilters} />
        ) : (
          paginatedVentas.map((venta, index) => (
            <div key={venta.id || index}>
              <SalesListItem
                venta={venta}
                index={index}
                statusLabels={statusLabels}
                metodoPagoLabels={metodoPagoLabels}
                anfitrionaColors={anfitrionaColors}
                formatCurrency={formatCurrency}
                canViewDetails={canViewDetails}
                canAnular={canAnular}
                hasAnyAction={hasAnyAction}
                onVerDetalles={onVerDetalles}
                onAnularClick={handleAnularClick}
              />
            </div>
          ))
        )}
      </div>

      <AnulacionModal
        open={anulacionModal.open}
        onOpenChange={(open: boolean) => setAnulacionModal((prev: any) => ({ ...prev, open }))}
        onConfirm={handleConfirmarAnulacion}
        ventaInfo={anulacionModal.ventaInfo}
      />
    </>
  );
}
