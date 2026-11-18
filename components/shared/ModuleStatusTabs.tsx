'use client';

import type { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils/utils';

export interface ModuleStatusTab {
  label: ReactNode;
  count?: ReactNode;
  active: boolean;
  onSelect: () => void;
  tone?: 'warning' | 'success' | 'danger';
}

interface ModuleStatusTabsProps {
  items: ModuleStatusTab[];
  className?: string;
  ariaLabel?: string;
}

export function ModuleStatusTabs({
  items,
  className,
  ariaLabel = 'Filtrar por estado'
}: ModuleStatusTabsProps) {
  return (
    <div
      role='group'
      aria-label={ariaLabel}
      className={cn(
        'flex flex-nowrap justify-start gap-3 overflow-x-auto scroll-smooth border-b pb-1 sm:justify-center [&::-webkit-scrollbar]:hidden [&::-webkit-scrollbar]:h-0 scrollbar-none',
        className
      )}
    >
      {items.map((item, index) => {
        const tone = item.tone ?? 'success';
        const activeStyle =
          tone === 'warning'
            ? 'bg-amber-100 text-amber-700 shadow-xs dark:bg-amber-950 dark:text-amber-200'
            : tone === 'danger'
              ? 'bg-red-100 text-red-700 shadow-xs dark:bg-red-950 dark:text-red-200'
              : 'bg-green-100 text-green-700 shadow-xs dark:bg-green-950 dark:text-green-200';
        const countStyle =
          tone === 'warning'
            ? item.active
              ? 'bg-amber-600 text-white'
              : 'bg-amber-100 text-amber-800'
            : tone === 'danger'
              ? item.active
                ? 'bg-red-600 text-white'
                : 'bg-red-100 text-red-800'
              : item.active
                ? 'bg-green-600 text-white'
                : 'bg-green-100 text-green-800';

        return (
          <Button
            key={index}
            type='button'
            variant='unstyled'
            aria-pressed={item.active}
            onClick={item.onSelect}
            className={cn(
              'flex shrink-0 items-center gap-2 whitespace-nowrap rounded-full px-5 py-2 text-sm font-semibold transition-all',
              item.active
                ? activeStyle
                : 'text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-slate-800'
            )}
          >
            {item.label}{' '}
            {item.count !== undefined && (
              <span
                className={cn('ml-1.5 rounded-full px-2.5 py-0.5 text-xs font-bold', countStyle)}
              >
                {item.count}
              </span>
            )}
          </Button>
        );
      })}
    </div>
  );
}
