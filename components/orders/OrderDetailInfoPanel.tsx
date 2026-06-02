'use client';

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
  garzonName,
  hasChampagneProducts,
  cantidadAnfitrionas,
  maxAnfitrionas
}: OrderDetailInfoPanelProps) {
  return (
    <div className='space-y-3'>
      <div className='flex justify-between items-center'>
        <span className='text-xs sm:text-sm text-muted-foreground'>Fecha y Hora:</span>
        <div className='text-xs sm:text-sm font-medium'>
          <div>{createdAt}</div>
        </div>
      </div>
      <Separator />
      <div className='flex justify-between items-center'>
        <span className='text-xs sm:text-sm text-muted-foreground'>Código:</span>
        <Badge variant='outline' className='text-xs'>
          {code}
        </Badge>
      </div>
      <Separator />
      <div className='flex justify-between items-center'>
        <span className='text-xs sm:text-sm text-muted-foreground'>Anfitriona(s):</span>
        <span className='text-xs sm:text-sm font-medium'>{hostessName || '-'}</span>
      </div>
      <Separator />
      <div className='flex justify-between items-center'>
        <span className='text-xs sm:text-sm text-muted-foreground'>Cliente:</span>
        <span className='text-xs sm:text-sm font-medium'>{clientName || '-'}</span>
      </div>
      <Separator />
      <div className='flex justify-between items-center'>
        <span className='text-xs sm:text-sm text-muted-foreground'>Garzón:</span>
        <span className='text-xs sm:text-sm font-medium'>{garzonName || '-'}</span>
      </div>

      {hasChampagneProducts && cantidadAnfitrionas === 0 && (
        <>
          <Separator />
          <div className='text-xs text-red-500'>
            ⚠️ Se requiere al menos una anfitriona para productos de champaña
          </div>
        </>
      )}
      {cantidadAnfitrionas > maxAnfitrionas && (
        <>
          <Separator />
          <div className='text-xs text-red-500'>
            ⚠️ Excede el límite combinado de {maxAnfitrionas} anfitriona(s)
          </div>
        </>
      )}
    </div>
  );
}
