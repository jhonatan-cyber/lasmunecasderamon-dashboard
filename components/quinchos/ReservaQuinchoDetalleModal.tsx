'use client';

import { useState } from 'react';
import { Ban, CalendarDays, Flame, Loader2, Users } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { formatLongDateEs } from '@/lib/utils/calendarUtils';
import { formatCurrencyCLP, formatFechaConHora } from '@/lib/utils/formatters';
import type { ReservaQuincho } from '@/types/quincho';

interface ReservaQuinchoDetalleModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Fecha elegida en el calendario, `YYYY-MM-DD`. */
  fecha: string | null;
  /** Todas las reservas de esa fecha, activas y anuladas. */
  reservas: ReservaQuincho[];
  /** El permiso `quinchos.delete` habilita anular y devolver el prepago. */
  canCancel: boolean;
  isCancelling: boolean;
  onCancel: (reserva: ReservaQuincho) => Promise<boolean>;
}

function DatoReserva({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <div className='flex flex-col'>
      <span className='text-xs uppercase tracking-wide text-gray-500 dark:text-neutral-400'>
        {etiqueta}
      </span>
      <span className='text-sm font-medium text-gray-900 dark:text-neutral-100'>{valor}</span>
    </div>
  );
}

/** Detalle de las reservas de un día, con la anulación bajo confirmación. */
export function ReservaQuinchoDetalleModal({
  open,
  onOpenChange,
  fecha,
  reservas,
  canCancel,
  isCancelling,
  onCancel
}: ReservaQuinchoDetalleModalProps) {
  const [reservaAAnular, setReservaAAnular] = useState<ReservaQuincho | null>(null);

  const cerrar = (abierto: boolean) => {
    if (!abierto) setReservaAAnular(null);
    onOpenChange(abierto);
  };

  const confirmarAnulacion = async () => {
    if (!reservaAAnular) return;
    const anulada = await onCancel(reservaAAnular);
    if (anulada) setReservaAAnular(null);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={cerrar}>
        <DialogContent className='flex max-h-[90vh] max-w-2xl flex-col overflow-hidden rounded-2xl p-0'>
          <DialogHeader className='border-b p-6 pb-3 dark:border-slate-800'>
            <DialogTitle className='flex items-center gap-2 text-xl font-bold'>
              <Flame className='h-5 w-5 text-orange-500' />
              Reservas del quincho
            </DialogTitle>
            <DialogDescription className='flex items-center gap-2 capitalize'>
              <CalendarDays className='h-4 w-4' />
              {fecha ? formatLongDateEs(fecha) : 'Sin fecha seleccionada'}
            </DialogDescription>
          </DialogHeader>

          <div className='flex-1 space-y-4 overflow-y-auto p-6'>
            {reservas.length === 0 && (
              <p className='rounded-2xl border border-dashed border-gray-300 px-4 py-6 text-center text-sm text-gray-500 dark:border-slate-700 dark:text-neutral-400'>
                No hay reservas registradas para esta fecha.
              </p>
            )}

            {reservas.map(reserva => (
              <article
                key={reserva.id}
                className='space-y-4 rounded-2xl border border-gray-200 p-4 dark:border-slate-800'
              >
                <header className='flex flex-wrap items-start justify-between gap-2'>
                  <div className='flex flex-col'>
                    <span className='font-medium text-gray-900 dark:text-neutral-100'>
                      {reserva.cliente_nombre} {reserva.cliente_apellido}
                    </span>
                    {reserva.cliente_run && (
                      <span className='text-xs text-gray-500 dark:text-neutral-400'>
                        {reserva.cliente_run}
                      </span>
                    )}
                  </div>
                  <div className='flex items-center gap-2'>
                    {reserva.estado === 'activa' ? (
                      <Badge className='rounded-full bg-green-100 px-3 py-1 text-green-700 dark:bg-green-900/40 dark:text-green-300'>
                        Activa
                      </Badge>
                    ) : (
                      <Badge className='flex items-center gap-1 rounded-full bg-red-100 px-3 py-1 text-red-700 dark:bg-red-900/40 dark:text-red-300'>
                        <Ban className='h-3 w-3' />
                        Anulada
                      </Badge>
                    )}
                    {canCancel && reserva.estado === 'activa' && (
                      <Button
                        type='button'
                        variant='ghost'
                        size='sm'
                        className='rounded-full text-red-600 hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-950/40'
                        onClick={() => setReservaAAnular(reserva)}
                        disabled={isCancelling}
                        aria-label={`Anular reserva de ${reserva.cliente_nombre} ${reserva.cliente_apellido}`}
                      >
                        <Ban className='mr-1 h-4 w-4' />
                        Anular
                      </Button>
                    )}
                  </div>
                </header>

                <div className='grid grid-cols-2 gap-3 sm:grid-cols-4'>
                  <DatoReserva
                    etiqueta='Personas'
                    valor={reserva.cantidad_personas.toLocaleString('es-CL')}
                  />
                  <DatoReserva
                    etiqueta='Monto por persona'
                    valor={formatCurrencyCLP(reserva.monto_por_persona)}
                  />
                  <DatoReserva etiqueta='Total' valor={formatCurrencyCLP(reserva.total)} />
                  <DatoReserva etiqueta='Método de pago' valor={reserva.metodo_pago} />
                </div>

                <div className='flex flex-wrap gap-x-6 gap-y-2 rounded-xl bg-gray-50 px-3 py-2 text-xs text-gray-600 dark:bg-slate-900/60 dark:text-neutral-400'>
                  <span className='flex items-center gap-1'>
                    <Users className='h-3.5 w-3.5' />
                    Registrada el {formatFechaConHora(reserva.fecha_crea)}
                  </span>
                  {reserva.fecha_anulacion && (
                    <span className='flex items-center gap-1'>
                      <Ban className='h-3.5 w-3.5' />
                      Anulada el {formatFechaConHora(reserva.fecha_anulacion)}
                    </span>
                  )}
                </div>

                {reserva.observaciones && (
                  <p className='rounded-xl bg-orange-50 px-3 py-2 text-sm text-orange-900 dark:bg-orange-950/30 dark:text-orange-200'>
                    {reserva.observaciones}
                  </p>
                )}
              </article>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={reservaAAnular !== null}
        onOpenChange={abierto => !abierto && setReservaAAnular(null)}
      >
        <DialogContent className='max-w-md rounded-2xl'>
          <DialogHeader>
            <DialogTitle className='flex items-center gap-2'>
              <Ban className='h-5 w-5 text-red-500' />
              Anular reserva
            </DialogTitle>
            <DialogDescription asChild>
              <div className='space-y-2 text-sm text-gray-600 dark:text-gray-300'>
                <p>
                  ¿Anular la reserva de{' '}
                  <strong>
                    {reservaAAnular?.cliente_nombre} {reservaAAnular?.cliente_apellido}
                  </strong>{' '}
                  del{' '}
                  <strong>{reservaAAnular?.fecha_reserva.split('-').reverse().join('-')}</strong>?
                </p>
                <p>
                  Se devolverán{' '}
                  <strong>
                    {reservaAAnular
                      ? formatCurrencyCLP(reservaAAnular.total)
                      : formatCurrencyCLP(0)}
                  </strong>{' '}
                  descontándolos del saldo prepago del cliente. Si ya consumió ese saldo, la
                  anulación no se puede completar.
                </p>
              </div>
            </DialogDescription>
          </DialogHeader>
          <div className='flex justify-center gap-3 pt-2'>
            <Button
              type='button'
              variant='outline'
              className='rounded-full px-6'
              onClick={() => setReservaAAnular(null)}
              disabled={isCancelling}
            >
              Cancelar
            </Button>
            <Button
              type='button'
              className='rounded-full bg-red-600 px-6 text-white hover:bg-red-700'
              onClick={confirmarAnulacion}
              disabled={isCancelling}
            >
              {isCancelling ? (
                <span className='flex items-center gap-2'>
                  <Loader2 className='h-4 w-4 animate-spin' />
                  Anulando...
                </span>
              ) : (
                'Anular y devolver'
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
