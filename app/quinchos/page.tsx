'use client';

import { useState } from 'react';
import { Flame, Plus } from 'lucide-react';
import { PermissionGuard } from '@/components/auth/PermissionGuard';
import { CajaStatusBanner } from '@/components/sales/CajaStatusBanner';
import { Button } from '@/components/ui/button';
import { QuinchosTable } from '@/components/quinchos/QuinchosTable';
import { ReservaQuinchoModal } from '@/components/quinchos/ReservaQuinchoModal';
import { useCashRegisterStatus } from '@/hooks/cash-register/useCashRegisterStatus';
import { useQuinchos } from '@/hooks/quinchos/useQuinchos';
import { useUserPermissions } from '@/hooks/auth/useUserPermissions';

export default function QuinchosPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const { hasOpenCaja, loading: cajaLoading } = useCashRegisterStatus();
  const { hasPermission } = useUserPermissions();
  const { reservas, clientes, isLoading, isSaving, isCancelling, crearReserva, anularReserva } =
    useQuinchos();

  const cajaCerrada = !cajaLoading && !hasOpenCaja;

  return (
    <PermissionGuard module='quinchos' action='view'>
      <div className='p-4 sm:p-6 lg:p-10 space-y-4 sm:space-y-6 mt-4 sm:mt-6 lg:mt-10'>
        <header className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
          <div>
            <h1 className='flex items-center gap-2 text-xl font-bold text-gray-900 dark:text-neutral-100 sm:text-2xl lg:text-3xl'>
              <Flame className='h-6 w-6 text-orange-500' />
              Reservas de Quincho
            </h1>
            <p className='text-sm text-gray-600 dark:text-neutral-400 sm:text-base'>
              Cada reserva cobra el total de personas × monto por persona y lo acredita al prepago
              del cliente.
            </p>
          </div>
          <Button
            onClick={() => setModalOpen(true)}
            className='w-full rounded-full bg-black px-6 text-white hover:bg-gray-800 dark:bg-white dark:text-black dark:hover:bg-gray-200 sm:w-auto'
          >
            <Plus className='mr-2 h-4 w-4' />
            Nueva reserva
          </Button>
        </header>

        <CajaStatusBanner entityName='reservas de quincho' />

        <QuinchosTable
          reservas={reservas}
          isLoading={isLoading}
          isCancelling={isCancelling}
          canCancel={hasPermission('quinchos', 'delete')}
          onCancel={anularReserva}
        />

        <ReservaQuinchoModal
          open={modalOpen}
          onOpenChange={setModalOpen}
          clientes={clientes}
          cajaCerrada={cajaCerrada}
          isSaving={isSaving}
          onSubmit={crearReserva}
        />
      </div>
    </PermissionGuard>
  );
}
