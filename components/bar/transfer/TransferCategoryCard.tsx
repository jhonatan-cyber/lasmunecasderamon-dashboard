'use client';

import { Tag, Package, ArrowRight } from 'lucide-react';
import { CardContainer, CardBody } from '@/components/shared/3d-card';
import { cn } from '@/lib/utils/utils';

const ACCENTS = [
  { bg: 'bg-blue-500/15', text: 'text-blue-500' },
  { bg: 'bg-emerald-500/15', text: 'text-emerald-500' },
  { bg: 'bg-violet-500/15', text: 'text-violet-500' },
  { bg: 'bg-amber-500/15', text: 'text-amber-500' },
  { bg: 'bg-rose-500/15', text: 'text-rose-500' },
  { bg: 'bg-cyan-500/15', text: 'text-cyan-500' },
  { bg: 'bg-lime-500/15', text: 'text-lime-500' },
  { bg: 'bg-orange-500/15', text: 'text-orange-500' },
  { bg: 'bg-pink-500/15', text: 'text-pink-500' },
  { bg: 'bg-indigo-500/15', text: 'text-indigo-500' }
];

function accentFor(name: string) {
  let hash = 0;
  for (let index = 0; index < name.length; index += 1) {
    hash = name.charCodeAt(index) + ((hash << 5) - hash);
  }
  return ACCENTS[Math.abs(hash) % ACCENTS.length];
}

interface TransferCategoryCardProps {
  name: string;
  presentationCount: number;
  onClick: () => void;
}

/** Tarjeta de categoría para transferencias, con el mismo lenguaje visual que Bodega. */
export function TransferCategoryCard({
  name,
  presentationCount,
  onClick
}: TransferCategoryCardProps) {
  const accent = accentFor(name);

  return (
    <CardContainer className='inter-var h-full'>
      <CardBody
        className='bg-white relative group/card hover:shadow-2xl hover:shadow-emerald-500/10 dark:bg-black dark:border-white/20 border-black/10 w-auto h-full rounded-xl p-4 sm:p-6 border cursor-pointer hover:scale-105 transition-all duration-300'
        onClick={onClick}
        role='button'
        tabIndex={0}
        onKeyDown={event => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            onClick();
          }
        }}
      >
        <div className='flex items-start justify-between gap-2'>
          <div className='flex min-w-0 items-center gap-2 sm:gap-3'>
            <div
              className={cn(
                'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg sm:h-12 sm:w-12',
                accent.bg
              )}
            >
              <Tag className={cn('h-4 w-4 sm:h-6 sm:w-6', accent.text)} aria-hidden='true' />
            </div>
            <div className='min-w-0'>
              <div
                className='truncate text-sm font-semibold text-neutral-600 transition-colors group-hover:text-blue-600 sm:text-lg dark:text-white'
                title={name}
              >
                {name}
              </div>
              <p className='flex items-center gap-1 text-xs text-gray-500 sm:text-sm dark:text-neutral-300'>
                <Package className='h-3 w-3' aria-hidden='true' />
                {presentationCount} {presentationCount === 1 ? 'presentación' : 'presentaciones'}
              </p>
            </div>
          </div>
          <ArrowRight
            className='h-3 w-3 shrink-0 text-gray-400 opacity-0 transition-opacity group-hover:opacity-100 sm:h-4 sm:w-4'
            aria-hidden='true'
          />
        </div>
      </CardBody>
    </CardContainer>
  );
}
