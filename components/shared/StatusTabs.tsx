'use client';

import type { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils/utils';

interface StatusTab {
  label: ReactNode;
  count?: ReactNode;
  active: boolean;
  onSelect: () => void;
  tone?: 'warning' | 'success' | 'danger';
}

export function StatusTabs({ items, className }: { items: StatusTab[]; className?: string }) {
  return (
    <div
      role='group'
      aria-label='Filtrar por estado'
      className={cn('flex flex-nowrap justify-start sm:justify-center gap-3 border-b pb-1 overflow-x-auto scroll-smooth -mx-4 px-4 sm:mx-0 sm:px-0 [&::-webkit-scrollbar]:hidden [&::-webkit-scrollbar]:h-0 scrollbar-none', className)}
    >
      {items.map((item, index) => {
        const warning = item.tone === 'warning';
        const danger = item.tone === 'danger';
        return (
          <Button
            key={index}
            type='button'
            variant='unstyled'
            aria-pressed={item.active}
            onClick={item.onSelect}
            className={cn(
              'flex items-center gap-2 rounded-full px-5 py-2 text-sm font-semibold transition-all whitespace-nowrap',
              item.active
                ? warning
                  ? 'bg-amber-100 text-amber-700 shadow-xs dark:bg-amber-950 dark:text-amber-200'
                  : danger
                    ? 'bg-red-100 text-red-700 shadow-xs dark:bg-red-950 dark:text-red-200'
                    : 'bg-green-100 text-green-700 shadow-xs dark:bg-green-950 dark:text-green-200'
                : 'text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-slate-800'
            )}
          >
            {item.label}{' '}
            {item.count !== undefined && (
              <span
                className={cn(
                  'ml-1.5 rounded-full px-2.5 py-0.5 text-xs font-bold',
                  warning
                    ? item.active
                      ? 'bg-amber-600 text-white'
                      : 'bg-amber-100 text-amber-800'
                    : danger
                      ? item.active
                        ? 'bg-red-600 text-white'
                        : 'bg-red-100 text-red-800'
                      : item.active
                        ? 'bg-green-600 text-white'
                        : 'bg-green-100 text-green-800'
                )}
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
