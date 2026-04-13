import { ShoppingCart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatCurrencyNoDecimals } from '@/lib/utils/formatters';

interface NewSaleSummaryProps {
  subtotal: number;
  propina: number;
  total: number;
  loading: boolean;
  disabled: boolean;
  onSubmit: () => void;
}

export const NewSaleSummary = ({
  subtotal, propina, total, loading, disabled, onSubmit
}: NewSaleSummaryProps) => {
  return (
    <div className='flex flex-col items-center py-10 border-y border-gray-100 my-8 bg-gray-50/30 rounded-2xl'>
      <div className="flex flex-col items-center mb-6">
        <div className='text-[10px] text-gray-400 font-black uppercase tracking-[0.2em] mb-1'>RESUMEN DE PAGO</div>
        
        <div className="flex gap-8 mb-4">
          <div className="text-center">
            <div className="text-[10px] text-gray-400 uppercase font-bold">Subtotal</div>
            <div className="text-lg font-semibold text-gray-600">{formatCurrencyNoDecimals(subtotal)}</div>
          </div>
          <div className="text-center">
            <div className="text-[10px] text-gray-400 uppercase font-bold">Propina</div>
            <div className="text-lg font-semibold text-gray-600">{formatCurrencyNoDecimals(propina)}</div>
          </div>
        </div>

        <div className='text-xs text-gray-400 font-bold uppercase tracking-widest'>TOTAL A PAGAR</div>
        <div className='text-5xl font-black my-2 bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-600'>
          {formatCurrencyNoDecimals(total)}
        </div>
      </div>

      <Button 
        onClick={onSubmit} 
        disabled={disabled} 
        className='bg-black text-white rounded-full px-12 py-7 text-lg font-bold hover:scale-105 active:scale-95 transition-all duration-200 shadow-xl shadow-gray-200 disabled:opacity-50 disabled:scale-100 disabled:shadow-none'
      >
        <ShoppingCart className='mr-3 w-6 h-6' /> 
        {loading ? 'Generando Venta...' : 'GENERAR VENTA'}
      </Button>
      
      {disabled && (
        <div className="mt-4 text-[10px] text-gray-400 uppercase tracking-tighter">
          Verifica productos, método de pago y estado de caja
        </div>
      )}
    </div>
  );
};
