 
import { Button } from '@/components/ui/button';
import { ReceiptText, ShoppingCart } from 'lucide-react';
import React, { useState } from 'react';
import { formatCurrencyNoDecimals } from '@/lib/utils/formatters';
import { Checkbox } from '@/components/ui/checkbox';
import { ORDER_FIELD_INPUT_CLASS } from '@/components/orders/orderFieldStyles';

interface OrderTotalHeaderProps {
  total: number;
  subtotal?: number;
  onSubmit?: () => void;
  onTipChange?: (enabled: boolean, percentage: number) => void;
  tipPercentage?: number;
  tipEnabled?: boolean;
}

const OrderTotalHeader: React.FC<OrderTotalHeaderProps> = ({
  total,
  subtotal,
  onSubmit,
  onTipChange,
  tipPercentage: initialTipPercentage = 10,
  tipEnabled: initialTipEnabled = false
}) => {
  const [tipEnabled, setTipEnabled] = useState(initialTipEnabled);
  const [tipPercentage, setTipPercentage] = useState(initialTipPercentage);

  const tipAmount = tipEnabled && subtotal ? (subtotal * tipPercentage) / 100 : 0;

  const handleTipToggle = () => {
    const newEnabled = !tipEnabled;
    setTipEnabled(newEnabled);
    if (onTipChange) {
      onTipChange(newEnabled, tipPercentage);
    }
  };

  const handleTipChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value) || 0;
    setTipPercentage(value);
    if (onTipChange && tipEnabled) {
      onTipChange(tipEnabled, value);
    }
  };

  return (
    <div className='w-full rounded-3xl border border-zinc-200 bg-white/95 p-6 shadow-md dark:border-zinc-800 dark:bg-zinc-950/80 dark:shadow-black/20'>
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

      <div className='rounded-2xl border border-zinc-200/80 bg-zinc-50/80 p-4 dark:border-zinc-800 dark:bg-zinc-900/70'>
        <div className='mb-3 flex items-center justify-between gap-3'>
          <div>
            <div className='text-sm font-semibold text-zinc-800 dark:text-zinc-100'>Propina</div>
            <div className='text-xs text-zinc-500 dark:text-zinc-400'>
              Aplicá el 10% sobre el subtotal del pedido
            </div>
          </div>
          <div className='flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-3 py-2 dark:border-zinc-700 dark:bg-zinc-950'>
            <Checkbox id='agregar-propina' checked={tipEnabled} onCheckedChange={handleTipToggle} />
            <label
              htmlFor='agregar-propina'
              className='cursor-pointer text-sm font-semibold text-zinc-700 dark:text-zinc-200'
            >
              10%
            </label>
          </div>
        </div>

        <input
          type='text'
          value={formatCurrencyNoDecimals(tipAmount)}
          readOnly
          className={`${ORDER_FIELD_INPUT_CLASS} h-12 bg-white text-center text-base font-semibold text-zinc-700 opacity-90 dark:bg-zinc-950 dark:text-zinc-100`}
          placeholder='$0'
        />
      </div>

      <Button
        variant='outline'
        className='mt-5 h-12 w-full rounded-full bg-black text-base font-semibold text-white transition-all duration-200 hover:scale-[1.02] hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-white'
        onClick={onSubmit}
      >
        <ShoppingCart className='mr-2 h-4 w-4' />
        Generar pedido
      </Button>
    </div>
  );
};

export default OrderTotalHeader;
