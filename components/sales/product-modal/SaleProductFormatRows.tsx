'use client';
import { formatCurrencyNoDecimals } from '@/lib/utils/formatters';
import { bottleMixerUnits, hostessMixerMl } from '@/lib/sales/productConfiguration';
import { esCortoAnfitriona } from '@/lib/sales/hostessShortPrices';
import { SaleFormatQuantities } from '@/components/sales/SaleFormatQuantities';
import { SaleProductMixers } from './SaleProductMixers';
import { SaleProductHostess } from './SaleProductHostess';
import type { SaleProductItem } from './saleProductItems';

export function SaleProductFormatRows({
  item,
  availableHostesses
}: {
  item: SaleProductItem;
  availableHostesses: any[];
}) {
  return (
    <div className='divide-y border-t border-border'>
      <div className='hidden grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,0.85fr)] gap-5 rounded-lg border-b border-border bg-muted py-3 text-center text-xs font-semibold text-foreground md:grid'>
        <span>Formato y cantidad</span>
        <span>Bebida</span>
        <span>Anfitrionas</span>
      </div>
      {item.opcionesTipo.map(option => {
        const multipleShorts = option.value !== 'botella' && option.cantidad > 1;
        const mixer = item.mixers?.find(m => m.value === option.value);
        const units = bottleMixerUnits(item.product ?? {});
        const drinkMl = hostessMixerMl({ ...item.product, shot_anfitriona: true });
        const displayLabel =
          option.value === 'botella'
            ? `Botella${units > 0 ? ` · ${units} ${units === 1 ? 'unidad' : 'unidades'} de bebida` : ''}`
            : `${option.label.replace(/ \u00b7 \$[\d.,]+/g, '')}${esCortoAnfitriona(option.value) ? (drinkMl > 0 ? ` y ${drinkMl} ml de bebida` : '') : ' y 1 unidad de bebida'}`;
        const hostess = item.hostessFormats?.find(h => h.value === option.value);
        const formatItem: SaleProductItem = {
          ...item,
          hostessFormats: undefined,
          opcionesTipo: [option],
          cantidadActual: option.cantidad,
          mixers: mixer ? [mixer] : [],
          muestraAnfitriona: !!hostess,
          isChampagne: option.value === 'botella' && item.isChampagne,
          champagneSelected: hostess?.selected || [],
          otherSelected: hostess?.selected || [],
          onChampagneSelect: hostess?.onChange || (() => {}),
          onOtherSelect: hostess?.onChange || (() => {})
        };
        return (
          <div
            key={option.value}
            data-sale-format={option.value}
            className='grid items-start gap-4 py-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,0.85fr)] md:gap-5'
          >
            {!multipleShorts && (
              <div className={`min-w-0 [&>div]:mt-1 ${multipleShorts ? 'hidden' : ''}`}>
                <p className='text-xs text-muted-foreground'>Trago</p>
                <SaleFormatQuantities
                  options={[{ ...option, displayLabel }]}
                  onChange={item.onSaleTypeChange}
                  dense
                />
              </div>
            )}
            <div className={`space-y-3 ${multipleShorts ? 'md:col-span-3' : 'md:col-span-2'}`}>
              {Array.from(
                { length: option.value === 'botella' ? 1 : Math.max(1, option.cantidad) },
                (_, unitIndex) => {
                  const unitMixer = item.mixers?.find(
                    m => m.value === option.value && (m.unitIndex ?? 0) === unitIndex
                  );
                  const unitHostess = item.hostessFormats?.find(
                    h => h.value === option.value && (h.unitIndex ?? 0) === unitIndex
                  );
                  const unitItem: SaleProductItem = {
                    ...formatItem,
                    opcionesTipo: [
                      {
                        ...option,
                        cantidad:
                          option.value === 'botella'
                            ? option.cantidad
                            : Math.min(1, option.cantidad)
                      }
                    ],
                    cantidadActual:
                      option.value === 'botella' ? option.cantidad : Math.min(1, option.cantidad),
                    mixers: unitMixer
                      ? [
                          {
                            ...unitMixer,
                            label: `${option.label}${option.cantidad > 1 && option.value !== 'botella' ? ` - Corto ${unitIndex + 1}` : ''}`
                          }
                        ]
                      : [],
                    muestraAnfitriona: !!unitHostess,
                    champagneSelected: unitHostess?.selected || [],
                    otherSelected: unitHostess?.selected || [],
                    onChampagneSelect: unitHostess?.onChange || (() => {}),
                    onOtherSelect: unitHostess?.onChange || (() => {})
                  };
                  return (
                    <div
                      key={unitIndex}
                      data-shot-unit={unitIndex + 1}
                      className={`grid items-center gap-3 md:gap-5 ${multipleShorts ? 'md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,0.85fr)]' : 'md:grid-cols-[minmax(0,1fr)_minmax(0,0.85fr)]'}`}
                    >
                      {multipleShorts && (
                        <div className='min-w-0 [&>div]:mt-1'>
                          <p className='text-xs text-muted-foreground'>Corto {unitIndex + 1}</p>
                          {unitIndex === 0 ? (
                            <SaleFormatQuantities
                              options={[{ ...option, displayLabel }]}
                              onChange={item.onSaleTypeChange}
                              dense
                            />
                          ) : (
                            <div className='flex h-14 items-center rounded-xl border border-neutral-200/70 bg-white px-2.5 dark:border-white/10 dark:bg-neutral-950'>
                              <div className='min-w-0'>
                                <p className='text-xs font-bold leading-tight'>{displayLabel}</p>
                                <p className='text-xs text-muted-foreground'>
                                  {formatCurrencyNoDecimals(option.precio)} · comisión{' '}
                                  {formatCurrencyNoDecimals(option.comision)}
                                </p>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                      <div className='min-w-0'>
                        {unitMixer ? (
                          <SaleProductMixers item={unitItem} showLabels={false} />
                        ) : (
                          <p className='text-xs text-muted-foreground'>
                            {option.cantidad > 0 ? 'Sin bebida' : 'Selecciona una cantidad'}
                          </p>
                        )}
                      </div>
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
                    </div>
                  );
                }
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
