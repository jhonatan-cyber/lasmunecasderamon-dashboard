'use client';

import { memo } from 'react';
import { Button } from '@/components/ui/button';
import { ShoppingCart } from 'lucide-react';
import { formatCurrencyNoDecimals } from '@/lib/utils/formatters';

interface CartSummaryProps {
  total: number;
  itemCount: number;
  onSubmit: () => void;
  loading: boolean;
}

function CartSummaryComponent({ total, itemCount, onSubmit, loading }: CartSummaryProps) {
  return (
    <div className='flex flex-col items-center justify-center'>
      <div className='text-lg font-bold mb-2'>TOTAL</div>
      <div className='text-lg font-bold text-green-600'>{formatCurrencyNoDecimals(total)}</div>

      <Button
        onClick={onSubmit}
        disabled={loading || itemCount === 0}
        className='bg-black text-white dark:bg-black dark:text-white  dark:hover:bg-white! dark:hover:text-black! rounded-full hover:bg-white! hover:text-black! transition-all hover:scale-105 border-2'
      >
        <ShoppingCart className='mr-2 h-4 w-4' />
        {loading ? 'Agregando...' : 'Agregar'}
      </Button>
    </div>
  );
}

export const CartSummary = memo(CartSummaryComponent);
