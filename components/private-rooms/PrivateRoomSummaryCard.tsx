'use client';

import { Receipt } from 'lucide-react';
import { formatCurrencyCLP } from '@/lib/utils/formatters';

interface PrivateRoomSummaryCardProps {
  room: any;
  clientName: string;
  hostessNames: string;
  tiempoHabitacion: number;
  precioServicio: number;
  metodoPago: string;
  iva: number;
  total: number;
  desgloseTarjeta: {
    venta: number;
    propina: number;
  };
}

export function PrivateRoomSummaryCard({
  room,
  clientName,
  hostessNames,
  tiempoHabitacion,
  precioServicio,
  metodoPago,
  iva,
  total,
  desgloseTarjeta
}: PrivateRoomSummaryCardProps) {
  if (!room) return null;

  const roomName = room.nombre || room.name || room.numero || 'Habitación';
  const showImportantNote = metodoPago === 'tarjeta' && total > 0;

  return (
    <div className='rounded-2xl border border-stone-200 bg-stone-50/90 p-3 shadow-xs ring-1 ring-stone-100 backdrop-blur-sm dark:border-stone-800 dark:bg-stone-950/50 dark:ring-stone-900 sm:p-4'>
      <div className='mb-3 flex items-start justify-between gap-3'>
        <div>
          <p className='text-[10px] font-black uppercase tracking-[0.26em] text-stone-400'>
            Resumen de habitación
          </p>
          <p className='mt-1 text-sm font-bold text-slate-900 dark:text-white'>{roomName}</p>
        </div>
        <div className='rounded-full bg-stone-900 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-white dark:bg-stone-100 dark:text-stone-900'>
          Seleccionada
        </div>
      </div>

      <div className='grid grid-cols-1 gap-3 lg:grid-cols-2'>
        <div className='rounded-xl border border-stone-200 bg-white/70 px-3 py-3 dark:border-stone-800 dark:bg-stone-900/40'>
          <p className='text-[10px] font-black uppercase tracking-[0.22em] text-stone-500'>
            Habitación
          </p>
          <p className='mt-1 text-sm font-semibold text-stone-900 dark:text-stone-50'>{roomName}</p>

          <div className='mt-3 space-y-2 text-sm'>
            <div className='flex items-center justify-between gap-3'>
              <span className='font-black uppercase tracking-[0.18em] text-stone-500'>Tiempo</span>
              <span className='font-semibold text-stone-900 dark:text-stone-50'>
                {tiempoHabitacion > 0 ? `${tiempoHabitacion} min` : 'Sin tiempo'}
              </span>
            </div>

            {precioServicio > 0 && (
              <div className='flex items-center justify-between gap-3'>
                <span className='font-black uppercase tracking-[0.18em] text-stone-500'>
                  Servicio
                </span>
                <span className='font-semibold text-stone-900 dark:text-stone-50'>
                  {formatCurrencyCLP(precioServicio)}
                </span>
              </div>
            )}
          </div>
        </div>

        <div className='rounded-xl border border-stone-200 bg-white/70 px-3 py-3 dark:border-stone-800 dark:bg-stone-900/40'>
          <div className='space-y-3'>
            <div className='flex items-start justify-between gap-3'>
              <div>
                <p className='text-[10px] font-black uppercase tracking-[0.22em] text-stone-500'>
                  Cliente
                </p>
                <p className='mt-1 text-sm font-semibold text-stone-900 dark:text-stone-50'>
                  {clientName || 'Sin cliente'}
                </p>
              </div>

              {metodoPago === 'tarjeta' && (
                <div className='text-right'>
                  <p className='text-[10px] font-black uppercase tracking-[0.22em] text-stone-500'>
                    IVA
                  </p>
                  <p className='mt-1 text-sm font-semibold text-stone-900 dark:text-stone-50'>
                    {iva > 0 ? formatCurrencyCLP(iva) : 'Sin IVA'}
                  </p>
                </div>
              )}
            </div>

            <div>
              <p className='text-[10px] font-black uppercase tracking-[0.22em] text-stone-500'>
                Anfitrionas
              </p>
              <p className='mt-1 text-sm font-semibold text-stone-900 dark:text-stone-50'>
                {hostessNames || 'Sin anfitrionas seleccionadas'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {showImportantNote && (
        <div className='mt-3 flex items-center gap-3 rounded-xl border border-amber-200/70 bg-amber-50/80 px-3 py-2 dark:border-amber-500/20 dark:bg-amber-500/10'>
          <div className='flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300'>
            <Receipt className='h-4 w-4' />
          </div>
          <p className='text-xs leading-5 text-slate-700 dark:text-slate-100'>
            <span className='font-black uppercase tracking-[0.22em] text-amber-700 dark:text-amber-300'>
              Nota importante
            </span>{' '}
            Genera venta por{' '}
            <span className='font-black text-emerald-600 dark:text-emerald-300'>
              {formatCurrencyCLP(desgloseTarjeta.venta)}
            </span>{' '}
            y propina por{' '}
            <span className='font-black text-fuchsia-600 dark:text-fuchsia-300'>
              {formatCurrencyCLP(desgloseTarjeta.propina)}
            </span>
          </p>
        </div>
      )}
    </div>
  );
}
