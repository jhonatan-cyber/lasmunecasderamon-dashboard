'use client';

import { Skeleton } from '@/components/ui/skeleton';
import { ShoppingCart } from 'lucide-react';

export function SaleCardSkeleton() {
  return (
    <div className='rounded-xl border border-l-4 border-neutral-200 border-l-neutral-300 bg-white p-4 shadow-sm dark:border-neutral-800 dark:border-l-neutral-700 dark:bg-neutral-950 sm:p-5'>
      <div className='flex items-start justify-between gap-3'>
        <div className='space-y-2'>
          <Skeleton className='h-3 w-36 rounded' />
          <Skeleton className='h-3 w-28 rounded' />
        </div>
        <Skeleton className='h-6 w-24 rounded-md' />
      </div>
      <div className='mt-4 flex items-end justify-between gap-4'>
        <div className='space-y-2'>
          <Skeleton className='h-3 w-12 rounded' />
          <Skeleton className='h-8 w-32 rounded' />
        </div>
        <div className='space-y-2'>
          <Skeleton className='ml-auto h-4 w-28 rounded' />
          <Skeleton className='ml-auto h-3 w-20 rounded' />
        </div>
      </div>
      <div className='mt-4 flex gap-4 border-t border-neutral-100 pt-3 dark:border-neutral-800'>
        <Skeleton className='h-4 w-24 rounded' />
        <Skeleton className='h-4 w-20 rounded' />
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
