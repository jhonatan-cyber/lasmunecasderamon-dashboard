'use client';
import React from 'react';

import { preciosCortoAnfitriona } from '@/lib/sales/hostessShortPrices';
import type { SaleOption } from '@/types/sale-options';
import { formatCurrencyCLP } from '@/lib/utils/formatters';
import { useConfig } from '@/hooks/shared/useConfigValue';
import { resolveShotMl, resolveShotMlAnfitriona } from '@/lib/business/shotMl';
import { parseSavedOptions } from './TransferModal';

export function SalePrices({
  options,
  price,
  commission,
  field,
  mlShot,
  mlShotAnfitriona,
  layout = 'stacked'
}: {
  options?: SaleOption[] | string | null;
  price?: number | null;
  commission?: number | null;
  field?: 'precio' | 'comision';
  /** Ml por shot del producto; sin valor propio se usa el global de Configuraciones. */
  mlShot?: number | null;
  /** Ml por shot a anfitriona; sin valor propio se usa el de cliente. */
  mlShotAnfitriona?: number | null;
  layout?: 'stacked' | 'columns';
}) {
  const shotMlGlobal = useConfig<number>('shot_ml');
  const shotMl = resolveShotMl(mlShot, shotMlGlobal);
  const shotMlAnf = resolveShotMlAnfitriona(mlShotAnfitriona, shotMl);
  const parsed = typeof options === 'string' ? parseSavedOptions(options) : options;
  const values = parsed ?? [{ tipo: 'botella', precio: price ?? 0, comision: commission ?? 0 }];
  const orderedValues =
    layout === 'columns'
      ? [...values].sort((a, b) => (a.tipo === b.tipo ? 0 : a.tipo === 'shot' ? -1 : 1))
      : values;
  if (layout === 'columns' && !field) {
    return (
      <div className='space-y-4 text-sm'>
        {values.map(option => {
          const hostPrices = preciosCortoAnfitriona(option);
          return (
            <section key={option.tipo} className='min-w-0 space-y-2'>
              <h4 className='text-xs font-semibold uppercase tracking-wide text-muted-foreground'>
                {option.tipo === 'botella' ? 'Botella' : 'Cortos'}
              </h4>
              <div className='grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-x-3 gap-y-2'>
                <span className='text-xs text-muted-foreground'>Venta</span>
                <span className='text-right text-xs text-muted-foreground'>Precio</span>
                <span className='text-right text-xs text-muted-foreground'>Comisión</span>
                <span>{option.tipo === 'shot' ? 'Cliente' : 'Botella'}</span>
                <span className='text-right font-semibold tabular-nums'>
                  {formatCurrencyCLP(option.precio)}
                </span>
                <span className='text-right text-xs tabular-nums text-muted-foreground'>
                  {option.tipo === 'shot' || !option.comision
                    ? '—'
                    : formatCurrencyCLP(option.comision)}
                </span>
                {option.tipo === 'shot' &&
                  hostPrices.map((row, index) => (
                    <React.Fragment key={index}>
                      <span className='text-xs'>Anfitriona {index + 1}</span>
                      <span className='text-right font-semibold tabular-nums'>
                        {formatCurrencyCLP(row.precio)}
                      </span>
                      <span className='text-right text-xs tabular-nums text-muted-foreground'>
                        {formatCurrencyCLP(row.comision)}
                      </span>
                    </React.Fragment>
                  ))}
              </div>
              {option.tipo === 'shot' && (
                <div className='grid grid-cols-2 gap-3 rounded-xl bg-muted/40 p-2.5 text-xs'>
                  <div>
                    <p className='font-medium'>Cliente · {shotMl} ml</p>
                    <p className='mt-1 text-muted-foreground'>Acomp.: producto completo</p>
                  </div>
                  <div>
                    <p className='font-medium'>Anfitriona · {shotMlAnf} ml</p>
                    <p className='mt-1 text-muted-foreground'>
                      Acomp.: {option.ml_acompanamiento_anfitriona ?? 0} ml
                    </p>
                  </div>
                </div>
              )}
              {option.acompanamiento && (
                <p className='text-xs text-muted-foreground'>
                  Incluye {option.acompanamiento.unidades} bebidas por botella
                </p>
              )}
            </section>
          );
        })}
      </div>
    );
  }
  return (
    <div
      className={
        layout === 'columns' && values.length > 1
          ? 'grid grid-cols-2 items-start gap-4 text-left text-sm'
          : 'flex flex-col gap-2 text-sm'
      }
    >
      {orderedValues.map(option => (
        <div key={option.tipo} className='flex min-w-0 flex-col gap-0.5 break-words'>
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
            <span className='text-xs font-medium text-muted-foreground'>Corto · {shotMl} ml</span>
          )}
          {option.tipo === 'shot' && (
            <span className='flex flex-col gap-1'>
              {preciosCortoAnfitriona(option).map((row, index) => (
                <span key={index} className='text-xs'>
                  Anfitriona {field !== 'comision' && formatCurrencyCLP(row.precio)}{' '}
                  {field !== 'precio' && `· Comisión ${formatCurrencyCLP(row.comision)}`}
                </span>
              ))}
            </span>
          )}
          {option.acompanamiento && (
            <span className='text-xs text-muted-foreground'>
              Incluye {option.acompanamiento.unidades}{' '}
              {option.acompanamiento.tipo === 'gaseosa'
                ? 'gaseosas'
                : option.acompanamiento.tipo === 'soda'
                  ? 'sodas'
                  : 'bebidas'}{' '}
              por botella
            </span>
          )}
          {field !== 'comision' && (
            <span className='font-semibold tabular-nums'>
              {option.tipo === 'shot' ? 'Cliente ' : ''}
              {formatCurrencyCLP(option.precio)}
            </span>
          )}
          {field !== 'precio' && (
            <span className='text-xs text-muted-foreground'>
              {option.tipo !== 'shot' && option.comision > 0
                ? `${field ? '' : 'Comisión: '}${formatCurrencyCLP(option.comision)}`
                : 'Sin comisión'}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}
