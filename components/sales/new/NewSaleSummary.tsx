import { Info, ShoppingCart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatCurrencyNoDecimals } from '@/lib/utils/formatters';

interface NewSaleSummaryProps {
  subtotal: number;
  propina: number;
  total: number;
  metodoPago: string;
  commissionTotal: number;
  loading: boolean;
  disabled: boolean;
  onSubmit: () => void;
}

export const NewSaleSummary = ({
  subtotal,
  propina,
  total,
  metodoPago,
  commissionTotal,
  loading,
  disabled,
  onSubmit
}: NewSaleSummaryProps) => {
  const showCardCommissionNote = metodoPago === 'tarjeta' && commissionTotal > 0;
  const suggestedInvoiceAmount = total - commissionTotal;

  return (
    <div className='my-8 flex flex-col items-center rounded-2xl border-y border-gray-100 bg-gray-50/30 py-10 dark:border-neutral-800 dark:bg-neutral-900/60'>
      <div className='flex flex-col items-center mb-6'>
        <div className='mb-1 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 dark:text-neutral-500'>
          RESUMEN DE PAGO
        </div>

        <div className='flex gap-8 mb-4'>
          <div className='text-center'>
            <div className='text-[10px] font-bold uppercase text-gray-400 dark:text-neutral-500'>
              Subtotal
            </div>
            <div className='text-lg font-semibold text-gray-600 dark:text-neutral-200'>
              {formatCurrencyNoDecimals(subtotal)}
            </div>
          </div>
          <div className='text-center'>
            <div className='text-[10px] font-bold uppercase text-gray-400 dark:text-neutral-500'>
              Propina
            </div>
            <div className='text-lg font-semibold text-gray-600 dark:text-neutral-200'>
              {formatCurrencyNoDecimals(propina)}
            </div>
          </div>
        </div>

        <div className='text-xs font-bold uppercase tracking-widest text-gray-400 dark:text-neutral-500'>
          TOTAL A PAGAR
        </div>
        <div className='my-2 bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-5xl font-black text-transparent dark:from-white dark:to-neutral-400'>
          {formatCurrencyNoDecimals(total)}
        </div>

        {showCardCommissionNote && (
          <div className='mt-4 max-w-xl rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-left text-sm text-amber-950 shadow-sm dark:border-amber-400/30 dark:bg-amber-500/10 dark:text-amber-100'>
            <div className='mb-1 flex items-center gap-2 font-bold uppercase tracking-wide'>
              <Info className='h-4 w-4 shrink-0' />
              Nota de facturación para tarjeta
            </div>
            <p className='leading-relaxed'>
              Facturá o registrá la venta por{' '}
              <strong>{formatCurrencyNoDecimals(suggestedInvoiceAmount)}</strong>. Ese monto
              corresponde al total de productos más propina, descontando la comisión. Registrá la
              propina por <strong>{formatCurrencyNoDecimals(commissionTotal)}</strong>, equivalente
              a la comisión del o los productos seleccionados.
            </p>
          </div>
        )}
      </div>

      <Button
        onClick={onSubmit}
        disabled={disabled}
        className='rounded-full bg-black px-12 py-7 text-lg font-bold text-white shadow-xl shadow-gray-200 transition-all duration-200 hover:scale-105 active:scale-95 disabled:scale-100 disabled:opacity-50 disabled:shadow-none dark:bg-white dark:text-black dark:shadow-black/30'
      >
        <ShoppingCart className='mr-3 w-6 h-6' />
        {loading ? 'Generando Venta...' : 'GENERAR VENTA'}
      </Button>

      {disabled && (
        <div className='mt-4 text-[10px] uppercase tracking-tighter text-gray-400 dark:text-neutral-500'>
          Verifica productos, método de pago y estado de caja
        </div>
      )}
    </div>
  );
};
