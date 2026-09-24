'use client';

import React, { useMemo, useState } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  ORDER_FIELD_LABEL_CLASS,
  ORDER_FIELD_POPOVER_CLASS,
  ORDER_FIELD_SEARCH_INPUT_CLASS,
  ORDER_FIELD_SEARCH_WRAPPER_CLASS,
  ORDER_MULTISELECT_TRIGGER_CLASS,
  ORDER_SELECTED_TAG_CLASS
} from '@/components/orders/orderFieldStyles';

type MultiEntitySelectItem = {
  id: string;
  label: string;
  disabled?: boolean;
  extraLabel?: string;
};

interface MultiEntitySelectProps {
  items: MultiEntitySelectItem[];
  value: string[];
  onChange: (value: string[]) => void;
  label?: string;
  placeholder?: string;
  searchPlaceholder?: string;
  className?: string;
  required?: boolean;
  maxSelection?: number;
  disabled?: boolean;
  disabledReason?: string;
  icon: React.ReactNode;
  emptyState?: string;
  selectedCounterLabel?: string;
}

export const MultiEntitySelect: React.FC<MultiEntitySelectProps> = ({
  items,
  value,
  onChange,
  label,
  placeholder,
  searchPlaceholder = 'Buscar...',
  className = '',
  required = false,
  maxSelection = 4,
  disabled = false,
  disabledReason,
  icon,
  emptyState = 'No hay resultados',
  selectedCounterLabel = 'Seleccionados'
}) => {
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const uniqueId = React.useId();

  const showTooltip = Boolean(disabledReason);
  const disabledState = disabled || showTooltip;

  const filteredItems = useMemo(() => {
    if (!searchTerm) return items;
    const searchLower = searchTerm.toLowerCase();

    return items.filter(item => {
      return (
        item.label.toLowerCase().includes(searchLower) ||
        item.id.toLowerCase().includes(searchLower) ||
        (item.extraLabel ? item.extraLabel.toLowerCase().includes(searchLower) : false)
      );
    });
  }, [items, searchTerm]);

  const selectedItems = items.filter(item => value.includes(item.id));

  const handleToggle = (id: string) => {
    const next = value.includes(id)
      ? value.filter(current => current !== id)
      : value.length < maxSelection
        ? [...value, id]
        : value;

    onChange(next);
  };

  const selectNode = (
    <Popover open={open} onOpenChange={nextOpen => !disabledState && setOpen(nextOpen)}>
      <PopoverTrigger asChild>
        <button
          id={uniqueId}
          type='button'
          className={`${ORDER_MULTISELECT_TRIGGER_CLASS} flex items-center gap-2 pr-10`}
          onClick={() => !disabledState && setOpen(!open)}
          disabled={disabledState}
        >
          <span className='shrink-0'>{icon}</span>
          {value.length === 0 ? (
            <span className='text-gray-400 text-sm truncate'>{placeholder}</span>
          ) : (
            <span className='flex flex-wrap gap-1'>
              {selectedItems.map((item, index) => (
                <span key={`${item.id}-${index}`} className={ORDER_SELECTED_TAG_CLASS}>
                  {item.label}
                </span>
              ))}
            </span>
          )}
        </button>
      </PopoverTrigger>

      <PopoverContent align='start' className={ORDER_FIELD_POPOVER_CLASS} sideOffset={5}>
        <div className={ORDER_FIELD_SEARCH_WRAPPER_CLASS}>
          <label htmlFor={`${uniqueId}-search`} className='sr-only'>
            {searchPlaceholder}
          </label>
          <Input
            id={`${uniqueId}-search`}
            placeholder={searchPlaceholder}
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className={ORDER_FIELD_SEARCH_INPUT_CLASS}
            disabled={disabledState}
          />
        </div>

        <div className='max-h-60 overflow-y-auto p-1'>
          {filteredItems.length === 0 ? (
            <div className='p-2 text-center text-gray-500 text-sm'>{emptyState}</div>
          ) : (
            filteredItems.map(item => {
              const isSelected = value.includes(item.id);
              const isDisabled =
                (!isSelected && value.length >= maxSelection) || Boolean(item.disabled);

              return (
                <label
                  key={item.id}
                  htmlFor={`${uniqueId}-opt-${item.id}`}
                  className={`flex items-center gap-3 rounded-md px-3 py-2 text-left transition-colors hover:bg-gray-100 ${
                    isDisabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'
                  }`}
                >
                  <Checkbox
                    id={`${uniqueId}-opt-${item.id}`}
                    checked={isSelected}
                    onCheckedChange={() => handleToggle(item.id)}
                    disabled={isDisabled}
                  />
                  <div className='flex min-w-0 flex-col'>
                    <span className='truncate text-sm text-gray-700'>{item.label}</span>
                    {item.extraLabel ? (
                      <span className='truncate text-xs text-gray-400'>{item.extraLabel}</span>
                    ) : null}
                  </div>
                </label>
              );
            })
          )}
        </div>

        {maxSelection > 1 && (
          <div className='border-t bg-gray-50 p-2 text-center text-[10px] font-semibold uppercase tracking-wider text-gray-400'>
            {selectedCounterLabel}: {value.length} / Máximo: {maxSelection}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );

  return (
    <div className={`flex flex-col ${className}`}>
      {label ? (
        <Label htmlFor={uniqueId} className={ORDER_FIELD_LABEL_CLASS}>
          {label}
          {required && <span className='ml-1 text-red-500'>*</span>}
        </Label>
      ) : null}

      <div className='relative'>
        {showTooltip ? (
          <TooltipProvider>
            <Tooltip delayDuration={300}>
              <TooltipTrigger asChild>
                <div className='w-full'>{selectNode}</div>
              </TooltipTrigger>
              <TooltipContent className='rounded-xl border-none bg-black px-3 py-1.5 text-xs font-bold text-white shadow-xl dark:bg-white dark:text-black'>
                <p>{disabledReason}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ) : (
          selectNode
        )}
      </div>
    </div>
  );
};

export default MultiEntitySelect;
