'use client';

import { memo } from 'react';
import { ProductPhoto } from '@/components/shared/ProductPhoto';
import { formatCurrencyCLP } from '@/lib/utils/formatters';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  esBebidaAnalcoholica,
  esCigarrillos,
  type BarStockItem
} from '@/components/bar/transfer/transferOptions';
import type { TransferForm } from '@/hooks/shared/useTransferForm';
import { preciosCortoAnfitriona } from '@/lib/sales/hostessShortPrices';
import type { SaleOption } from '@/types/sale-options';

const photoSrc = (item: BarStockItem): string => {
  if (item.foto && item.foto !== 'default.png') {
    return item.foto.startsWith('http') ? item.foto : `/api/images/products/${item.foto}`;
  }
  if (item.producto_foto && item.producto_foto !== 'default.png') {
    return item.producto_foto.startsWith('http')
      ? item.producto_foto
      : `/api/images/products/${item.producto_foto}`;
  }
  return '/api/images/products/default.png';
};

/** Ficha de la presentación que se va a traspasar (foto, stock y configuración). */
export const TransferItemSummary = memo(function TransferItemSummary({
  item,
  configuration
}: {
  item: BarStockItem;
  configuration?: Pick<
    TransferForm,
    | 'usarConfigGuardada'
    | 'opcionesGuardadas'
    | 'tipos'
    | 'precioVenta'
    | 'comision'
    | 'precioShot'
    | 'precioShotAnfitriona'
    | 'comisionShot'
    | 'mlAcompanamientoAnfitriona'
    | 'preciosAnfitrionaExtra'
    | 'tiers'
    | 'maxAnfitrionas'
    | 'acompanamientoBotella'
    | 'unidadesAcompanamiento'
    | 'mlPorShot'
    | 'mlPorShotAnfitriona'
  >;
}) {
  const disponible = item.stock ?? 0;
  // Cigarrillos: sin anfitrionas ni bebidas; la etiqueta es «cajetilla».
  const esCig = esCigarrillos(item.categoria_nombre);
  // Analcohólicas: modo simple, tampoco muestran comisión ni bebida de cortesía.
  const esAnalcoholica = esBebidaAnalcoholica(item.categoria_nombre);
  const amount = (value: string) => Number(value.replace(/\./g, '')) || 0;
  const options: SaleOption[] = configuration
    ? configuration.usarConfigGuardada
      ? configuration.opcionesGuardadas
      : configuration.tipos.map(tipo => ({
          tipo,
          ml_acompanamiento_anfitriona:
            tipo === 'shot' ? Number(configuration.mlAcompanamientoAnfitriona || 0) : undefined,
          precio: amount(tipo === 'botella' ? configuration.precioVenta : configuration.precioShot),
          comision: amount(
            tipo === 'botella' ? configuration.comision : configuration.comisionShot
          ),
          precio_anfitriona:
            tipo === 'shot' ? amount(configuration.precioShotAnfitriona) : undefined,
          precios_anfitriona:
            tipo === 'shot'
              ? [
                  ...(configuration.precioShotAnfitriona.trim()
                    ? [
                        {
                          precio: amount(configuration.precioShotAnfitriona),
                          comision: amount(configuration.comisionShot)
                        }
                      ]
                    : []),
                  ...configuration.preciosAnfitrionaExtra.map(row => ({
                    precio: amount(row.precio),
                    comision: amount(row.comision)
                  }))
                ]
              : undefined
        }))
    : [];
  const bottle = options.find(option => option.tipo === 'botella');
  const maxHostesses = configuration
    ? Number(bottle?.comision) > 0
      ? Number(configuration.maxAnfitrionas || 1)
      : options.some(option => preciosCortoAnfitriona(option).some(row => Number(row.comision) > 0))
        ? 1
        : 0
    : item.max_anfitrionas;

  return (
    <div className='space-y-4'>
      <div className='flex items-center gap-3'>
        <div
          data-photo-surface
          className='relative h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-white dark:bg-white/[0.04]'
        >
          <ProductPhoto
            src={photoSrc(item)}
            alt={`${item.producto_nombre} ${item.nombre}`}
            fill
            className='object-contain p-1.5'
          />
        </div>
        <p className='text-sm text-gray-600 dark:text-gray-400 min-w-0'>
          <TooltipProvider>
            <Tooltip delayDuration={300}>
              <TooltipTrigger asChild>
                <span className='font-semibold text-gray-900 dark:text-neutral-100 block truncate cursor-help'>
                  {item.categoria_nombre ? `${item.categoria_nombre} ` : ''}
                  {item.producto_nombre} de {item.nombre}
                </span>
              </TooltipTrigger>
              <TooltipContent className='bg-black text-white dark:bg-white dark:text-black rounded-xl border-none text-xs font-bold px-3 py-1.5 shadow-xl break-words max-w-xs'>
                <p>
                  {item.categoria_nombre ? `${item.categoria_nombre} ` : ''}
                  {item.producto_nombre} de {item.nombre}
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          Disponibles en bodega: <span className='font-bold'>{disponible}</span>
          {' · '}En bar: <span className='font-bold'>{item.stock_bar ?? 0}</span>
          {item.precio_compra > 0 && (
            <>
              <br />
              Precio compra: {formatCurrencyCLP(item.precio_compra)}
            </>
          )}
          <br />
          <span className='text-xs'>
            {esCig ? (
              (item.categoria_nombre ?? 'sin categoría')
            ) : (
              <>
                Config. comisiones: máx.{' '}
                {maxHostesses !== null && maxHostesses !== undefined
                  ? `${maxHostesses} anf.`
                  : 'default por precio'}
                {' · '}
                {item.categoria_nombre ?? 'sin categoría'}
              </>
            )}
          </span>
        </p>
      </div>
      {configuration && (
        <div
          className='space-y-2 text-xs text-muted-foreground'
          aria-label='Resumen de configuración'
        >
          <p className='font-semibold text-foreground'>Configuración actual</p>
          {options.length === 0 && <p>Selecciona un tipo de venta.</p>}
          {options.map(option => (
            <div key={option.tipo} className='space-y-1'>
              <p>
                {esCig ? 'Cajetilla' : option.tipo === 'botella' ? 'Botella' : 'Corto cliente'}:{' '}
                <span className='font-semibold text-foreground'>
                  {option.tipo === 'shot' && option.precio <= 0
                    ? 'No habilitado'
                    : formatCurrencyCLP(option.precio)}
                </span>
                {!esCig &&
                  !esAnalcoholica &&
                  option.tipo === 'botella' &&
                  ` · Comisión: ${formatCurrencyCLP(option.comision ?? 0)}`}
              </p>
              {option.tipo === 'shot' && (
                <>
                  {preciosCortoAnfitriona(option).map((row, index) => (
                    <p key={index}>
                      Corto anfitriona {index + 1}: {formatCurrencyCLP(row.precio)} · Comisión:{' '}
                      {formatCurrencyCLP(row.comision)}
                    </p>
                  ))}
                  <p>
                    Cliente: {configuration.mlPorShot} ml · Anfitriona:{' '}
                    {configuration.mlPorShotAnfitriona} ml
                  </p>
                  <p>
                    Cliente: producto completo · Bebida analcohólica anfitriona:{' '}
                    {option.ml_acompanamiento_anfitriona ?? 0} ml
                  </p>
                </>
              )}
            </div>
          ))}
          {bottle && Number(bottle.comision) > 0 && Number(maxHostesses) >= 2 && (
            <div className='space-y-1'>
              <p className='font-semibold text-foreground'>Botella por anfitrionas</p>
              {configuration.tiers
                .filter(row => row.anfitrionas <= Number(maxHostesses))
                .map(row => (
                  <p key={row.anfitrionas}>
                    {row.anfitrionas} anfitrionas: {formatCurrencyCLP(amount(row.precio))} ·
                    Comisión: {formatCurrencyCLP(amount(row.comision))}
                  </p>
                ))}
            </div>
          )}
          {!esCig && !esAnalcoholica && bottle && (
            <p>
              Bebida:{' '}
              {configuration.acompanamientoBotella === 'ninguno'
                ? 'Sin bebida'
                : `${configuration.unidadesAcompanamiento || '—'} unidades por botella`}
            </p>
          )}
        </div>
      )}
    </div>
  );
});
