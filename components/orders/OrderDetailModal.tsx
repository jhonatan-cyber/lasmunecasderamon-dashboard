'use client';

import { ErrorState } from '@/components/shared/ErrorState';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useSales } from '@/hooks/cash-register/useSales';
import { useTimer } from '@/contexts/TimerContext';
import { useAvailableRooms } from '@/hooks/rooms';
import { useRefreshOnFocus } from '@/hooks/shared';
import { formatLongDateEs, formatShortTimeEs } from '@/lib/utils/calendarUtils';
import {
  OrderBaucherPanel,
  OrderDetailInfoPanel,
  OrderDetailPaymentPanel
} from '@/components/orders/detail';
import { useOrderDetailModalState } from '@/hooks/orders/useOrderDetailModalState';
import { useOrderDetailModal } from '@/hooks/orders/useOrderDetailModal';
import { ConfirmSaleDialog } from './ConfirmSaleDialog';
import { OrderProducts } from './OrderProducts';
import { OrderTimeline } from './OrderTimeline';

interface OrderDetailModalProps {
  open: boolean;
  onClose: () => void;
  detail: any[];
  isLoading: boolean;
  error: string | null;
  orderId?: string | null;
  orderCode?: string;
  onVentaRegistrada?: () => void;
  onOrderStatusChange?: () => void;
}

export default function OrderDetailModal({
  open,
  onClose,
  detail,
  isLoading,
  error,
  orderId,
  orderCode,
  onVentaRegistrada,
  onOrderStatusChange
}: OrderDetailModalProps) {
  const { rooms, refetchRooms } = useAvailableRooms();
  const { createVenta } = useSales();
  const { startTimer } = useTimer();
  const { state, setters, derived } = useOrderDetailModalState({ open, detail, rooms, onClose });

  const {
    handleRegistrarVenta,
    handleConfirmRegistrarVenta,
    handleCancelRegistrarVenta,
    handleRechazarPedido,
    handleRegistrarCuenta,
    shouldShowRoomSelector,
    isClienteRegistrado,
    isRegistering
  } = useOrderDetailModal({
    open,
    onClose,
    detail,
    orderId,
    orderCode,
    onVentaRegistrada,
    onOrderStatusChange,
    rooms,
    createVenta,
    startTimer,
    state,
    setters,
    derived
  });

  useRefreshOnFocus(refetchRooms, { enabled: open });

  const totalConfirmar = (detail[0]?.total || 0) + state.propina + derived.recargoAnfitrionas;
  const nombreHabitacion =
    shouldShowRoomSelector && state.habitacionId
      ? rooms.find((r: any) => String(r.id_habitacion ?? r.id) === state.habitacionId)?.name ||
        state.habitacionId
      : undefined;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className='flex max-h-[94dvh] w-[calc(100vw-1rem)] max-w-5xl flex-col overflow-hidden border border-border/60 bg-white p-0 [&>button]:top-3 [&>button]:right-3 [&>button]:flex [&>button]:h-10 [&>button]:w-10 [&>button]:items-center [&>button]:justify-center [&>button]:rounded-full [&>button:hover]:bg-accent sm:w-[calc(100vw-3rem)] dark:border-zinc-800 dark:bg-zinc-950'>
        <DialogHeader className='shrink-0 border-b border-border/60 px-4 pt-4 pb-4 pr-14 text-left sm:px-6 sm:pt-6 dark:border-zinc-800'>
          <DialogTitle className='text-lg text-gray-900 dark:text-zinc-100 sm:text-xl'>
            Detalles del Pedido - {orderCode}
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className='py-8 text-center text-gray-700 dark:text-zinc-300 sm:py-12'>
            <div aria-live='polite' className='text-sm sm:text-base'>
              Cargando detalles...
            </div>
          </div>
        ) : error ? (
          <div className='py-8 text-center text-gray-700 dark:text-zinc-300 sm:py-12'>
            <ErrorState message={error} />
          </div>
        ) : detail && detail.length > 0 ? (
          <>
            <div className='min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 sm:px-6'>
              <div className='space-y-6'>
                {/* Info Panels */}
                <div className='grid grid-cols-1 lg:grid-cols-2 gap-6'>
                  <OrderDetailInfoPanel
                    createdAt={`${formatLongDateEs(detail[0]?.fecha_crea)} ${formatShortTimeEs(detail[0]?.fecha_crea)}`}
                    code={detail[0]?.codigo}
                    hostessName={detail[0]?.anfitriona}
                    clientName={detail[0]?.cliente}
                    garzonName={detail[0]?.garzon}
                    hasChampagneProducts={derived.hasChampagneProducts}
                    cantidadAnfitrionas={derived.cantidadAnfitrionas}
                    maxAnfitrionas={derived.maxAnfitrionas}
                  />
                  <OrderDetailPaymentPanel
                    metodoPago={state.metodoPago}
                    setMetodoPago={setters.setMetodoPago}
                    habitacionesActivas={derived.habitacionesActivas}
                    habitacionId={state.habitacionId}
                    tiempoHabitacion={state.tiempoHabitacion}
                    setTiempoHabitacion={setters.setTiempoHabitacion}
                    propina={state.propina}
                    propinaOriginal={state.propinaOriginal}
                    propinaPct={state.propinaPct}
                    agregarPropina={state.agregarPropina}
                    setAgregarPropina={setters.setAgregarPropina}
                    clienteId={state.clienteId}
                    clienteSaldo={state.clienteSaldo}
                    totalFinal={totalConfirmar}
                    orderTotalCommission={detail[0]?.total_comision || 0}
                  />
                </div>

                {/* Baucher del pedido: sólo existe cuando se cobró con transferencia */}
                {detail[0]?.baucher_foto && (
                  <OrderBaucherPanel
                    orderId={String(detail[0].id_pedido)}
                    codigo={detail[0]?.codigo}
                  />
                )}

                {/* Products Table */}
                <OrderProducts
                  detail={detail}
                  propina={state.propina}
                  recargoAnfitrionas={derived.recargoAnfitrionas}
                />
              </div>
            </div>

            {/* Timeline Actions */}
            <OrderTimeline
              isRegistering={isRegistering}
              isClienteRegistrado={isClienteRegistrado()}
              onRegistrarVenta={handleRegistrarVenta}
              onRegistrarCuenta={handleRegistrarCuenta}
              onClose={onClose}
            />
          </>
        ) : (
          <div className='py-8 text-center text-gray-700 dark:text-zinc-300 sm:py-12'>
            <div className='text-sm text-gray-500 dark:text-zinc-400 sm:text-base'>
              No hay detalles disponibles
            </div>
          </div>
        )}
      </DialogContent>

      <ConfirmSaleDialog
        open={state.confirmVentaModalOpen}
        onOpenChange={setters.setConfirmVentaModalOpen}
        onCancel={handleCancelRegistrarVenta}
        onConfirm={handleConfirmRegistrarVenta}
        isRegistering={state.isRegistering}
        orderCode={orderCode}
        cliente={isClienteRegistrado() ? detail[0]?.cliente : undefined}
        totalPedido={detail[0]?.total || 0}
        propina={state.propina}
        recargoAnfitrionas={derived.recargoAnfitrionas}
        total={totalConfirmar}
        metodoPago={state.metodoPago}
        habitacion={nombreHabitacion}
        tiempoHabitacion={state.tiempoHabitacion}
      />
    </Dialog>
  );
}
