'use client';

import { Minus, Plus, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';

interface TimeSelectorProps {
  value: number;
  onChange: (value: number) => void;
  step?: number;
  min?: number;
  max?: number;
  label?: string;
}

export function TimeSelector({
  value,
  onChange,
  step = 5,
  min = 5,
  max = 999,
  label = 'Tiempo (minutos)'
}: TimeSelectorProps) {
  const handleDecrement = () => {
    if (value - step >= min) {
      onChange(value - step);
    }
  };

  const handleIncrement = () => {
    if (value + step <= max) {
      onChange(value + step);
    }
  };

  const formatTime = (minutos: number) => {
    if (minutos >= 60) {
      const h = Math.floor(minutos / 60);
      const m = minutos % 60;
      return m > 0 ? `${h}h ${m}m` : `${h}h`;
    }
    return `${minutos} min`;
  };

  return (
    <div className='flex flex-col gap-1.5'>
      <Label className='text-xs font-medium text-gray-500 uppercase tracking-wide'>{label}</Label>
      <div className='flex items-center border border-gray-300 dark:border-gray-700 rounded-full overflow-hidden bg-gray-100 dark:bg-slate-900/50 h-11'>
        <Button
          type='button'
          variant='ghost'
          size='icon'
          aria-label='Disminuir'
          onClick={handleDecrement}
          disabled={value - step < min}
          className='h-full w-12 rounded-none border-r border-gray-300 dark:border-gray-700 hover:bg-gray-200 dark:hover:bg-slate-800'
        >
          <Minus className='h-4 w-4' />
        </Button>

        <div className='flex-1 flex items-center justify-center gap-1.5 select-none'>
          <Clock className='h-4 w-4 text-gray-400' />
          <span className='text-sm font-bold text-gray-900 dark:text-gray-100'>
            {formatTime(value)}
          </span>
        </div>

        <Button
          type='button'
          variant='ghost'
          size='icon'
          aria-label='Aumentar'
          onClick={handleIncrement}
          disabled={value + step > max}
          className='h-full w-12 rounded-none border-l border-gray-300 dark:border-gray-700 hover:bg-gray-200 dark:hover:bg-slate-800'
        >
          <Plus className='h-4 w-4' />
        </Button>
      </div>
    </div>
  );
}
