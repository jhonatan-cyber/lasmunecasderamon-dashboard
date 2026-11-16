'use client';

import { useState } from 'react';
import { Clock, ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { FIELD_INPUT_CLASS } from '@/lib/ui/fieldStyles';
import { cn } from '@/lib/utils/utils';

interface TimePickerProps {
  id?: string;
  /** Hora seleccionada en formato `HH:MM`. */
  value: string;
  onChange: (time: string) => void;
  disabled?: boolean;
  onBlur?: () => void;
  ariaLabel?: string;
  placeholder?: string;
  className?: string;
}

/** Descompone `HH:MM` en hora y minuto numéricos. */
function parseTime(value?: string): { hours: number; minutes: number } {
  if (!value) return { hours: 0, minutes: 0 };
  const [h, m] = value.split(':').map(Number);
  return { hours: isNaN(h) ? 0 : h, minutes: isNaN(m) ? 0 : m };
}

/** Formatea hora y minuto a `HH:MM`. */
function formatTime(hours: number, minutes: number): string {
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

/** Genera array de 0-23 para horas. */
const hoursOptions = Array.from({ length: 24 }, (_, i) => i);
/** Genera array de 0-55 para minutos (saltos de 5). */
const minutesOptions = Array.from({ length: 12 }, (_, i) => i * 5);

type Step = 'hour' | 'minute';

/** Selector de hora shadcn: botón con formato de input + popover escalonado (hora → minutos). */
export function TimePicker({
  id,
  value,
  onChange,
  disabled = false,
  onBlur,
  ariaLabel,
  placeholder = 'HH:MM',
  className
}: TimePickerProps) {
  const [abierto, setAbierto] = useState(false);
  const [step, setStep] = useState<Step>('hour');
  const { hours, minutes } = parseTime(value);

  const textoHora = value || placeholder;

  const handleHourSelect = (newHour: number) => {
    onChange(formatTime(newHour, minutes));
    setStep('minute');
  };

  const handleMinuteSelect = (newMinute: number) => {
    onChange(formatTime(hours, newMinute));
    setAbierto(false);
    setStep('hour');
  };

  const handleBack = () => {
    setStep('hour');
  };

  const handleOpenChange = (open: boolean) => {
    setAbierto(open);
    if (!open) setStep('hour');
  };

  return (
    <Popover open={abierto} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type='button'
          variant='unstyled'
          disabled={disabled}
          onBlur={onBlur}
          aria-label={ariaLabel ? `${ariaLabel}: ${textoHora}` : undefined}
          className={cn(
            FIELD_INPUT_CLASS,
            'flex items-center justify-between gap-2 rounded-full text-left font-normal',
            !value && 'text-muted-foreground',
            className
          )}
        >
          <span className='truncate'>{textoHora}</span>
          <Clock aria-hidden='true' className='size-4 shrink-0 opacity-60' />
        </Button>
      </PopoverTrigger>
      <PopoverContent className='w-44 p-2' align='start' sideOffset={8}>
        {step === 'hour' ? (
          <div className='flex flex-col gap-1'>
            <span className='text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide'>
              Hora
            </span>
            <div className='h-56 overflow-y-auto'>
              {hoursOptions.map(hour => (
                <Button
                  key={hour}
                  type='button'
                  variant='unstyled'
                  onClick={() => handleHourSelect(hour)}
                  className={cn(
                    'w-full px-3 py-2 text-left text-sm transition-colors hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md justify-start',
                    hour === hours && 'bg-black text-white dark:bg-white dark:text-black'
                  )}
                >
                  {String(hour).padStart(2, '0')}
                </Button>
              ))}
            </div>
          </div>
        ) : (
          <div className='flex flex-col gap-2'>
            <div className='flex items-center gap-2'>
              <Button
                type='button'
                variant='ghost'
                size='sm'
                onClick={handleBack}
                className='h-7 w-7 p-0 rounded-full'
              >
                <ChevronLeft className='h-4 w-4' />
              </Button>
              <span className='text-xs text-gray-500 dark:text-gray-400'>
                {String(hours).padStart(2, '0')}:__
              </span>
            </div>
            <div className='h-56 overflow-y-auto'>
              {minutesOptions.map(minute => (
                <Button
                  key={minute}
                  type='button'
                  variant='unstyled'
                  onClick={() => handleMinuteSelect(minute)}
                  className={cn(
                    'w-full px-3 py-2 text-left text-sm transition-colors hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md justify-start',
                    minute === minutes && 'bg-black text-white dark:bg-white dark:text-black'
                  )}
                >
                  {String(minute).padStart(2, '0')}
                </Button>
              ))}
            </div>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
