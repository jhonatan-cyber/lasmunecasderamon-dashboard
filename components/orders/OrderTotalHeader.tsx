'use client';

import { Button } from '@/components/ui/button';
import { ReceiptText, ShoppingCart } from 'lucide-react';
import React, { useState } from 'react';
import { formatCurrencyNoDecimals } from '@/lib/utils/formatters';
import { Label } from '@/components/ui/label';
import { TipToggle } from '@/components/shared/TipToggle';

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

  const handleTipToggle = (nextEnabled: boolean) => {
    setTipEnabled(nextEnabled);
    if (onTipChange) {
      onTipChange(nextEnabled, tipPercentage);
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
        <TipToggle amount={tipAmount} enabled={tipEnabled} onToggle={handleTipToggle} />
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
