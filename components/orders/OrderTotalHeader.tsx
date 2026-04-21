 
import { Button } from '@/components/ui/button';
import { ShoppingCart } from 'lucide-react';
import React, { useState } from 'react';
import { formatCurrencyNoDecimals } from '@/lib/utils/formatters';
import { Checkbox } from '@/components/ui/checkbox';

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
    <div className='flex flex-col items-center justify-center'>
      <div className='text-xs text-gray-400 dark:text-zinc-500 font-semibold mb-1'>TOTAL</div>
      <div className='text-2xl font-bold text-gray-800 dark:text-zinc-100 mb-2'>{formatCurrencyNoDecimals(total)}</div>

      <div className='mb-4 w-full max-w-xs'>
        <div className='text-xs font-medium text-gray-600 dark:text-zinc-400 mb-2 text-center'>Propina</div>
        <div className='flex items-center justify-center gap-2 mb-2'>
          <Checkbox id='agregar-propina' checked={tipEnabled} onCheckedChange={handleTipToggle} />
          <label
            htmlFor='agregar-propina'
            className='text-sm font-medium text-gray-700 dark:text-zinc-300 cursor-pointer'
          >
            10%
          </label>
          <input
            type='text'
            value={formatCurrencyNoDecimals(tipAmount)}
            readOnly
            className='ml-2 px-2 py-1 text-sm border border-gray-300 dark:border-zinc-700 rounded-full bg-gray-50 dark:bg-zinc-900 text-gray-700 dark:text-zinc-200 w-24 text-center'
            placeholder='$0'
          />
        </div>
      </div>

      <Button
        variant='outline'
        className='rounded-full px-6 bg-black text-white hover:scale-110 transition-all duration-200 dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-white'
        onClick={onSubmit}
      >
        <ShoppingCart className='w-4 h-4 mr-2' />
        Generar pedido
      </Button>
    </div>
  );
};

export default OrderTotalHeader;
