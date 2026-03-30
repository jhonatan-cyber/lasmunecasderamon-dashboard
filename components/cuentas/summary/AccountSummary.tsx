'use client';

import { ShoppingCart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatCurrencyCLP } from '@/lib/utils/formatters';

interface AccountSummaryProps {
  total: number;
  loading: boolean;
  hasChampagneProducts: boolean;
  selectedCliente: string | null;
  selectedAnfitrionas: string[];
  productosLength: number;
  onSubmit: () => void;
}

export default function AccountSummary({
  total,
  loading,
  hasChampagneProducts,
  selectedCliente,
  selectedAnfitrionas,
  productosLength,
  onSubmit
}: AccountSummaryProps) {
  const isDisabled = 
    loading ||
    productosLength === 0 ||
    !selectedCliente ||
    (hasChampagneProducts && selectedAnfitrionas.length === 0);

  return (
    <div className='flex flex-col items-center justify-center'>
      <div className='text-xs text-gray-400 font-semibold mb-1'>TOTAL</div>
      <div className='text-2xl font-bold text-gray-900 mb-2 text-center justify-center items-center'>
        {formatCurrencyCLP(total)}
      </div>
      <Button
        onClick={onSubmit}
        disabled={isDisabled}
        variant='outline'
        className='flex items-center gap-2 rounded-full bg-black text-white dark:bg-black dark:text-white dark:border-white dark:hover:bg-white dark:hover:text-black dark:hover:border-white hover:scale-105 transition-all duration-200 text-sm sm:text-base px-6 py-2 w-full sm:w-auto border-2'
      >
        <ShoppingCart className='mr-2' />
        {loading ? 'Generando...' : 'Generar Cuenta'}
      </Button>
    </div>
  );
}
