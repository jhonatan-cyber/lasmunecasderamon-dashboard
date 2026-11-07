'use client';
import { Fragment } from 'react';
import { esBotella } from '@/lib/sales/saleChoice';
import { formatCurrencyNoDecimals } from '@/lib/utils/formatters';
import {
  bottleMixerUnits,
  clienteShortSinAcompanamiento,
  hostessMixerMl
} from '@/lib/sales/productConfiguration';
import { esCortoAnfitriona } from '@/lib/sales/hostessShortPrices';
import { SaleFormatQuantities } from '@/components/sales/SaleFormatQuantities';
import { SaleProductMixers } from './SaleProductMixers';
import { SaleProductHostess } from './SaleProductHostess';
import { getSaleProductFormatColumns, type SaleProductItem } from './saleProductItems';

export function SaleProductFormatRows({
  item,
  availableHostesses
}: {
  item: SaleProductItem;
  availableHostesses: any[];
}) {
  const { hasDrink: hasDrinkColumn, hasHostess: hasHostessColumn } =
    getSaleProductFormatColumns(item);
  const compact = !hasDrinkColumn && !hasHostessColumn;
  const columnsClass =
    hasDrinkColumn && hasHostessColumn
      ? 'md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,0.85fr)]'
      : hasDrinkColumn
        ? 'md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]'
        : hasHostessColumn
          ? 'md:grid-cols-[minmax(0,1fr)_minmax(0,0.85fr)]'
          : '';
  return (
    <div className={compact ? '' : 'divide-y border-t border-border'}>
      {!compact && (
        <div
          className={`hidden gap-5 rounded-lg border-b border-border bg-muted py-3 text-center text-xs font-semibold text-foreground md:grid ${columnsClass}`}
        >
          <span>Formato y cantidad</span>
          {hasDrinkColumn && <span>Bebida</span>}
          {hasHostessColumn && <span>Anfitrionas</span>}
        </div>
      )}
      {item.opcionesTipo.map(option => {
        const multipleShorts = !esBotella(option.value) && option.cantidad > 1;
        const units = bottleMixerUnits(item.product ?? {});
        const drinkMl = hostessMixerMl({ ...item.product, shot_anfitriona: true });
        const shortHasMixer = !esBotella(option.value)
          ? !clienteShortSinAcompanamiento({
              ...item.product,
              tipo_venta: 'shot',
              shot_anfitriona: esCortoAnfitriona(option.value)
            })
          : false;
        const displayLabel = esBotella(option.value)
          ? `${option.value === 'botella_sin_anfitriona' ? 'Botella sin anfitriona' : 'Botella'}${units > 0 ? ` · ${units} ${units === 1 ? 'unidad' : 'unidades'} de bebida` : ''}`
          : `${option.label.replace(/ \u00b7 \$[\d.,]+/g, '')}${!shortHasMixer ? '' : esCortoAnfitriona(option.value) ? (drinkMl > 0 ? ` y ${drinkMl} ml de bebida` : '') : ' y 1 unidad de bebida'}`;
        return (
          <div
            key={option.value}
            data-sale-format={option.value}
            className={`grid items-start gap-4 ${compact ? 'py-1' : 'py-4 md:gap-5'} ${columnsClass}`}
          >
            {!multipleShorts && (
              <div className={`min-w-0 ${compact ? '' : '[&>div]:mt-1'}`}>
                {!compact && <p className='text-xs text-muted-foreground'>Trago</p>}
                <SaleFormatQuantities
                  options={[{ ...option, displayLabel }]}
                  onChange={item.onSaleTypeChange}
                  dense
                  compact={compact}
                  hideLabel={compact && item.opcionesTipo.length === 1}
                />
              </div>
            )}
            {Array.from(
              { length: esBotella(option.value) ? 1 : Math.max(1, option.cantidad) },
              (_, unitIndex) => {
                const unitMixer =
                  esBotella(option.value) && units <= 0
                    ? undefined
                    : item.mixers?.find(
                        m => m.value === option.value && (m.unitIndex ?? 0) === unitIndex
                      );
                const unitHostess = item.hostessFormats?.find(
                  h => h.value === option.value && (h.unitIndex ?? 0) === unitIndex
                );
                const unitItem: SaleProductItem = {
                  ...item,
                  hostessFormats: undefined,
                  opcionesTipo: [
                    {
                      ...option,
                      cantidad: esBotella(option.value)
                        ? option.cantidad
                        : Math.min(1, option.cantidad)
                    }
                  ],
                  cantidadActual: esBotella(option.value)
                    ? option.cantidad
                    : Math.min(1, option.cantidad),
                  mixers: unitMixer
                    ? [
                        {
                          ...unitMixer,
                          label: `${option.label}${option.cantidad > 1 && !esBotella(option.value) ? ` - Corto ${unitIndex + 1}` : ''}`
                        }
                      ]
                    : [],
                  muestraAnfitriona: !!unitHostess,
                  isChampagne: esBotella(option.value) && item.isChampagne,
                  champagneSelected: unitHostess?.selected || [],
                  otherSelected: unitHostess?.selected || [],
                  onChampagneSelect: unitHostess?.onChange || (() => {}),
                  onOtherSelect: unitHostess?.onChange || (() => {})
                };
                return (
                  <Fragment key={unitIndex}>
                    {multipleShorts && (
                      <div className={`min-w-0 ${compact ? '' : '[&>div]:mt-1'}`}>
                        {!compact && (
                          <p className='text-xs text-muted-foreground'>Corto {unitIndex + 1}</p>
                        )}
                        {unitIndex === 0 ? (
                          <SaleFormatQuantities
                            options={[{ ...option, displayLabel }]}
                            onChange={item.onSaleTypeChange}
                            dense
                            compact={compact}
                            hideLabel={compact && item.opcionesTipo.length === 1}
                          />
                        ) : (
                          <div className='flex h-14 items-center rounded-xl border border-neutral-200/70 bg-white px-2.5 dark:border-white/10 dark:bg-neutral-950'>
                            <div className='min-w-0'>
                              {!(compact && item.opcionesTipo.length === 1) && (
                                <p className='text-xs font-bold leading-tight'>{displayLabel}</p>
                              )}
                              <p
                                className={
                                  compact
                                    ? 'text-sm font-semibold'
                                    : 'text-xs text-muted-foreground'
                                }
                              >
                                {formatCurrencyNoDecimals(option.precio)}
                                {!compact && (
                                  <> · comisión {formatCurrencyNoDecimals(option.comision)}</>
                                )}
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                    {hasDrinkColumn && (
                      <div className='min-w-0'>
                        {unitMixer ? (
                          <SaleProductMixers item={unitItem} showLabels={false} />
                        ) : (
                          <p className='text-xs text-muted-foreground'>
                            {option.cantidad > 0 ? 'Sin bebida' : 'Selecciona una cantidad'}
                          </p>
                        )}
                      </div>
                    )}
                    {hasHostessColumn && (
                      <div className='min-w-0 [&_button[aria-haspopup]]:h-14 [&_button[aria-haspopup]]:min-h-14 [&_button[aria-haspopup]]:overflow-hidden [&_button[aria-haspopup]>span]:flex-nowrap [&_button[aria-haspopup]>span]:overflow-hidden'>
                        {unitHostess ? (
                          <SaleProductHostess
                            item={unitItem}
                            availableHostesses={availableHostesses}
                          />
                        ) : (
                          <p className='text-xs text-muted-foreground'>
                            {option.comision > 0 ? 'Selecciona una cantidad' : 'Sin comisión'}
                          </p>
                        )}
                      </div>
                    )}
                  </Fragment>
                );
              }
            )}
          </div>
        );
      })}
    </div>
  );
}
