'use client';

import { Skeleton } from '@/components/ui/skeleton';
import { Wallet, TrendingDown } from 'lucide-react';
import { formatCurrencyNoDecimals } from '@/lib/utils/formatters';

interface CajaSummaryMetricsProps {
  isLoading: boolean;
  totalMetodosPago: number;
  totalEgresos: number;
  totalReal: number;
}

function MetricSkeleton() {
  return (
    <div className='bg-white dark:bg-gray-800 p-3 rounded-xl border border-gray-200 dark:border-gray-700'>
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

export function CajaSummaryMetrics({
  isLoading,
  totalMetodosPago,
  totalEgresos,
  totalReal
}: CajaSummaryMetricsProps) {
  return (
    <div className='grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4'>
      {isLoading ? (
        <>
          <MetricSkeleton />
          <MetricSkeleton />
          <MetricSkeleton />
        </>
      ) : (
        <>
          <div className='bg-violet-50 dark:bg-violet-900/20 p-3 rounded-xl border border-violet-100 dark:border-violet-800'>
            <div className='flex items-center gap-3'>
              <div className='w-10 h-10 bg-violet-500/10 rounded-lg flex items-center justify-center'>
                <Wallet className='w-5 h-5 text-violet-600 dark:text-violet-400' />
              </div>
              <div>
                <p className='text-xs font-bold text-violet-600 dark:text-violet-400 uppercase'>
                  Subtotal
                </p>
                <p className='text-lg font-black text-violet-700 dark:text-violet-300'>
                  {formatCurrencyNoDecimals(totalMetodosPago)}
                </p>
                <p className='text-[11px] text-violet-600/80 dark:text-violet-300/80'>
                  Antes de egresos
                </p>
              </div>
            </div>
          </div>

          <div className='bg-rose-50 dark:bg-rose-900/20 p-3 rounded-xl border border-rose-100 dark:border-rose-800'>
            <div className='flex items-center gap-3'>
              <div className='w-10 h-10 bg-rose-500/10 rounded-lg flex items-center justify-center'>
                <TrendingDown className='w-5 h-5 text-rose-600 dark:text-rose-400' />
              </div>
              <div>
                <p className='text-xs font-bold text-rose-600 dark:text-rose-400 uppercase'>
                  Egresos
                </p>
                <p className='text-lg font-black text-gray-900 dark:text-white'>
                  {formatCurrencyNoDecimals(totalEgresos)}
                </p>
              </div>
            </div>
          </div>

          <div className='bg-emerald-50 dark:bg-emerald-900/20 p-3 rounded-xl border border-emerald-100 dark:border-emerald-800'>
            <div className='flex items-center gap-3'>
              <div className='w-10 h-10 bg-emerald-500/10 rounded-lg flex items-center justify-center'>
                <Wallet className='w-5 h-5 text-emerald-600 dark:text-emerald-400' />
              </div>
              <div>
                <p className='text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase'>
                  Total real
                </p>
                <p className='text-lg font-black text-gray-900 dark:text-white'>
                  {formatCurrencyNoDecimals(totalReal)}
                </p>
                <p className='text-[11px] text-emerald-600/80 dark:text-emerald-300/80'>
                  Subtotal - egresos
                </p>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
