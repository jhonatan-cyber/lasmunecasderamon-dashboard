'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Inbox, Send } from 'lucide-react';
import { formatCurrencyNoDecimals } from '@/lib/utils/formatters';
import { formatLongDateEs, formatShortTimeEs } from '@/lib/utils/calendarUtils';
import { Gratificacion } from '@/types/gratificacion';
import GratificacionStatusBadge from './GratificacionStatusBadge';

interface MisSolicitudesSectionProps {
  loading: boolean;
  rows: Gratificacion[];
  rowsPerPage: number;
  onViewDetail: (gratificacion: Gratificacion) => void;
}

/** Sección de solo lectura con las gratificaciones que este usuario solicitó para otros. */
export default function MisSolicitudesSection({
  loading,
  rows,
  rowsPerPage,
  onViewDetail
}: MisSolicitudesSectionProps) {
  const formatDateTime = (dateStr: string) =>
    `${formatLongDateEs(dateStr)} ${formatShortTimeEs(dateStr)}`;

  return (
    <section aria-label='Mis solicitudes de gratificaciones' className='space-y-3'>
      <div className='flex items-center justify-between'>
        <h2 className='flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-zinc-500'>
          <Send className='h-4 w-4' />
          Mis solicitudes
          <span className='rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-bold text-amber-800 dark:bg-amber-900/20 dark:text-amber-400'>
            {rows.length}
          </span>
        </h2>
        <p className='hidden text-xs text-zinc-400 sm:block'>
          Bonificaciones que solicitaste para otros trabajadores
        </p>
      </div>

      {loading ? (
        <div className='space-y-3'>
          {Array.from({ length: Math.min(rowsPerPage, 3) }).map((_, i) => (
            <Card key={i} className='p-4'>
              <CardContent className='space-y-2'>
                <div className='h-4 w-40 animate-pulse rounded bg-zinc-100 dark:bg-neutral-800' />
                <div className='h-4 w-24 animate-pulse rounded bg-zinc-100 dark:bg-neutral-800' />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : rows.length === 0 ? (
        <div className='rounded-xl border border-dashed border-gray-200 bg-zinc-50/50 py-6 text-center text-sm text-gray-500 dark:border-neutral-800 dark:bg-neutral-900/40'>
          <Inbox className='mx-auto mb-2 h-5 w-5 text-zinc-300' />
          No has solicitado gratificaciones para otros
        </div>
      ) : (
        <div className='space-y-2'>
          {rows.map(gratificacion => (
            <Card
              key={gratificacion.id}
              className='border-gray-100 shadow-xs transition-shadow hover:shadow-md dark:border-neutral-800'
            >
              <CardContent className='flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4'>
                <div className='flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-4'>
                  <div>
                    <div className='text-[10px] font-bold uppercase tracking-wider text-zinc-400'>
                      Beneficiario
                    </div>
                    <div className='text-sm font-semibold text-zinc-900 dark:text-zinc-100'>
                      {gratificacion.usuario}
                    </div>
                  </div>
                  <div>
                    <div className='text-[10px] font-bold uppercase tracking-wider text-zinc-400'>
                      Fecha
                    </div>
                    <div className='text-sm text-zinc-600 dark:text-zinc-400'>
                      {formatDateTime(gratificacion.fecha_crea)}
                    </div>
                  </div>
                  <div>
                    <div className='text-[10px] font-bold uppercase tracking-wider text-zinc-400'>
                      Monto
                    </div>
                    <div className='text-sm font-bold text-zinc-900 dark:text-zinc-100'>
                      {formatCurrencyNoDecimals(gratificacion.monto)}
                    </div>
                  </div>
                </div>
                <div className='flex items-center gap-2 self-start sm:self-center'>
                  <GratificacionStatusBadge estado={gratificacion.estado} />
                  <button
                    type='button'
                    onClick={() => onViewDetail(gratificacion)}
                    className='rounded-full px-3 py-1 text-xs font-semibold text-blue-600 transition-colors hover:bg-blue-50 dark:hover:bg-blue-900/20'
                  >
                    Ver detalle
                  </button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </section>
  );
}
