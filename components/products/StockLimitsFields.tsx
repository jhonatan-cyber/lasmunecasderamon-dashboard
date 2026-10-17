'use client';
import { FormattedNumberInput } from '@/components/shared/FormattedNumberInput';
import { Package } from 'lucide-react';

export function StockLimitsFields({
  id,
  minimo,
  maximo,
  total,
  disabled,
  editing = false,
  onChange
}: {
  id: string;
  minimo?: string;
  maximo?: string;
  total: number;
  disabled: boolean;
  editing?: boolean;
  onChange: (field: 'stock_minimo' | 'stock_maximo', value: string) => void;
}) {
  return (
    <div className='col-span-2 space-y-2'>
      <div className='grid grid-cols-2 gap-2'>
        {(['stock_minimo', 'stock_maximo'] as const).map(field => (
          <div className='space-y-1' key={field}>
            <label
              htmlFor={`${id}-${field}`}
              className={
                editing
                  ? 'block text-[10px] font-bold uppercase tracking-wider text-gray-400 ml-1'
                  : 'sr-only'
              }
            >
              {field === 'stock_minimo' ? 'Stock mínimo' : 'Stock máximo'}
            </label>
            <div className='relative group'>
              {!editing && (
                <span
                  aria-hidden='true'
                  className='pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-purple-500 transition-colors'
                >
                  <Package className='w-4 h-4' />
                </span>
              )}
              <FormattedNumberInput
                id={`${id}-${field}`}
                value={(field === 'stock_minimo' ? minimo : maximo) ?? ''}
                disabled={disabled}
                placeholder={field === 'stock_minimo' ? 'Stock mínimo' : 'Stock máximo'}
                className={editing ? 'h-10 bg-white dark:bg-slate-900' : 'h-11 pl-11'}
                onChange={event => onChange(field, event.target.value)}
              />
            </div>
          </div>
        ))}
      </div>
      <p className='text-xs text-muted-foreground'>
        Stock total: {total.toLocaleString('es-CL')} unidades (Bar + Bodega). Bajo el mínimo se
        genera una orden para completar el máximo. Deja ambos vacíos para desactivar.
      </p>
    </div>
  );
}
