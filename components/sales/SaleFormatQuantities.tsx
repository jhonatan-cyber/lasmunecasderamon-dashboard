'use client';

import { Minus, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatCurrencyNoDecimals } from '@/lib/utils/formatters';
import type { SaleChoice } from '@/lib/sales/saleChoice';

export interface SaleFormatQuantityOption {
  value: SaleChoice;
  label: string;
  precio: number;
  comision: number;
  cantidad: number;
  maxCantidad: number;
}

export function SaleFormatQuantities({
  options,
  onChange,
  dense = false
}: {
  options: SaleFormatQuantityOption[];
  onChange: (value: SaleChoice, cantidad: number) => void;
  dense?: boolean;
}) {
  return (
    <div className='mt-2 space-y-1.5'>
      {options.map(option => {
        const sinStock = option.maxCantidad < 1;
        const alMaximo = option.cantidad >= option.maxCantidad;
        return (
          <div
            key={option.value}
            className={`flex items-center justify-between gap-2 rounded-xl border border-neutral-200/70 bg-white px-2.5 dark:border-white/10 dark:bg-neutral-950 ${dense ? 'py-1' : 'py-2'}`}
          >
            <div className='min-w-0 flex-1'>
              <p className='truncate text-xs font-bold'>{option.label}</p>
              <p className='text-[10px] text-muted-foreground'>
                {formatCurrencyNoDecimals(option.precio)} · comisión{' '}
                {formatCurrencyNoDecimals(option.comision)}
              </p>
            </div>
            <div className='flex shrink-0 items-center gap-1.5'>
              <Button
                type='button'
                size='sm'
                variant='outline'
                aria-label={`${option.label}: disminuir cantidad`}
                disabled={option.cantidad <= 0}
                onClick={() => onChange(option.value, Math.max(0, option.cantidad - 1))}
                className='h-7 w-7 rounded-full p-0'
              >
                <Minus className='h-3 w-3' />
              </Button>
              <span
                aria-label={`${option.label}: cantidad ${option.cantidad}`}
                className='w-5 text-center text-sm font-bold tabular-nums'
              >
                {option.cantidad}
              </span>
              <Button
                type='button'
                size='sm'
                variant='outline'
                aria-label={`${option.label}: aumentar cantidad`}
                disabled={sinStock || alMaximo}
                onClick={() =>
                  onChange(option.value, Math.min(option.maxCantidad, option.cantidad + 1))
                }
                className='h-7 w-7 rounded-full p-0'
              >
                <Plus className='h-3 w-3' />
              </Button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
