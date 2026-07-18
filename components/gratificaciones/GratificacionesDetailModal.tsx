import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { formatCurrencyNoDecimals } from '@/lib/utils/formatters';
import { formatLongDateEs, formatShortTimeEs } from '@/lib/utils/calendarUtils';
import {
  User as UserIcon,
  Calendar,
  DollarSign,
  FileText,
  Hash,
  Clock,
  CheckCircle,
  XCircle,
  History
} from 'lucide-react';
import { Gratificacion } from '@/types/gratificacion';

interface GratificacionesDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  gratificacion: Gratificacion | null;
}

export default function GratificacionesDetailModal({
  isOpen,
  onClose,
  gratificacion
}: GratificacionesDetailModalProps) {
  if (!gratificacion) return null;

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      onClose();
    }
  };

  const formatDateTime = (dateStr: string) => {
    if (!dateStr) return 'N/A';
    try {
      return `${formatLongDateEs(dateStr)} ${formatShortTimeEs(dateStr)}`;
    } catch (e) {
      return dateStr;
    }
  };

  const fechaModLabel =
    gratificacion.estado === 0 ? 'Fecha de pago' : '\u00daltima modificaci\u00f3n';

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className='w-[95vw] max-w-[95vw] sm:w-full sm:max-w-[650px] max-h-[90vh] flex flex-col p-0 overflow-hidden'>
        <DialogHeader className='shrink-0 px-6 pt-6 pb-4 border-b bg-zinc-50 dark:bg-neutral-900'>
          <div className='flex justify-between items-center'>
            <div>
              <DialogTitle className='text-lg sm:text-xl lg:text-2xl font-bold'>
                Detalle de Gratificación
              </DialogTitle>
              <div className='flex items-center gap-2 mt-1 text-zinc-500'>
                <Hash className='h-3 w-3' />
                <span className='text-xs font-mono uppercase'>ID: {gratificacion.id}</span>
              </div>
            </div>
            <div
              className={`px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 ${
                gratificacion.estado === 0
                  ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                  : gratificacion.estado === 1
                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                    : gratificacion.estado === 2
                      ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                      : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
              }`}
            >
              {gratificacion.estado === 0 ? (
                <>
                  <CheckCircle className='h-3 w-3' /> Pagado
                </>
              ) : gratificacion.estado === 1 ? (
                <>
                  <Clock className='h-3 w-3' /> Por pagar
                </>
              ) : gratificacion.estado === 2 ? (
                <>
                  <History className='h-3 w-3' /> Pendiente
                </>
              ) : (
                <>
                  <XCircle className='h-3 w-3' /> Rechazada
                </>
              )}
            </div>
          </div>
        </DialogHeader>

        <div className='flex-1 overflow-y-auto px-6 py-6'>
          <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
            {}
            <div className='space-y-6'>
              <section>
                <h3 className='text-xs font-bold text-zinc-400 uppercase tracking-wider mb-3'>
                  Información General
                </h3>
                <div className='space-y-4'>
                  <div className='flex items-start gap-3'>
                    <div className='mt-1 p-2 bg-zinc-100 dark:bg-neutral-800 rounded-lg'>
                      <UserIcon className='h-4 w-4 text-zinc-600 dark:text-neutral-400' />
                    </div>
                    <div>
                      <p className='text-xs text-zinc-500 font-medium'>Empleado</p>
                      <p className='text-sm sm:text-base font-semibold text-zinc-900 dark:text-zinc-100'>
                        {gratificacion.usuario}
                      </p>
                    </div>
                  </div>

                  <div className='flex items-start gap-3'>
                    <div className='mt-1 p-2 bg-green-50 dark:bg-green-900/20 rounded-lg'>
                      <DollarSign className='h-4 w-4 text-green-600 dark:text-green-400' />
                    </div>
                    <div>
                      <p className='text-xs text-zinc-500 font-medium'>Monto Registrado</p>
                      <p className='text-lg sm:text-xl font-bold text-green-600 dark:text-green-400'>
                        {formatCurrencyNoDecimals(gratificacion.monto)}
                      </p>
                    </div>
                  </div>

                  <div className='flex items-start gap-3'>
                    <div className='mt-1 p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg'>
                      <Calendar className='h-4 w-4 text-blue-600 dark:text-blue-400' />
                    </div>
                    <div>
                      <p className='text-xs text-zinc-500 font-medium'>Fecha de Aplicación</p>
                      <p className='text-sm sm:text-base font-medium'>
                        {formatDateTime(gratificacion.fecha_hora || gratificacion.fecha_crea)}
                      </p>
                    </div>
                  </div>
                </div>
              </section>
            </div>

            {}
            <div className='space-y-6'>
              <section>
                <h3 className='text-xs font-bold text-zinc-400 uppercase tracking-wider mb-3'>
                  Registro y Auditoría
                </h3>
                <div className='space-y-4 p-4 bg-zinc-50 dark:bg-neutral-900/50 rounded-2xl border border-zinc-100 dark:border-neutral-800'>
                  <div className='flex items-start gap-2'>
                    <Clock className='h-3 w-3 text-zinc-400 mt-0.5' />
                    <div>
                      <p className='text-[10px] text-zinc-500 uppercase'>Creado el</p>
                      <p className='text-xs font-medium'>
                        {formatDateTime(gratificacion.fecha_crea)}
                      </p>
                    </div>
                  </div>
                  {gratificacion.fecha_mod && (
                    <div className='flex items-start gap-2'>
                      <History className='h-3 w-3 text-zinc-400 mt-0.5' />
                      <div>
                        <p className='text-[10px] text-zinc-500 uppercase'>{fechaModLabel}</p>
                        <p className='text-xs font-medium'>
                          {formatDateTime(gratificacion.fecha_mod)}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </section>

              <section>
                <h3 className='text-xs font-bold text-zinc-400 uppercase tracking-wider mb-3'>
                  Descripción / Nota
                </h3>
                <div className='p-4 bg-white dark:bg-neutral-800 rounded-2xl border border-zinc-100 dark:border-neutral-700'>
                  <div className='flex gap-3'>
                    <FileText className='h-4 w-4 text-zinc-400 mt-0.5 shrink-0' />
                    <p className='text-sm text-zinc-600 dark:text-zinc-300 italic'>
                      {gratificacion.descripcion || 'Sin descripción adicional.'}
                    </p>
                  </div>
                </div>
              </section>
            </div>
          </div>
        </div>

        <DialogFooter className='shrink-0 border-t px-6 py-4 bg-zinc-50 dark:bg-neutral-900'>
          <div className='flex justify-center w-full'>
            <DialogClose asChild>
              <Button
                type='button'
                className='rounded-full bg-black text-white hover:scale-105 transition-all duration-200'
                onClick={onClose}
              >
                Cerrar Detalle
              </Button>
            </DialogClose>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
