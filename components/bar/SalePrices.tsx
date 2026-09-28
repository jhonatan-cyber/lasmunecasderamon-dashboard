'use client';

import type { SaleOption } from '@/types/sale-options';
import { formatCurrencyCLP } from '@/lib/utils/formatters';
import { useConfigValue } from '@/hooks/shared/useConfigValue';
import { resolveShotMl, resolveShotMlAnfitriona } from '@/lib/business/shotMl';
import { parseSavedOptions } from './TransferModal';

export function SalePrices({
  options,
  price,
  commission,
  field,
  mlShot,
  mlShotAnfitriona
}: {
  options?: SaleOption[] | string | null;
  price?: number | null;
  commission?: number | null;
  field?: 'precio' | 'comision';
  /** Ml por shot del producto; sin valor propio se usa el global de Configuraciones. */
  mlShot?: number | null;
  /** Ml por shot a anfitriona; sin valor propio se usa el de cliente. */
  mlShotAnfitriona?: number | null;
}) {
  const shotMlGlobal = useConfigValue<number>('bar', 'shot_ml', 50);
  const shotMl = resolveShotMl(mlShot, shotMlGlobal);
  const shotMlAnf = resolveShotMlAnfitriona(mlShotAnfitriona, shotMl);
  const parsed = typeof options === 'string' ? parseSavedOptions(options) : options;
  const values = parsed ?? [{ tipo: 'botella', precio: price ?? 0, comision: commission ?? 0 }];
  return (
    <div className='flex flex-col gap-2 text-sm'>
      {values.map(option => (
        <div key={option.tipo} className='flex flex-col gap-0.5'>
          {option.tipo === 'botella' ? (
            <span className='text-xs font-medium text-muted-foreground'>Botella</span>
          ) : shotMlAnf !== shotMl ? (
            <span className='grid grid-cols-2 gap-1 rounded-lg bg-gray-100 px-2 py-1.5 dark:bg-white/5'>
              <span className='flex flex-col leading-tight'>
                <span className='text-[10px] font-medium uppercase tracking-wide text-muted-foreground'>
                  Cliente
                </span>
                <span className='text-xs font-bold tabular-nums'>{shotMl} ml</span>
              </span>
              <span className='flex flex-col leading-tight'>
                <span className='text-[10px] font-medium uppercase tracking-wide text-muted-foreground'>
                  Anfitriona
                </span>
                <span className='text-xs font-bold tabular-nums'>{shotMlAnf} ml</span>
              </span>
            </span>
          ) : (
            <span className='text-xs font-medium text-muted-foreground'>Shot · {shotMl} ml</span>
          )}
          {field !== 'comision' &&
            (option.tipo === 'shot' &&
            Number(option.precio_anfitriona ?? 0) > 0 &&
            Number(option.precio_anfitriona) !== Number(option.precio) ? (
              // El shot tiene precio distinto según quién lo pida.
              <span className='flex flex-col'>
                <span className='font-semibold tabular-nums'>
                  Cliente {formatCurrencyCLP(option.precio)}
                </span>
                <span className='font-semibold tabular-nums text-muted-foreground'>
                  Anfitriona {formatCurrencyCLP(Number(option.precio_anfitriona))}
                </span>
              </span>
            ) : (
              <span className='font-semibold tabular-nums'>{formatCurrencyCLP(option.precio)}</span>
            ))}
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
