import type { ComponentProps } from 'react';
import { cn } from '@/lib/utils/utils';

/** Keeps filter controls aligned; narrow screens can scroll the same single row. */
export function FilterBar({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      role='group'
      aria-label='Filtros'
      className={cn(
        'flex w-full flex-nowrap items-end gap-4 overflow-x-auto pb-2 [&>*]:flex-[1_0_160px]',
        className
      )}
      {...props}
    />
  );
}
