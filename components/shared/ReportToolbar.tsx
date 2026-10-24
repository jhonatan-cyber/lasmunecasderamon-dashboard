'use client';

import { Download } from 'lucide-react';
import { DatePicker } from '@/components/shared/DatePicker';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils/utils';

export interface ReportToolbarProps<T extends string = string> {
  period: string;
  periods: readonly { id: T; label: string }[];
  startDate: string;
  endDate: string;
  onPeriodChange: (period: T) => void;
  onStartDateChange: (date: string) => void;
  onEndDateChange: (date: string) => void;
  onExport: () => void;
}

export const DAILY_REPORT_PERIODS = [
  { id: 'today', label: 'Hoy' },
  { id: 'yesterday', label: 'Ayer' },
  { id: 'week', label: 'Esta Semana' },
  { id: 'month', label: 'Este Mes' },
  { id: 'custom', label: 'Personalizado' }
] as const;

export function ReportToolbar<T extends string>({
  period,
  periods,
  startDate,
  endDate,
  onPeriodChange,
  onStartDateChange,
  onEndDateChange,
  onExport
}: ReportToolbarProps<T>) {
  return (
    <div className='flex flex-col items-center justify-between gap-6 md:flex-row'>
      <div
        role='group'
        aria-label='Periodo del reporte'
        className='flex flex-wrap items-center gap-2 rounded-3xl border border-gray-200/50 bg-gray-100/50 p-1.5 dark:border-gray-700/50 dark:bg-gray-800/50'
      >
        {periods.map(item => (
          <Button
            key={item.id}
            type='button'
            variant='unstyled'
            aria-pressed={period === item.id}
            onClick={() => onPeriodChange(item.id)}
            className={cn(
              'rounded-full px-4 py-2 text-sm font-semibold transition-colors',
              period === item.id
                ? 'bg-white text-gray-900 shadow-xs dark:bg-gray-700 dark:text-white'
                : 'text-gray-500 hover:bg-gray-200/50 dark:text-gray-400 dark:hover:bg-gray-700/50'
            )}
          >
            {item.label}
          </Button>
        ))}
      </div>
      <div className='flex flex-wrap items-center gap-3'>
        {period === 'custom' && (
          <div className='flex items-center gap-2'>
            <DatePicker
              ariaLabel='Fecha inicial'
              displayFormat='short'
              className='w-[9.5rem]'
              value={startDate}
              onChange={onStartDateChange}
            />
            <span aria-hidden='true' className='text-gray-400'>
              →
            </span>
            <DatePicker
              ariaLabel='Fecha final'
              displayFormat='short'
              className='w-[9.5rem]'
              value={endDate}
              onChange={onEndDateChange}
            />
          </div>
        )}
        <Button type='button' onClick={onExport} className='rounded-full px-6'>
          <Download className='mr-2 h-4 w-4' />
          Exportar
        </Button>
      </div>
    </div>
  );
}
