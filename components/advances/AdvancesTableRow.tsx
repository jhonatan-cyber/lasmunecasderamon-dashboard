'use client';

import Image from 'next/image';
import { TableCell, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Check, X } from 'lucide-react';
import { formatCurrencyCLP } from '@/lib/utils/formatters';
import { formatDateTimeDmyLabel } from '@/lib/utils/calendarUtils';
import { Anticipo } from '@/hooks/personal';

interface AdvancesTableRowProps {
  anticipo: Anticipo;
  idx: number;
  total: number;
  isAdmin: boolean;
  onAction?: (id: string | number, action: 'approve' | 'reject') => Promise<any>;
  statusBadge: React.ReactNode;
}

export function AdvancesTableRow({
  anticipo: a,
  idx,
  total,
  isAdmin,
  onAction,
  statusBadge,
}: AdvancesTableRowProps) {
  const creacion = formatDateTimeDmyLabel(a.fecha_crea);

  return (
    <TableRow
      className={`border-b transition-colors hover:bg-gray-50 dark:hover:bg-slate-800/30 ${
        idx === 0 ? 'first:rounded-t-xl' : ''
      } ${idx === total - 1 ? 'last:rounded-b-xl' : ''}`}
    >
      <TableCell className='py-3 px-4'>
        <div className='flex items-center gap-3'>
          <div className='h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold overflow-hidden border-2 border-white dark:border-slate-800 shadow-xs relative group-hover:scale-110 transition-transform duration-200'>
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
            <span className='font-bold text-sm text-gray-900 dark:text-white leading-tight'>
              {a.name || a.nombre} {a.lastName || a.apellido}
            </span>
            <span className='text-[10px] text-purple-600 font-bold uppercase tracking-wider'>
              @{a.nick}
            </span>
          </div>
        </div>
      </TableCell>
      <TableCell className='py-3 px-4 text-center'>
        <div className='flex flex-col'>
          <span className='font-bold text-sm text-gray-900 dark:text-white'>{creacion.date}</span>
          <span className='text-xs text-gray-400'>{creacion.time}</span>
        </div>
      </TableCell>
      <TableCell className='py-3 px-4 text-center'>
        {a.fecha_aprobacion ? (
          <div className='flex flex-col'>
            <span className='font-bold text-sm text-gray-900 dark:text-white'>
              {formatDateTimeDmyLabel(a.fecha_aprobacion).date}
            </span>
            <span className='text-xs text-gray-400'>
              {formatDateTimeDmyLabel(a.fecha_aprobacion).time}
            </span>
          </div>
        ) : (
          <span className='text-xs text-gray-400 italic'>-</span>
        )}
      </TableCell>
      <TableCell className='py-3 px-4 text-center'>{statusBadge}</TableCell>
      <TableCell className='py-3 px-4 text-right font-bold text-emerald-600'>
        {formatCurrencyCLP(a.monto)}
      </TableCell>
      <TableCell className='py-3 px-4 text-center'>
        {a.entregado_por_nombre ? (
          <span className='text-xs font-semibold text-gray-700 dark:text-gray-300'>
            {a.entregado_por_nombre} {a.entregado_por_apellido}
          </span>
        ) : (
          <span className='text-xs text-gray-400 italic'>-</span>
        )}
      </TableCell>
      {isAdmin && (
        <TableCell className='py-3 px-4 text-center'>
          {Number(a.estado) === 2 && onAction ? (
            <div className='flex items-center justify-center gap-2'>
              <Button
                size='sm'
                variant='ghost'
                className='h-8 rounded-full bg-emerald-50 text-emerald-700 hover:bg-emerald-100 px-3 font-bold text-[10px] uppercase transition-all active:scale-95'
                onClick={() => onAction(a.id_anticipo, 'approve')}
              >
                <Check className='h-3 w-3 mr-1' /> Aprobar
              </Button>
              <Button
                size='sm'
                variant='ghost'
                className='h-8 rounded-full bg-rose-50 text-rose-700 hover:bg-rose-100 px-3 font-bold text-[10px] uppercase transition-all active:scale-95'
                onClick={() => onAction(a.id_anticipo, 'reject')}
              >
                <X className='h-3 w-3 mr-1' /> Rechazar
              </Button>
            </div>
          ) : (
            <div className='flex justify-center'>
              <Badge className='rounded-full px-3 py-1 bg-gray-100 text-gray-400 border-none font-bold uppercase tracking-tighter text-[9px] italic'>
                Ya Procesado
              </Badge>
            </div>
          )}
        </TableCell>
      )}
    </TableRow>
  );
}
