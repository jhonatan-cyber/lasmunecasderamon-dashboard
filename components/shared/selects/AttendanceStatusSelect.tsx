'use client';

import React, { useState } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Label } from '@/components/ui/label';
import { CheckCircle, AlertCircle, XCircle } from 'lucide-react';
import {
  ORDER_FIELD_LABEL_CLASS,
  ORDER_FIELD_POPOVER_CLASS,
  ORDER_MULTISELECT_TRIGGER_CLASS
} from '@/components/orders/orderFieldStyles';

interface AttendanceStatusSelectProps {
  value?: string;
  onChange: (value: string) => void;
  label?: string;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  className?: string;
}

const statusOptions = [
  { value: 'presente', label: 'Presente', icon: CheckCircle, color: 'text-green-500' },
  { value: 'tardanza', label: 'Tardanza', icon: AlertCircle, color: 'text-yellow-500' },
  { value: 'ausente', label: 'Ausente', icon: XCircle, color: 'text-red-500' }
];

export default function AttendanceStatusSelect({
  value,
  onChange,
  label = 'Estado',
  placeholder = 'Selecciona un estado',
  disabled = false,
  required = false,
  className = ''
}: AttendanceStatusSelectProps) {
  const [open, setOpen] = useState(false);
  const uniqueId = React.useId();

  const selectedOption = statusOptions.find(opt => opt.value === value);
  const selectedLabel = selectedOption ? selectedOption.label : '';

  const handleValueChange = (newValue: string) => {
    setOpen(false);
    onChange(newValue);
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
              {selectedLabel ? (
                <span className='truncate text-sm text-gray-900 dark:text-white flex items-center gap-2'>
                  {selectedOption && (
                    <selectedOption.icon className={`h-4 w-4 ${selectedOption.color}`} />
                  )}
                  {selectedLabel}
                </span>
              ) : (
                <span className='text-sm text-gray-400 truncate'>{placeholder}</span>
              )}
            </button>
          </PopoverTrigger>
          <PopoverContent align='start' className={ORDER_FIELD_POPOVER_CLASS} sideOffset={5}>
            <div className='max-h-60 overflow-y-auto p-1'>
              {statusOptions.map(option => {
                const Icon = option.icon;
                const isSelected = option.value === value;

                return (
                  <button
                    key={option.value}
                    type='button'
                    className={`flex w-full items-center justify-between gap-2 rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-gray-100 ${isSelected ? 'bg-gray-100' : ''}`}
                    onClick={() => handleValueChange(option.value)}
                    disabled={disabled}
                  >
                    <span className='text-gray-700 flex items-center gap-2'>
                      <Icon className={`h-4 w-4 ${option.color}`} />
                      {option.label}
                    </span>
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
}
