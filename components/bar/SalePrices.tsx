'use client';

import type { SaleOption } from '@/types/sale-options';
import { formatCurrencyCLP } from '@/lib/utils/formatters';
import { useConfigValue } from '@/hooks/shared/useConfigValue';
import { resolveShotMl } from '@/lib/business/shotMl';
import { parseSavedOptions } from './TransferModal';

export function SalePrices({
  options,
  price,
  commission,
  field,
  mlShot
}: {
  options?: SaleOption[] | string | null;
  price?: number | null;
  commission?: number | null;
  field?: 'precio' | 'comision';
  /** Ml por shot del producto; sin valor propio se usa el global de Configuraciones. */
  mlShot?: number | null;
}) {
  const shotMlGlobal = useConfigValue<number>('bar', 'shot_ml', 50);
  const shotMl = resolveShotMl(mlShot, shotMlGlobal);
  const parsed = typeof options === 'string' ? parseSavedOptions(options) : options;
  const values = parsed ?? [{ tipo: 'botella', precio: price ?? 0, comision: commission ?? 0 }];
  return (
    <div className='flex flex-col gap-2 text-sm'>
      {values.map(option => (
        <div key={option.tipo} className='flex flex-col gap-0.5'>
          <span className='text-xs font-medium text-muted-foreground'>
            {option.tipo === 'botella' ? 'Botella' : `Shot · ${shotMl} ml`}
          </span>
          {field !== 'comision' && (
            <span className='font-semibold tabular-nums'>{formatCurrencyCLP(option.precio)}</span>
          )}
          {field !== 'precio' && (
            <span className='text-xs text-muted-foreground'>
              {option.comision > 0
                ? `${field ? '' : 'Comisión: '}${formatCurrencyCLP(option.comision)}`
                : 'Sin comisión'}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}
