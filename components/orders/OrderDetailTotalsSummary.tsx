'use client';

import { Separator } from '@/components/ui/separator';
import { formatCurrencyCLP } from '@/lib/utils/formatters';

interface OrderDetailTotalsSummaryProps {
  subtotal: number;
  propina: number;
  recargoAnfitrionas: number;
  total: number;
}

export function OrderDetailTotalsSummary({
  subtotal,
  propina,
  recargoAnfitrionas,
  total
}: OrderDetailTotalsSummaryProps) {
  return (
    <div className='space-y-2'>
      <div className='flex justify-between items-center text-sm'>
        <span className='text-muted-foreground'>SUBTOTAL:</span>
        <span className='font-semibold'>{formatCurrencyCLP(subtotal)}</span>
      </div>
      {propina > 0 && (
        <div className='flex justify-between items-center text-sm'>
          <span className='text-blue-600'>+ Propina:</span>
          <span className='text-blue-600 font-medium'>{formatCurrencyCLP(propina)}</span>
        </div>
      )}
      {recargoAnfitrionas > 0 && (
        <div className='flex justify-between items-center text-sm'>
          <span className='text-orange-600'>+ Recargo anfitrionas:</span>
          <span className='text-orange-600 font-medium'>
            {formatCurrencyCLP(recargoAnfitrionas)}
          </span>
        </div>
      )}
      <Separator />
      <div className='flex justify-between items-center text-base'>
        <span className='font-bold'>TOTAL:</span>
        <span className='font-bold text-lg'>{formatCurrencyCLP(total)}</span>
      </div>
    </div>
  );
}
