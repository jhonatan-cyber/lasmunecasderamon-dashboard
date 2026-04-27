import React, { useState } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Label } from '@/components/ui/label';
import { ChevronDown } from 'lucide-react';
import {
  ORDER_FIELD_LABEL_CLASS,
  ORDER_FIELD_POPOVER_CLASS,
  ORDER_MULTISELECT_TRIGGER_CLASS
} from '@/components/orders/orderFieldStyles';

interface FilterSelectProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  placeholder?: string;
  options: { value: string; label: string }[];
  className?: string;
  disabled?: boolean;
}

const FilterSelect: React.FC<FilterSelectProps> = ({
  value,
  onChange,
  label = 'Filtro',
  placeholder = 'Seleccione una opción',
  options,
  className = '',
  disabled = false
}) => {
  const [open, setOpen] = useState(false);
  const uniqueId = React.useId();

  const selectedOption = options.find(opt => opt.value === value);
  const selectedLabel = selectedOption?.label || '';

  const handleValueChange = (newValue: string) => {
    setOpen(false);
    onChange(newValue);
  };

  return (
    <div className={`flex flex-col ${className}`}>
      <Label htmlFor={uniqueId} className={ORDER_FIELD_LABEL_CLASS}>
        {label}
      </Label>

      <div className='relative'>
        <Popover open={open} onOpenChange={nextOpen => !disabled && setOpen(nextOpen)}>
          <PopoverTrigger asChild>
            <button
              id={uniqueId}
              type='button'
              className={`${ORDER_MULTISELECT_TRIGGER_CLASS} flex items-center justify-between pr-10`}
              onClick={() => !disabled && setOpen(!open)}
              disabled={disabled}
            >
              <span className='truncate text-sm text-gray-900 dark:text-white'>
                {selectedLabel || <span className='text-gray-400'>{placeholder}</span>}
              </span>
              <ChevronDown className='w-4 h-4 text-gray-400 shrink-0 ml-2' />
            </button>
          </PopoverTrigger>
          <PopoverContent align='start' className={ORDER_FIELD_POPOVER_CLASS} sideOffset={5}>
            <div className='max-h-60 overflow-y-auto p-1'>
              {options.length === 0 ? (
                <div className='p-4 text-center text-sm text-gray-500'>
                  No hay opciones disponibles
                </div>
              ) : (
                options.map(option => {
                  const isSelected = option.value === value;

                  return (
                    <button
                      key={option.value}
                      type='button'
                      className={`flex w-full items-center justify-between gap-2 rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-gray-100 ${isSelected ? 'bg-gray-100' : ''}`}
                      onClick={() => handleValueChange(option.value)}
                      disabled={disabled}
                    >
                      <span className='text-gray-700'>{option.label}</span>
                      {isSelected ? (
                        <span className='text-xs font-semibold text-gray-500'>SELECCIONADO</span>
                      ) : null}
                    </button>
                  );
                })
              )}
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
};

export default FilterSelect;
