'use client';

import { cn } from '@/lib/utils/utils';
import { Button } from '@/components/ui/button';
import { ProductPhoto } from '@/components/shared/ProductPhoto';
import { Users, Tag, Percent } from 'lucide-react';
import { formatCurrencyCLP } from '@/lib/utils/formatters';
import { useState, useEffect } from 'react';

interface SettingsProductCardProps {
  id: string;
  name: string;
  presentacion: string;
  foto?: string | null;
  price: number;
  commission: number;
  maxAnfitrionas: number | null;
  isSelected?: boolean;
  hasPending?: boolean;
  onClick: () => void;
}

export function SettingsProductCard({
  id,
  name,
  presentacion,
  foto,
  price,
  commission,
  maxAnfitrionas,
  isSelected = false,
  hasPending = false,
  onClick
}: SettingsProductCardProps) {
  const [imgFailed, setImgFailed] = useState(false);

  const src =
    !foto || foto === 'default.png'
      ? '/api/images/products/default.png'
      : /^(https?:\/\/|\/)/.test(foto)
        ? foto
        : `/api/images/products/${foto}`;

  useEffect(() => setImgFailed(false), [src]);

  return (
    <Button
      variant='unstyled'
      type='button'
      onClick={onClick}
      className={cn(
        'group flex flex-col items-start gap-3 rounded-2xl border p-4 text-left transition-all duration-200',
        'bg-white dark:bg-neutral-900',
        'border-neutral-200 dark:border-neutral-800',
        isSelected
          ? 'ring-2 ring-black dark:ring-white border-black dark:border-white shadow-md'
          : 'hover:ring-2 hover:ring-neutral-300 dark:hover:ring-neutral-600 hover:shadow-sm'
      )}
    >
      {/* Product photo */}
      <div className='flex w-full items-center gap-3'>
        <div className='relative h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-neutral-100 dark:bg-neutral-800'>
          <ProductPhoto
            key={src}
            src={imgFailed ? '/api/images/products/default.png' : src}
            alt=''
            width={56}
            height={56}
            className='h-14 w-14 object-contain'
            onError={() => setImgFailed(true)}
          />
          {hasPending && (
            <span className='absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center'>
              <span className='h-3 w-3 rounded-full bg-amber-400 ring-2 ring-white dark:ring-neutral-900' />
            </span>
          )}
        </div>
        <div className='min-w-0 flex-1'>
          <p className='text-sm font-semibold text-neutral-900 dark:text-neutral-100 truncate'>
            {name}
          </p>
          <p className='text-xs text-neutral-500 dark:text-neutral-400 truncate'>{presentacion}</p>
        </div>
      </div>

      {/* Product details grid */}
      <div className='grid grid-cols-2 gap-2 w-full'>
        {/* Price */}
        <div
          className={cn(
            'flex items-center gap-1.5 rounded-lg px-2.5 py-1.5',
            'bg-sky-50 text-sky-700 dark:bg-sky-950/30 dark:text-sky-300'
          )}
        >
          <Tag className='h-3.5 w-3.5 shrink-0' aria-hidden='true' />
          <span className='text-xs font-medium truncate'>{formatCurrencyCLP(price)}</span>
        </div>

        {/* Commission */}
        <div
          className={cn(
            'flex items-center gap-1.5 rounded-lg px-2.5 py-1.5',
            'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300'
          )}
        >
          <Percent className='h-3.5 w-3.5 shrink-0' aria-hidden='true' />
          <span className='text-xs font-medium truncate'>{formatCurrencyCLP(commission)}</span>
        </div>

        {/* Max anfitrionas */}
        <div
          className={cn(
            'flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 col-span-2',
            maxAnfitrionas !== null && maxAnfitrionas > 0
              ? 'bg-violet-50 text-violet-700 dark:bg-violet-950/30 dark:text-violet-300'
              : 'bg-neutral-50 text-neutral-600 dark:bg-neutral-800/50 dark:text-neutral-400'
          )}
        >
          <Users className='h-3.5 w-3.5 shrink-0' aria-hidden='true' />
          <span className='text-xs font-medium'>
            {maxAnfitrionas !== null && maxAnfitrionas > 0
              ? `${maxAnfitrionas} anfitrionas`
              : 'Sin límite (default)'}
          </span>
        </div>
      </div>
    </Button>
  );
}
