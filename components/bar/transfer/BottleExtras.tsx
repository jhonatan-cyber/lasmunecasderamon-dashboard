'use client';

import { Input } from '@/components/ui/input';

export function BottleExtras({
  commission,
  maxHostesses,
  onMaxHostesses,
  accompaniment,
  onAccompaniment,
  units,
  onUnits,
  disabled,
  context = 'transfer'
}: {
  commission: string;
  maxHostesses?: string;
  onMaxHostesses?: (value: string) => void;
  accompaniment: boolean;
  onAccompaniment: (checked: boolean) => void;
  units: string;
  onUnits: (value: string) => void;
  disabled: boolean;
  /**
   * En Configuraciones el máximo se puede fijar aunque la botella no lleve
   * comisión (rige el límite de anfitrionas en las ventas) y vacío significa
   * volver a la regla por defecto del producto, no 1.
   */
  context?: 'transfer' | 'settings';
}) {
  const isSettings = context === 'settings';
  const showHostesses =
    Boolean(onMaxHostesses) && (isSettings || Number(commission.replace(/\./g, '')) > 0);
  return (
    <div className='sm:col-span-2 grid gap-4 sm:grid-cols-2'>
      {showHostesses && (
        <div className='space-y-2'>
          <label htmlFor='bottle-hostess-limit' className='text-sm font-medium'>
            Máximo de anfitrionas
          </label>
          <Input
            id='bottle-hostess-limit'
            type='number'
            min={1}
            max={20}
            step={1}
            value={maxHostesses ?? ''}
            placeholder={isSettings ? 'Default' : '1'}
            onChange={event => onMaxHostesses?.(event.target.value)}
            disabled={disabled}
            className='h-12'
          />
          <p className='text-xs text-muted-foreground'>
            {isSettings
              ? 'En blanco se usa la regla por defecto del producto. Desde 2 puedes editar los precios por cantidad de anfitrionas.'
              : 'En blanco se usa 1. Desde 2 puedes editar los precios por cantidad de anfitrionas.'}
          </p>
        </div>
      )}
      <div className={`space-y-2 ${showHostesses ? '' : 'sm:col-span-2'}`}>
        <label
          htmlFor='bottle-mixer'
          className='flex cursor-pointer items-center gap-2 text-sm font-medium'
        >
          <Input
            id='bottle-mixer'
            type='checkbox'
            checked={accompaniment}
            onChange={event => onAccompaniment(event.target.checked)}
            disabled={disabled}
            className='h-4 w-4 accent-sky-600'
          />
          Bebida de la botella
        </label>
        <label htmlFor='bottle-mixer-units' className='sr-only'>
          Unidades por botella
        </label>
        <Input
          id='bottle-mixer-units'
          type='number'
          min={1}
          max={1000}
          step={1}
          required={accompaniment}
          disabled={disabled || !accompaniment}
          value={units}
          onChange={event => onUnits(event.target.value)}
          placeholder='Unidades por botella'
          className='h-12'
        />
        <p className='text-xs text-muted-foreground'>
          El producto se elige al vender; aquí defines las unidades por botella.
        </p>
      </div>
    </div>
  );
}
