import React, { useState } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Label } from '@/components/ui/label';
import { Clock } from 'lucide-react';
import {
  ORDER_FIELD_LABEL_CLASS,
  ORDER_FIELD_POPOVER_CLASS,
  ORDER_MULTISELECT_TRIGGER_CLASS
} from '@/components/orders/orderFieldStyles';

interface TimeSelectProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  placeholder?: string;
  className?: string;
  required?: boolean;
  disabled?: boolean;
  timeOptions?: number[];
}

const DEFAULT_TIME_OPTIONS = Array.from({ length: 12 }, (_, i) => (i + 1) * 5); 

const TimeSelect: React.FC<TimeSelectProps> = ({
  value,
  onChange,
  label = 'Tiempo',
  placeholder = 'Seleccione tiempo',
  className = '',
  required = false,
  disabled = false,
  timeOptions = DEFAULT_TIME_OPTIONS
}) => {
  const [open, setOpen] = useState(false);
  const uniqueId = React.useId();

  const selectedTime = timeOptions.find(t => t.toString() === value);

  const handleValueChange = (newValue: string) => {
    setOpen(false);
    onChange(newValue);
  };

  const formatTime = (min: number) => {
    if (min % 60 === 0) return `${min / 60} horas`;
    if (min < 60) return `${min} min`;
    return `${Math.floor(min / 60)}h ${min % 60}m`;
  };

  return (
    <div className={`flex flex-col ${className}`}>
      <Label htmlFor={uniqueId} className={ORDER_FIELD_LABEL_CLASS}>
        {label}
        {required && <span className='ml-1 text-red-500'>*</span>}
      </Label>

      <div className='relative'>
        <Popover open={open} onOpenChange={nextOpen => !disabled && setOpen(nextOpen)}>
          <PopoverTrigger asChild>
            <button
              id={uniqueId}
              type='button'
              className={`${ORDER_MULTISELECT_TRIGGER_CLASS} flex items-center gap-2 pr-10`}
              onClick={() => !disabled && setOpen(!open)}
              disabled={disabled}
            >
              <Clock className='w-4 h-4 text-gray-400 shrink-0' />
              {selectedTime ? (
                <span className='truncate text-sm text-gray-900 dark:text-white'>
                  {formatTime(selectedTime)}
                </span>
              ) : (
                <span className='text-sm text-gray-400 truncate'>{placeholder}</span>
              )}
            </button>
          </PopoverTrigger>
          <PopoverContent align='start' className={ORDER_FIELD_POPOVER_CLASS} sideOffset={5}>
            <div className='max-h-60 overflow-y-auto p-1'>
              {timeOptions.map(time => {
                const isSelected = time.toString() === value;
                return (
                  <button
                    key={time}
                    type='button'
                    className={`flex w-full items-center justify-between gap-2 rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-gray-100 ${isSelected ? 'bg-gray-100' : ''}`}
                    onClick={() => handleValueChange(time.toString())}
                    disabled={disabled}
                  >
                    <span className='text-gray-700'>{formatTime(time)}</span>
                    {isSelected ? (
                      <span className='text-xs font-semibold text-gray-500'>SELECCIONADO</span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
};

export default TimeSelect;
