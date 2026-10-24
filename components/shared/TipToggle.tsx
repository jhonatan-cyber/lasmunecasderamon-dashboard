'use client';

import { Checkbox } from '@/components/ui/checkbox';
import { formatCurrencyNoDecimals } from '@/lib/utils/formatters';
import { Coins } from 'lucide-react';

interface TipToggleProps {
  /** Monto de propina a mostrar en el pill. */
  amount: number;
  /** Estado actual de la propina. */
  enabled: boolean;
  /** Se invoca con el nuevo estado. */
  onToggle: (enabled: boolean) => void;
  /** Nombre accesible del control. */
  ariaLabel?: string;
  /** Muestra el checkbox de estado junto al indicador (variante de nueva venta). */
  showCheckbox?: boolean;
}

export function TipToggle({
  amount,
  enabled,
  onToggle,
  ariaLabel = 'Activar propina',
  showCheckbox = false
}: TipToggleProps) {
  const toggle = () => onToggle(!enabled);

  return (
    <div
      role='button'
      tabIndex={0}
      aria-label={ariaLabel}
      aria-pressed={enabled}
      onClick={toggle}
      onKeyDown={event => {
        if (event.target === event.currentTarget && (event.key === 'Enter' || event.key === ' ')) {
          event.preventDefault();
          toggle();
        }
      }}
      className='flex h-11 items-center justify-between gap-3 rounded-full border border-gray-200 bg-gray-50/80 px-3 text-left transition-colors hover:bg-gray-100 dark:border-neutral-700 dark:bg-neutral-800/80 dark:hover:bg-neutral-800'
    >
      <div className='flex min-w-0 items-center gap-2'>
        <Coins className='h-4 w-4 shrink-0 text-gray-400' />
        <span className='text-sm font-bold text-gray-800 dark:text-neutral-100'>
          {formatCurrencyNoDecimals(amount)}
        </span>
      </div>
      <div className='flex items-center gap-2'>
        <span className='text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-neutral-400'>
          {enabled ? 'Activa' : 'Inactiva'}
        </span>
        {showCheckbox && (
          <Checkbox
            checked={enabled}
            onClick={event => event.stopPropagation()}
            onCheckedChange={checked => onToggle(checked === true)}
            className='h-5 w-5 rounded-md border-gray-300 dark:border-neutral-500 data-[state=checked]:border-black data-[state=checked]:bg-black dark:data-[state=checked]:border-white dark:data-[state=checked]:bg-white dark:data-[state=checked]:text-black'
          />
        )}
      </div>
    </div>
  );
}
