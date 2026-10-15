'use client';

import { useId } from 'react';
import { ArrowDownWideNarrow, ArrowUpNarrowWide } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils/utils';
import { SELECT_INPUT_CLASS, SELECT_LABEL_CLASS } from '@/components/shared/selectStyles';
import { OptionSelect, type OptionSelectProps } from './OptionSelect';

interface SortSelectProps extends Omit<
  OptionSelectProps,
  'value' | 'options' | 'onChange' | 'icon' | 'triggerClassName'
> {
  field: string;
  direction: 'asc' | 'desc';
  options: readonly { value: string; label: string }[];
  onChange: (field: string, direction: 'asc' | 'desc') => void;
}

/** Field and direction share one surface, outline and focus treatment. */
export function SortSelect({
  field,
  direction,
  options,
  onChange,
  label = 'Ordenar por',
  className,
  disabled,
  id: providedId,
  ...props
}: SortSelectProps) {
  const generatedId = useId();
  const id = providedId || generatedId;
  const descending = direction === 'desc';
  const DirectionIcon = descending ? ArrowDownWideNarrow : ArrowUpNarrowWide;
  return (
    <div className={cn('min-w-0', className)}>
      {label && (
        <Label htmlFor={id} className={SELECT_LABEL_CLASS}>
          {label}
        </Label>
      )}
      <div
        role='group'
        aria-label={label || 'Ordenar'}
        className={cn(
          SELECT_INPUT_CLASS,
          'flex items-stretch overflow-hidden rounded-full p-0 focus-within:border-black dark:focus-within:border-gray-400'
        )}
      >
        <OptionSelect
          {...props}
          id={id}
          ariaLabel={label || 'Ordenar por'}
          value={field}
          options={options}
          disabled={disabled}
          className='h-full min-w-0 flex-1'
          triggerClassName='h-full rounded-none border-0 bg-transparent shadow-none hover:border-0 focus:border-0 dark:bg-transparent'
          onChange={value => onChange(value, direction)}
        />
        <Button
          type='button'
          variant='unstyled'
          disabled={disabled}
          className='flex h-full w-10 shrink-0 items-center justify-center rounded-none border-0 border-l border-gray-300 bg-transparent p-0 text-current hover:bg-black/5 focus-visible:ring-inset dark:border-gray-700 dark:hover:bg-white/5'
          aria-label={
            descending
              ? 'Orden descendente. Cambiar a ascendente'
              : 'Orden ascendente. Cambiar a descendente'
          }
          title={descending ? 'Descendente' : 'Ascendente'}
          onClick={() => onChange(field, descending ? 'asc' : 'desc')}
        >
          <DirectionIcon className='h-4 w-4' aria-hidden='true' />
        </Button>
      </div>
    </div>
  );
}
