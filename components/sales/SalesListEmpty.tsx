'use client';

import { Skeleton } from '@/components/ui/skeleton';
import { ShoppingCart } from 'lucide-react';

export function SaleCardSkeleton() {
  return (
    <div className='rounded-4xl border border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6'>
      <div className='flex items-center justify-between mb-5'>
        <Skeleton className='h-12 w-12 rounded-2xl' />
        <Skeleton className='h-6 w-28 rounded-full' />
      </div>
      <Skeleton className='h-3 w-24 rounded-full mb-2' />
      <Skeleton className='h-10 w-36 rounded-lg mb-5' />
      <div className='rounded-2xl bg-gray-50 dark:bg-slate-800/50 p-4 mb-4 space-y-3'>
        <div className='flex justify-between'>
          <Skeleton className='h-5 w-32 rounded-lg' />
          <Skeleton className='h-5 w-20 rounded-lg' />
        </div>
        <Skeleton className='h-4 w-44 rounded-lg' />
        <div className='flex gap-2'>
          <Skeleton className='h-6 w-16 rounded-full' />
          <Skeleton className='h-6 w-14 rounded-full' />
        </div>
      </div>
      <div className='flex gap-2'>
        <Skeleton className='h-10 flex-1 rounded-2xl' />
        <Skeleton className='h-10 flex-1 rounded-2xl' />
      </div>
    </div>
  );
}

export function SalesListEmptyState({ hasFilters }: { hasFilters: boolean }) {
  return (
    <div className='col-span-full flex flex-col items-center justify-center py-24 px-6'>
      <div className='w-24 h-24 rounded-4xl bg-gray-100 dark:bg-slate-800 flex items-center justify-center mb-5'>
        <ShoppingCart className='w-10 h-10 text-gray-300 dark:text-slate-600' />
      </div>
      <h3 aria-live='polite' className='text-xl font-black text-gray-800 dark:text-slate-100 mb-2'>
        {hasFilters ? 'Sin resultados' : 'Sin ventas aún'}
      </h3>
      <p className='text-sm text-gray-400 dark:text-slate-500 text-center max-w-sm leading-relaxed'>
        {hasFilters
          ? 'No encontramos ventas con estos filtros. Probá con otros criterios.'
          : 'Cuando registres tu primera venta, va a aparecer acá.'}
      </p>
    </div>
  );
}
