import { Receipt, ShoppingCart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatCurrencyNoDecimals } from '@/lib/utils/formatters';
import { useConfigValue } from '@/hooks/shared/useConfigValue';
import { getCardSplit } from '@/components/orders/productModalRules';

interface NewSaleSummaryProps {
  subtotal: number;
  propina: number;
  metodoPago: string;
  total: number;
  loading: boolean;
  disabled: boolean;
  onSubmit: () => void;
}

export const NewSaleSummary = ({
  subtotal,
  propina,
  metodoPago,
  total,
  loading,
  disabled,
  onSubmit
}: NewSaleSummaryProps) => {
  const splitVentaPct = Number(useConfigValue('comisiones', 'split_tarjeta_venta', '51'));
  const splitPropinaPct = Number(useConfigValue('comisiones', 'split_tarjeta_propina', '49'));
  const esTarjeta = metodoPago === 'tarjeta';
  const splitTarjeta = esTarjeta ? getCardSplit(total) : { venta: 0, propina: 0 };

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
        <div className='my-2 bg-linear-to-r from-gray-900 to-gray-600 bg-clip-text text-5xl font-black text-transparent dark:from-white dark:to-neutral-400'>
          {formatCurrencyNoDecimals(total)}
        </div>
      </div>

      {esTarjeta && total > 0 && (
        <div className='mb-4 flex items-center gap-3 rounded-xl border border-amber-200/70 bg-amber-50/80 px-3 py-2 dark:border-amber-500/20 dark:bg-amber-500/10'>
          <div className='flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300'>
            <Receipt className='h-4 w-4' />
          </div>
          <p className='text-xs leading-5 text-slate-700 dark:text-slate-100'>
            <span className='font-black uppercase tracking-[0.22em] text-amber-700 dark:text-amber-300'>
              Tarjetero
            </span>{' '}
            Genera venta por{' '}
            <span className='font-black text-emerald-600 dark:text-emerald-300'>
              {formatCurrencyNoDecimals(splitTarjeta.venta)}
            </span>{' '}
            ({splitVentaPct}%) y propina por{' '}
            <span className='font-black text-fuchsia-600 dark:text-fuchsia-300'>
              {formatCurrencyNoDecimals(splitTarjeta.propina)}
            </span>{' '}
            ({splitPropinaPct}%). Solo informativo, no afecta la caja.
          </p>
        </div>
      )}

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
