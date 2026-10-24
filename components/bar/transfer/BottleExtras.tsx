'use client';

import { Input } from '@/components/ui/input';
import { FormattedNumberInput } from '@/components/shared/FormattedNumberInput';
import { Label } from '@/components/ui/label';

export function BottleExtras({
  commission,
  maxHostesses,
  onMaxHostesses,
  onAccompaniment,
  units,
  onUnits,
  disabled,
  context = 'transfer'
}: {
  commission: string;
  maxHostesses?: string;
  onMaxHostesses?: (value: string) => void;
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
          <Label htmlFor='bottle-hostess-limit' className='text-sm font-medium'>
            Máximo de anfitrionas
          </Label>
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
        </div>
      )}
      <div className={`space-y-2 ${showHostesses ? '' : 'sm:col-span-2'}`}>
        <Label htmlFor='bottle-mixer-units' className='text-sm font-medium'>
          Bebida analcohólica por botella
        </Label>
        <FormattedNumberInput
          id='bottle-mixer-units'
          type='number'
          min={0}
          max={1000}
          step={1}
          disabled={disabled}
          value={units}
          onChange={event => {
            onUnits(event.target.value);
            onAccompaniment(Number(event.target.value) > 0);
          }}
          placeholder='0'
          className='h-12'
        />
        {isSettings && (
          <p className='text-xs text-muted-foreground'>
            Cantidad de bebidas analcohólicas incluidas por botella. La bebida se elige al vender.
          </p>
        )}
      </div>
    </div>
  );
}
