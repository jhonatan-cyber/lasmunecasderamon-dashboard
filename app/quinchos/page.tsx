'use client';

import { useMemo, useState } from 'react';
import { Flame } from 'lucide-react';
import { PermissionGuard } from '@/components/auth/PermissionGuard';
import { CajaStatusBanner } from '@/components/sales/CajaStatusBanner';
import { QuinchosCalendar } from '@/components/quinchos/QuinchosCalendar';
import { ReservaQuinchoDetalleModal } from '@/components/quinchos/ReservaQuinchoDetalleModal';
import { ReservaQuinchoModal } from '@/components/quinchos/ReservaQuinchoModal';
import { useCashRegisterStatus } from '@/hooks/cash-register/useCashRegisterStatus';
import { useQuinchos } from '@/hooks/quinchos/useQuinchos';
import { useUserPermissions } from '@/hooks/auth/useUserPermissions';
import { toDateKey } from '@/lib/utils/calendarUtils';
import type { ReservaQuincho } from '@/types/quincho';

export default function QuinchosPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [fechaSeleccionada, setFechaSeleccionada] = useState<string | null>(null);
  const [fechaDetalle, setFechaDetalle] = useState<string | null>(null);
  const { hasOpenCaja, loading: cajaLoading } = useCashRegisterStatus();
  const { hasPermission, isLoading: permisosCargando } = useUserPermissions();
  const { reservas, clientes, isLoading, isSaving, isCancelling, crearReserva, anularReserva } =
    useQuinchos();

  // El detalle lee las reservas vivas: al anular, el listado refetcheado se
  // refleja solo y la reserva pasa a mostrarse como anulada.
  const reservasDelDetalle = useMemo(
    () =>
      fechaDetalle
        ? reservas.filter(reserva => toDateKey(reserva.fecha_reserva) === fechaDetalle)
        : [],
    [reservas, fechaDetalle]
  );

  const cajaCerrada = !cajaLoading && !hasOpenCaja;
  // Mientras cargan los permisos no se bloquea el registro: la API lo valida igual.
  const puedeCrear = permisosCargando || hasPermission('quinchos', 'create');

  /**
   * Un día ocupado abre el detalle de sus reservas; un día libre abre el
   * registro con esa fecha ya cargada.
   */
  const handleSelectDay = (fecha: string, reservasDelDia: ReservaQuincho[]) => {
    const activas = reservasDelDia.filter(reserva => reserva.estado === 'activa');
    if (activas.length > 0 || !puedeCrear) {
      setFechaDetalle(fecha);
      return;
    }
    setFechaSeleccionada(fecha);
    setModalOpen(true);
  };

  return (
    <PermissionGuard module='quinchos' action='view'>
      <div className='p-4 sm:p-6 lg:p-10 space-y-4 sm:space-y-6 mt-4 sm:mt-6 lg:mt-10'>
        <header>
          <h1 className='flex items-center gap-2 text-xl font-bold text-gray-900 dark:text-neutral-100 sm:text-2xl lg:text-3xl'>
            <Flame className='h-6 w-6 text-orange-500' />
            Reservas de Quincho
          </h1>
          <p className='text-sm text-gray-600 dark:text-neutral-400 sm:text-base'>
            Cada reserva cobra el total de personas × monto por persona y lo acredita al prepago del
            cliente.
          </p>
        </header>

        <CajaStatusBanner entityName='reservas de quincho' />

        <QuinchosCalendar reservas={reservas} isLoading={isLoading} onSelectDay={handleSelectDay} />

        <ReservaQuinchoModal
          open={modalOpen}
          onOpenChange={setModalOpen}
          clientes={clientes}
          cajaCerrada={cajaCerrada}
          isSaving={isSaving}
          fechaInicial={fechaSeleccionada ?? undefined}
          onSubmit={crearReserva}
        />

        <ReservaQuinchoDetalleModal
          open={fechaDetalle !== null}
          onOpenChange={open => !open && setFechaDetalle(null)}
          fecha={fechaDetalle}
          reservas={reservasDelDetalle}
          canCancel={hasPermission('quinchos', 'delete')}
          isCancelling={isCancelling}
          onCancel={anularReserva}
        />
      </div>
    </PermissionGuard>
  );
}
