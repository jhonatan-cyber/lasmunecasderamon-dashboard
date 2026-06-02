'use client';

import { ArrowDownCircle, CreditCard, Wallet } from 'lucide-react';
import type { ReactNode } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrencyNoDecimals } from '@/lib/utils/formatters';

interface CajaPaymentSummaryProps {
  isLoading: boolean;
  efectivoNeto: number;
  tarjetaCaja: number;
  transferenciaCaja: number;
}

function PaymentSummarySkeleton() {
  return (
    <div className='bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-200 dark:border-slate-700'>
      <div className='flex items-center gap-3'>
        <Skeleton className='w-10 h-10 rounded-lg' />
        <div className='flex-1'>
          <Skeleton className='h-3 w-20 mb-2' />
          <Skeleton className='h-5 w-28' />
        </div>
      </div>
    </div>
  );
}

function PaymentSummaryCard({
  label,
  value,
  icon,
  accentClass,
  valueClassName = 'text-gray-900 dark:text-white',
  note
}: {
  label: string;
  value: number;
  icon: ReactNode;
  accentClass: string;
  valueClassName?: string;
  note?: string;
}) {
  return (
    <div className='bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-200 dark:border-slate-700'>
      <div className='flex items-center gap-3'>
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${accentClass}`}>
          {icon}
        </div>
        <div>
          <p className='text-xs font-bold text-slate-600 dark:text-slate-300 uppercase'>{label}</p>
          <p className={`text-lg font-black ${valueClassName}`}>{formatCurrencyNoDecimals(value)}</p>
          {note && <p className='text-[11px] text-slate-500 dark:text-slate-400'>{note}</p>}
        </div>
      </div>
    </div>
  );
}

export function CajaPaymentSummary({
  isLoading,
  efectivoNeto,
  tarjetaCaja,
  transferenciaCaja
}: CajaPaymentSummaryProps) {
  return (
    <div className='grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4'>
      {isLoading ? (
        <>
          <PaymentSummarySkeleton />
          <PaymentSummarySkeleton />
          <PaymentSummarySkeleton />
        </>
      ) : (
        <>
          <PaymentSummaryCard
            label='Efectivo'
            value={efectivoNeto}
            accentClass='bg-green-500/10'
            icon={<Wallet className='w-5 h-5 text-green-600 dark:text-green-400' />}
            note='Apertura + efectivo - egresos'
          />
          <PaymentSummaryCard
            label='Tarjeta'
            value={tarjetaCaja}
            accentClass='bg-sky-500/10'
            icon={<CreditCard className='w-5 h-5 text-sky-600 dark:text-sky-400' />}
          />
          <PaymentSummaryCard
            label='Transferencia'
            value={transferenciaCaja}
            accentClass='bg-violet-500/10'
            icon={<ArrowDownCircle className='w-5 h-5 text-violet-600 dark:text-violet-400' />}
          />
        </>
      )}
    </div>
  );
}
