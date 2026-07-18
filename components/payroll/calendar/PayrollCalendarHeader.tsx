'use client';

import { Grid3X3 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface PayrollCalendarHeaderProps {
  title: string;
  currentView: string;
  selectedCount: number;
  onNavigate: (direction: number) => void;
  onToday: () => void;
  onClearSelection: () => void;
  onChangeView: (view: string) => void;
}

export function PayrollCalendarHeader({
  title,
  currentView,
  selectedCount,
  onNavigate,
  onToday,
  onClearSelection,
  onChangeView
}: PayrollCalendarHeaderProps) {
  return (
    <div className='flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700'>
      <div className='flex items-center gap-4'>
        <Button variant='ghost' size='sm' onClick={() => onNavigate(-1)}>
          <svg className='w-5 h-5' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
            <path
              strokeLinecap='round'
              strokeLinejoin='round'
              strokeWidth={2}
              d='M15 19l-7-7 7-7'
            />
          </svg>
        </Button>

        <h2 className='text-xl font-semibold text-gray-900 dark:text-white min-w-[200px]'>
          {title}
        </h2>

        <Button variant='ghost' size='sm' onClick={() => onNavigate(1)}>
          <svg className='w-5 h-5' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
            <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M9 5l7 7-7 7' />
          </svg>
        </Button>
      </div>

      <div className='flex items-center gap-2'>
        <Button variant='secondary' onClick={onToday}>
          Hoy
        </Button>

        {selectedCount > 0 && (
          <Button variant='ghost' size='sm' onClick={onClearSelection}>
            Limpiar ({selectedCount})
          </Button>
        )}

        <div className='flex gap-1 ml-4'>
          <Button
            variant={currentView === 'multi' ? 'default' : 'outline-solid'}
            size='sm'
            onClick={() => onChangeView('multi')}
          >
            <Grid3X3 className='w-3 h-3 sm:w-4 sm:h-4' />
          </Button>
          <Button
            variant={currentView === 'month' ? 'default' : 'outline-solid'}
            size='sm'
            onClick={() => onChangeView('month')}
          >
            Mes
          </Button>
        </div>
      </div>
    </div>
  );
}
