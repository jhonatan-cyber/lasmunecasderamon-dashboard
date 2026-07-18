'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { formatCurrencyCLP } from '@/lib/utils/formatters';
import { useSales } from '@/hooks/caja/useSales';
import { useTimer } from '@/contexts/TimerContext';
import { useAvailableRooms } from '@/hooks/habitaciones';
import { useRefreshOnFocus } from '@/hooks/shared';
import { formatLongDateEs, formatShortTimeEs } from '@/lib/utils/calendarUtils';
import {
  OrderDetailInfoPanel,
  OrderDetailPaymentPanel,
} from '@/components/orders/detail';
import { useOrderDetailModalState } from '@/hooks/orders/useOrderDetailModalState';
import { useOrderDetailModal } from '@/hooks/orders/useOrderDetailModal';
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
  onOrderStatusChange,
}: OrderDetailModalProps) {
  const { rooms, refetchRooms } = useAvailableRooms();
  const { createVenta } = useSales();
  const { startTimer } = useTimer();
  const {
    state,
    setters,
    derived,
  } = useOrderDetailModalState({ open, detail, rooms, onClose });

  const {
    handleRegistrarVenta,
    handleConfirmRegistrarVenta,
    handleCancelRegistrarVenta,
    handleRechazarPedido,
    handleRegistrarCuenta,
    shouldShowRoomSelector,
    hasRoomSelectedInOrder,
    isClienteRegistrado,
    isRegistering,
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
    derived,
  });

  useRefreshOnFocus(refetchRooms, { enabled: open });

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className='flex max-h-[90vh] w-[95vw] max-w-[95vw] flex-col border border-border/60 bg-white p-0 sm:w-4xl sm:max-w-3xl dark:border-zinc-800 dark:bg-zinc-950'>
        <DialogHeader className='shrink-0 border-b border-border/60 px-4 pb-4 pt-4 sm:px-6 sm:pt-6 dark:border-zinc-800'>
          <DialogTitle className='text-lg text-gray-900 dark:text-zinc-100 sm:text-xl'>
            Detalles del Pedido - {orderCode}
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className='py-8 text-center text-gray-700 dark:text-zinc-300 sm:py-12'>
            <div className='text-sm sm:text-base'>Cargando detalles...</div>
          </div>
        ) : error ? (
          <div className='py-8 text-center text-gray-700 dark:text-zinc-300 sm:py-12'>
            <div className='text-red-500 text-sm sm:text-base'>{error}</div>
          </div>
        ) : detail && detail.length > 0 ? (
          <>
            <div className='flex-1 overflow-y-auto px-4 sm:px-6 py-4'>
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
                    showMetodoPagoError={state.showMetodoPagoError}
                    shouldShowRoomSelector={shouldShowRoomSelector}
                    habitacionesActivas={derived.habitacionesActivas}
                    habitacionId={state.habitacionId}
                    setHabitacionId={setters.setHabitacionId}
                    hasRoomSelectedInOrder={hasRoomSelectedInOrder}
                    tiempoHabitacion={state.tiempoHabitacion}
                    setTiempoHabitacion={setters.setTiempoHabitacion}
                    propinaDisplayValue={state.propinaDisplayValue}
                    agregarPropina={state.agregarPropina}
                    setAgregarPropina={setters.setAgregarPropina}
                    propina={state.propina}
                    orderTotalCommission={detail[0]?.total_comision || 0}
                  />
                </div>

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

      {/* Confirm Sale Dialog */}
      <Dialog open={state.confirmVentaModalOpen} onOpenChange={setters.setConfirmVentaModalOpen}>
        <DialogContent className='sm:max-w-md border border-border/60 bg-white dark:border-zinc-800 dark:bg-zinc-950'>
          <DialogHeader>
            <DialogTitle className='text-gray-900 dark:text-zinc-100'>
              Confirmar registro de venta
            </DialogTitle>
            <DialogDescription className='text-gray-600 dark:text-zinc-400'>
              ¿Estás seguro de que deseas registrar esta venta?
            </DialogDescription>
          </DialogHeader>
          <div className='px-6 py-4 text-gray-800 dark:text-zinc-200'>
            <div className='space-y-2 text-sm'>
              <div>
                <strong>Pedido:</strong> {orderCode}
              </div>
              <div>
                <strong>Total:</strong>{' '}
                {formatCurrencyCLP((detail[0]?.total || 0) + state.propina + derived.recargoAnfitrionas)}
              </div>
              <div>
                <strong>Método de pago:</strong> {state.metodoPago}
              </div>
              {state.propina > 0 && (
                <div>
                  <strong>Propina:</strong> {formatCurrencyCLP(state.propina)}
                </div>
              )}
              {shouldShowRoomSelector && state.habitacionId && (
                <>
                  <div>
                    <strong>Habitación:</strong>{' '}
                    {rooms.find((r: any) => r.id === parseInt(state.habitacionId))?.name || state.habitacionId}
                  </div>
                  <div>
                    <strong>Tiempo:</strong> {state.tiempoHabitacion} minutos
                  </div>
                </>
              )}
            </div>
          </div>
          <DialogFooter className='flex justify-center items-center gap-3 sm:justify-center'>
            <Button
              variant='outline'
              onClick={(e) => {
                e.preventDefault();
                handleCancelRegistrarVenta();
              }}
              disabled={state.isRegistering}
              className='rounded-full dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800'
              type='button'
            >
              Cancelar
            </Button>
            <Button
              variant='outline'
              onClick={handleConfirmRegistrarVenta}
              disabled={state.isRegistering}
              className='rounded-full bg-green-600 text-white hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-400'
              type='button'
            >
              {state.isRegistering ? (
                <>
                  <div className='animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2' />
                  Registrando...
                </>
              ) : (
                'Confirmar'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}
