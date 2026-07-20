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
    <div className='flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3 sm:p-4 border-b border-gray-200 dark:border-gray-700'>
      <div className='flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-start'>
        <div className='flex items-center gap-1 sm:gap-4'>
          <Button
            variant='ghost'
            size='sm'
            onClick={() => onNavigate(-1)}
            className='h-8 w-8 p-0 shrink-0'
          >
            <svg
              className='w-4 h-4 sm:w-5 sm:h-5'
              fill='none'
              stroke='currentColor'
              viewBox='0 0 24 24'
            >
              <path
                strokeLinecap='round'
                strokeLinejoin='round'
                strokeWidth={2}
                d='M15 19l-7-7 7-7'
              />
            </svg>
          </Button>

          <h2 className='text-base sm:text-xl font-semibold text-gray-900 dark:text-white truncate max-w-[160px] sm:max-w-none'>
            {title}
          </h2>

          <Button
            variant='ghost'
            size='sm'
            onClick={() => onNavigate(1)}
            className='h-8 w-8 p-0 shrink-0'
          >
            <svg
              className='w-4 h-4 sm:w-5 sm:h-5'
              fill='none'
              stroke='currentColor'
              viewBox='0 0 24 24'
            >
              <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M9 5l7 7-7 7' />
            </svg>
          </Button>
        </div>

        <div className='flex gap-1 sm:hidden'>
          <Button
            variant={currentView === 'multi' ? 'default' : 'outline-solid'}
            size='sm'
            onClick={() => onChangeView('multi')}
            className='h-8 w-8 p-0'
          >
            <Grid3X3 className='w-3 h-3' />
          </Button>
          <Button
            variant={currentView === 'month' ? 'default' : 'outline-solid'}
            size='sm'
            onClick={() => onChangeView('month')}
            className='h-8 px-2 text-xs'
          >
            Mes
          </Button>
        </div>
      </div>

      <div className='flex items-center gap-1.5 sm:gap-2 w-full sm:w-auto'>
        <Button
          variant='secondary'
          size='sm'
          onClick={onToday}
          className='h-8 px-3 text-xs sm:text-sm'
        >
          Hoy
        </Button>

        {selectedCount > 0 && (
          <Button
            variant='ghost'
            size='sm'
            onClick={onClearSelection}
            className='h-8 px-2 text-xs sm:text-sm'
          >
            Limpiar ({selectedCount})
          </Button>
        )}

        <div className='hidden sm:flex gap-1 ml-2'>
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
