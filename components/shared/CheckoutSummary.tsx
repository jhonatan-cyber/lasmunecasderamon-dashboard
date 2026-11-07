'use client';

import type { ReactNode } from 'react';
import { ShoppingCart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatCurrencyNoDecimals } from '@/lib/utils/formatters';

interface CheckoutSummaryProps {
  title: string;
  actionLabel: string;
  subtotal: number;
  propina: number;
  total: number;
  disabled?: boolean;
  loading?: boolean;
  onSubmit?: () => void;
  tipControl?: ReactNode;
  children?: ReactNode;
}

export function CheckoutSummary({
  title,
  actionLabel,
  subtotal,
  propina,
  total,
  disabled = false,
  loading = false,
  onSubmit,
  tipControl,
  children
}: CheckoutSummaryProps) {
  return (
    <section className='flex h-full flex-col rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-950 sm:p-6'>
      <div className='mb-5 min-w-0'>
        <div className='mb-4'>
          <h2 className='text-xs font-semibold uppercase tracking-[0.16em] text-neutral-500 dark:text-neutral-400'>
            {title}
          </h2>
          <p className='mt-1 text-xs leading-relaxed text-muted-foreground'>
            Total actualizado en tiempo real
          </p>
        </div>
        <div className='flex min-w-0 flex-col items-start gap-3'>
          <div className='min-w-0'>
            <p className='text-[10px] font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400'>
              Total a pagar
            </p>
            <p className='mt-1 break-words text-3xl font-semibold tabular-nums tracking-tight text-neutral-900 dark:text-neutral-50 sm:text-4xl'>
              {formatCurrencyNoDecimals(total)}
            </p>
          </div>
          {tipControl && <div className='w-full max-w-sm'>{tipControl}</div>}
        </div>
      </div>

      <div className='mb-4 grid grid-cols-2 gap-3 rounded-xl bg-neutral-50 p-3 dark:bg-neutral-900'>
        <div>
          <p className='text-[10px] font-medium uppercase tracking-wide text-muted-foreground'>
            Subtotal
          </p>
          <p className='mt-0.5 text-sm font-semibold tabular-nums text-foreground'>
            {formatCurrencyNoDecimals(subtotal)}
          </p>
        </div>
        <div className='text-right'>
          <p className='text-[10px] font-medium uppercase tracking-wide text-muted-foreground'>
            Propina
          </p>
          <p className='mt-0.5 text-sm font-semibold tabular-nums text-foreground'>
            {formatCurrencyNoDecimals(propina)}
          </p>
        </div>
      </div>

      {children}

      <Button
        type='button'
        onClick={onSubmit}
        disabled={disabled}
        className='mt-auto min-h-11 w-full rounded-full bg-black px-5 text-sm font-semibold text-white transition-colors hover:bg-neutral-800 disabled:opacity-50 dark:bg-white dark:text-black dark:hover:bg-neutral-200'
      >
        <ShoppingCart className='mr-2 h-4 w-4' aria-hidden='true' />
        {loading ? 'Procesando…' : actionLabel}
      </Button>

      {disabled && (
        <p className='mt-3 text-center text-[10px] text-muted-foreground'>
          Verifica productos, método de pago y estado de caja
        </p>
      )}
    </section>
  );
}
