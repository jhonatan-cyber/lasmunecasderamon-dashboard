import { Receipt } from 'lucide-react';
import { formatCurrencyNoDecimals } from '@/lib/utils/formatters';
import { useConfigValue } from '@/hooks/shared/useConfigValue';
import { getCardSplit } from '@/components/orders/productModalRules';
import { PrepagoNotice } from '@/components/shared/PrepagoNotice';
import { CheckoutSummary } from '@/components/shared/CheckoutSummary';
import { TipToggle } from '@/components/shared/TipToggle';
import { Label } from '@/components/ui/label';

interface NewSaleSummaryProps {
  subtotal: number;
  propina: number;
  metodoPago: string;
  total: number;
  loading: boolean;
  disabled: boolean;
  onSubmit: () => void;
  saldo?: number;
  enableTip: boolean;
  onTipToggle: (enabled: boolean) => void;
}

export const NewSaleSummary = ({
  subtotal,
  propina,
  metodoPago,
  total,
  loading,
  disabled,
  onSubmit,
  saldo = 0,
  enableTip,
  onTipToggle
}: NewSaleSummaryProps) => {
  const splitVentaPct = Number(useConfigValue('comisiones', 'split_tarjeta_venta', '51'));
  const splitPropinaPct = Number(useConfigValue('comisiones', 'split_tarjeta_propina', '49'));
  const propinaPct = Number(useConfigValue('facturacion', 'propina_venta', '10'));
  const esTarjeta = metodoPago === 'tarjeta';
  const splitTarjeta = esTarjeta ? getCardSplit(total) : { venta: 0, propina: 0 };

  return (
    <CheckoutSummary
      title='Resumen de pago'
      actionLabel='Generar venta'
      subtotal={subtotal}
      propina={propina}
      total={total}
      loading={loading}
      disabled={disabled}
      onSubmit={onSubmit}
      tipControl={
        <div className='space-y-1'>
          <Label className='block text-xs font-medium leading-snug text-neutral-500 dark:text-neutral-400'>
            Propina sugerida ({propinaPct}%)
          </Label>
          <TipToggle amount={propina} enabled={enableTip} onToggle={onTipToggle} />
        </div>
      }
    >
      <div className='mb-4'>
        <PrepagoNotice saldo={saldo} total={total} className='w-full' />
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
    </CheckoutSummary>
  );
};
