'use client';

import Image from 'next/image';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar, Check, X } from 'lucide-react';
import { formatCurrencyCLP } from '@/lib/utils/formatters';
import { formatDateTimeDmyLabel } from '@/lib/utils/calendarUtils';
import { Anticipo } from '@/hooks/personal';

interface AdvancesMobileCardProps {
  anticipo: Anticipo;
  isAdmin: boolean;
  onAction?: (id: string | number, action: 'approve' | 'reject') => Promise<any>;
  statusBadge: React.ReactNode;
}

export function AdvancesMobileCard({
  anticipo: a,
  isAdmin,
  onAction,
  statusBadge,
}: AdvancesMobileCardProps) {
  return (
    <Card className='rounded-3xl border-none shadow-md bg-white dark:bg-slate-900/40 overflow-hidden group hover:shadow-lg hover:-translate-y-0.5 transition-transform duration-200'>
      <CardContent className='p-5 space-y-4'>
        <div className='flex justify-between items-start'>
          <div className='flex items-center gap-3'>
            <div className='h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold overflow-hidden border-2 border-white dark:border-slate-800 shadow-xs relative'>
              {a.foto ? (
                <Image
                  src={a.foto.startsWith('http') ? a.foto : `/img/users/${a.foto}`}
                  alt={a.nick}
                  fill
                  sizes='40px'
                  className='object-cover'
                />
              ) : (
                <span className='text-sm'>
                  {(a.name || a.nombre || '')?.substring(0, 1)}
                  {(a.lastName || a.apellido || '')?.substring(0, 1)}
                </span>
              )}
            </div>
            <div className='flex flex-col'>
              <span className='text-sm font-bold text-gray-900 dark:text-white leading-tight'>
                {a.name || a.nombre} {a.lastName || a.apellido}
              </span>
              <span className='text-[10px] text-purple-600 font-semibold uppercase tracking-wider'>
                @{a.nick}
              </span>
            </div>
          </div>
          <div className='flex flex-col items-end gap-2'>{statusBadge}</div>
        </div>

        <div className='flex items-center justify-between pb-1'>
          <div className='flex items-center gap-2 text-[10px] text-gray-500 font-medium'>
            <Calendar className='h-3 w-3' />
            {formatDateTimeDmyLabel(a.fecha_crea).date}
          </div>
          <div className='text-lg font-black text-emerald-600'>
            {formatCurrencyCLP(a.monto)}
          </div>
        </div>

        {isAdmin && Number(a.estado) === 2 && onAction && (
          <div className='flex gap-2 pt-2 border-t border-gray-50 dark:border-gray-800'>
            <Button
              variant='ghost'
              className='flex-1 rounded-2xl bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-bold text-xs h-9'
              onClick={() => onAction(a.id_anticipo, 'approve')}
            >
              <Check className='h-4 w-4 mr-2' /> Aprobar
            </Button>
            <Button
              variant='ghost'
              className='flex-1 rounded-2xl bg-rose-50 text-rose-700 hover:bg-rose-100 font-bold text-xs h-9'
              onClick={() => onAction(a.id_anticipo, 'reject')}
            >
              <X className='h-4 w-4 mr-2' /> Rechazar
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
