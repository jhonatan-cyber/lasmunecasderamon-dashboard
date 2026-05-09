'use client';

import * as React from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils/utils';

interface CollapsibleSectionProps {
  title: string;
  icon?: React.ComponentType<{ className?: string }>;
  defaultOpen?: boolean;
  children: React.ReactNode;
  className?: string;
}

export default function CollapsibleSection({
  title,
  icon: Icon,
  defaultOpen = false,
  children,
  className
}: CollapsibleSectionProps) {
  const [isOpen, setIsOpen] = React.useState(defaultOpen);

  return (
    <div
      className={cn(
        'rounded-lg border border-slate-200/80 bg-white dark:border-slate-800 dark:bg-slate-950/30 overflow-hidden',
        className
      )}
    >
      <button
        type='button'
        onClick={() => setIsOpen(!isOpen)}
        className='flex w-full items-center justify-between px-4 py-3 text-left transition-colors hover:bg-slate-50 dark:hover:bg-slate-900/30'
      >
        <div className='flex items-center gap-2'>
          {Icon && <Icon className='h-4 w-4 text-slate-600 dark:text-slate-400' />}
          <span className='text-sm font-semibold text-slate-900 dark:text-slate-100'>{title}</span>
        </div>
        <ChevronDown
          className={cn(
            'h-4 w-4 text-slate-500 transition-transform duration-200',
            isOpen && 'rotate-180'
          )}
        />
      </button>

      <div
        className={cn(
          'overflow-hidden transition-all duration-200 ease-out',
          isOpen ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'
        )}
      >
        <div className='p-4 pt-0'>{children}</div>
      </div>
    </div>
  );
}
