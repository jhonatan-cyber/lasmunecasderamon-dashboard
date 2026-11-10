'use client';

import type { ReactNode } from 'react';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

interface OrderDetailInfoPanelProps {
  createdAt?: string;
  code?: string;
  hostessName?: string;
  clientName?: string;
  garzonName?: string;
  hasChampagneProducts: boolean;
  cantidadAnfitrionas: number;
  maxAnfitrionas: number;
}

export function OrderDetailInfoPanel({
  createdAt,
  code,
  hostessName,
  clientName,
  garzonName
}: OrderDetailInfoPanelProps) {
  const rows: { label: string; value: ReactNode }[] = [];
  if (createdAt?.trim())
    rows.push({
      label: 'Fecha y Hora:',
      value: <div className='text-xs font-medium sm:text-sm'>{createdAt}</div>
    });
  if (code?.trim())
    rows.push({
      label: 'Código:',
      value: (
        <Badge variant='outline' className='text-xs'>
          {code}
        </Badge>
      )
    });
  if (hostessName?.trim()) rows.push({ label: 'Anfitriona(s):', value: hostessName });
  if (clientName?.trim()) rows.push({ label: 'Cliente:', value: clientName });
  if (garzonName?.trim()) rows.push({ label: 'Garzón:', value: garzonName });

  return (
    <div className='space-y-3'>
      {rows.map((row, index) => (
        <div key={row.label}>
          {index > 0 && <Separator />}
          <div className='flex items-start justify-between gap-3'>
            <span className='shrink-0 text-xs text-muted-foreground sm:text-sm'>{row.label}</span>
            <span className='min-w-0 text-right text-xs font-medium break-words sm:text-sm'>
              {row.value}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
