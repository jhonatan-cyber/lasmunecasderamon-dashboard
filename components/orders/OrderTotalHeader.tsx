'use client';

import { Button } from '@/components/ui/button';
import { Coins, ReceiptText, ShoppingCart } from 'lucide-react';
import React, { useState } from 'react';
import { formatCurrencyNoDecimals } from '@/lib/utils/formatters';
import { Label } from '@/components/ui/label';

interface OrderTotalHeaderProps {
  total: number;
  subtotal?: number;
  onSubmit?: () => void;
  onTipChange?: (enabled: boolean, percentage: number) => void;
  tipPercentage?: number;
  tipEnabled?: boolean;
  disabled?: boolean;
}

const OrderTotalHeader: React.FC<OrderTotalHeaderProps> = ({
  total,
  subtotal,
  onSubmit,
  onTipChange,
  tipPercentage: initialTipPercentage = 10,
  disabled = false,
  tipEnabled: initialTipEnabled = false
}) => {
  const [tipEnabled, setTipEnabled] = useState(initialTipEnabled);
  const [tipPercentage] = useState(initialTipPercentage);

  const tipAmount = tipEnabled && subtotal ? (subtotal * tipPercentage) / 100 : 0;

  const handleTipToggle = () => {
    const newEnabled = !tipEnabled;
    setTipEnabled(newEnabled);
    if (onTipChange) {
      onTipChange(newEnabled, tipPercentage);
    }
  };

  return (
    <div className='w-full space-y-5'>
      <div className='mb-5 flex items-start justify-between gap-4'>
        <div>
          <div className='text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-400 dark:text-zinc-500'>
            Resumen del pedido
          </div>
          <div className='mt-1 flex items-center gap-2 text-sm font-medium text-zinc-600 dark:text-zinc-300'>
            <ReceiptText className='h-4 w-4 text-zinc-400 dark:text-zinc-500' />
            Total actualizado en tiempo real
          </div>
        </div>
        <div className='text-right'>
          <div className='text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-400 dark:text-zinc-500'>
            Total
          </div>
          <div className='mt-1 text-4xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50'>
            {formatCurrencyNoDecimals(total)}
          </div>
        </div>
      </div>

      <div className='space-y-1'>
        <Label className='block text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400'>
          Propina sugerida ({tipPercentage}%)
        </Label>
        <div
          role='button'
          tabIndex={0}
          aria-label='Activar propina'
          aria-pressed={tipEnabled}
          onClick={handleTipToggle}
          onKeyDown={event => {
            if (
              event.target === event.currentTarget &&
              (event.key === 'Enter' || event.key === ' ')
            ) {
              event.preventDefault();
              handleTipToggle();
            }
          }}
          className='flex h-11 items-center justify-between gap-3 rounded-full border border-gray-200 bg-gray-50/80 px-3 text-left transition-colors hover:bg-gray-100 dark:border-neutral-700 dark:bg-neutral-800/80 dark:hover:bg-neutral-800'
        >
          <div className='flex min-w-0 items-center gap-2'>
            <Coins className='h-4 w-4 shrink-0 text-gray-400' />
            <span className='text-sm font-bold text-gray-800 dark:text-neutral-100'>
              {formatCurrencyNoDecimals(tipAmount)}
            </span>
          </div>
          <div className='flex items-center gap-2'>
            <span className='text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-neutral-400'>
              {tipEnabled ? 'Activa' : 'Inactiva'}
            </span>
          </div>
        </div>
      </div>

      <Button
        variant='outline'
        className='mt-5 h-12 w-full rounded-full bg-black text-base font-semibold text-white transition-all duration-200 hover:scale-[1.02] hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-white'
        disabled={disabled}
        onClick={onSubmit}
      >
        <ShoppingCart className='mr-2 h-4 w-4' />
        Generar pedido
      </Button>
    </div>
  );
};

export default OrderTotalHeader;
