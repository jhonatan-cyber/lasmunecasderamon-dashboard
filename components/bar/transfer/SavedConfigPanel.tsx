'use client';

import { memo, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { formatCurrencyCLP } from '@/lib/utils/formatters';
import { ChampagneTiersReadonly } from '@/components/bar/transfer/ChampagneTiers';
import type { ChampagneTierRow } from '@/components/bar/transfer/transferOptions';
import type { SaleOption } from '@/types/sale-options';
import { preciosCortoAnfitriona } from '@/lib/sales/hostessShortPrices';
import { optionPanelClass, optionPanelHeadingClass } from '@/components/bar/transfer/panelStyles';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';

/**
 * Bloque «Configuración guardada»: reutiliza precio/comisión/anfitrionas ya
 * configurados, con los ml por shot editables y la tabla champagne en lectura.
 */
export const SavedConfigPanel = memo(function SavedConfigPanel({
  opciones,
  esChampagne,
  tiers,
  saving,
  shotMl,
  mlShotCliente,
  mlShotAnfitriona,
  onMlShotClienteChange,
  onMlShotAnfitrionaChange,
  onEditPrices,
  colacionHabilitada,
  onColacionHabilitadaChange,
  maxAnfitrionas,
  onMaxAnfitrionasChange,
  bottleExtras,
  bottleTiers,
  mostrarBebidasIncluidas = true,
  mostrarAnfitrionas = true,
  mostrarCortos = true,
  mostrarColacion = true,
  esCigarrillos = false
}: {
  opciones: SaleOption[];
  esChampagne: boolean;
  tiers: ChampagneTierRow[];
  saving: boolean;
  shotMl: number;
  mlShotCliente: string;
  mlShotAnfitriona: string;
  onMlShotClienteChange: (value: string) => void;
  onMlShotAnfitrionaChange: (value: string) => void;
  onEditPrices: () => void;
  colacionHabilitada?: boolean;
  onColacionHabilitadaChange?: (value: boolean) => void;
  maxAnfitrionas?: string;
  onMaxAnfitrionasChange?: (value: string) => void;
  bottleExtras?: ReactNode;
  bottleTiers?: ReactNode;
  /** Bebidas analcohólicas por botella: oculto si el producto ya es analcohólico. */
  mostrarBebidasIncluidas?: boolean;
  /** Anfitrionas/comisión: oculto si el producto es analcohólico. */
  mostrarAnfitrionas?: boolean;
  /** Venta por cortos: oculta si el producto es analcohólico. */
  mostrarCortos?: boolean;
  /** Check de colación: solo se muestra en la misma línea del cover en el modal. */
  mostrarColacion?: boolean;
  /** La presentación se vende como cigarrillo (textos «de botella» → «de cigarrillo»). */
  esCigarrillos?: boolean;
}) {
  const bottle = opciones.find(option => option.tipo === 'botella');
  return (
    <div className='space-y-4'>
      <p className='text-sm font-semibold'>Configuración guardada</p>
      {bottle && (
        <>
          {mostrarAnfitrionas ? (
            <div className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
              <section aria-label='Botella con anfitriona' className={optionPanelClass}>
                <h3 className={optionPanelHeadingClass}>Con anfitriona</h3>
                <dl className='space-y-3'>
                  <div>
                    <dt className='text-xs text-muted-foreground'>
                      Precio de botella con anfitriona
                    </dt>
                    <dd className='text-lg font-semibold tabular-nums'>
                      {formatCurrencyCLP(bottle.precio)}
                    </dd>
                  </div>
                  <div>
                    <dt className='text-xs text-muted-foreground'>Comisión</dt>
                    <dd className='font-semibold tabular-nums'>
                      {formatCurrencyCLP(bottle.comision ?? 0)}
                    </dd>
                  </div>
                </dl>
                {onMaxAnfitrionasChange && Number(bottle.comision) > 0 && (
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
                      value={maxAnfitrionas ?? ''}
                      onChange={event => onMaxAnfitrionasChange(event.target.value)}
                      placeholder='1'
                      disabled={saving}
                      className='h-12'
                    />
                  </div>
                )}
                {bottleTiers}
              </section>
              <section aria-label='Botella sin anfitriona' className={optionPanelClass}>
                <h3 className={optionPanelHeadingClass}>Sin anfitriona</h3>
                <dl>
                  <dt className='text-xs text-muted-foreground'>
                    Precio de botella sin anfitriona
                  </dt>
                  <dd className='text-lg font-semibold tabular-nums'>
                    {Number(bottle.precio_sin_anfitriona) > 0
                      ? formatCurrencyCLP(bottle.precio_sin_anfitriona!)
                      : 'No configurado'}
                  </dd>
                </dl>
              </section>
            </div>
          ) : (
            <section aria-label='Botella sin anfitrionas' className={optionPanelClass}>
              <h3 className={optionPanelHeadingClass}>Precio</h3>
              <dl className='space-y-3'>
                <div>
                  <dt className='text-xs text-muted-foreground'>
                    {esCigarrillos ? 'Precio de cigarrillo' : 'Precio de botella'}
                  </dt>
                  <dd className='text-lg font-semibold tabular-nums'>
                    {formatCurrencyCLP(bottle.precio)}
                  </dd>
                </div>
              </dl>
            </section>
          )}
          {mostrarBebidasIncluidas && (
            <section aria-label='Bebidas incluidas en ambas opciones' className={optionPanelClass}>
              <div>
                <h3 className={optionPanelHeadingClass}>Bebidas incluidas</h3>
              </div>
              {bottle.acompanamiento && (
                <p className='text-xs text-muted-foreground'>
                  Incluye {bottle.acompanamiento.unidades} unidades de bebida por botella
                </p>
              )}
              {bottleExtras}
            </section>
          )}
          {mostrarColacion && onColacionHabilitadaChange && (
            <Label className='flex cursor-pointer items-start gap-3'>
              <Checkbox
                checked={colacionHabilitada === true}
                onCheckedChange={checked => onColacionHabilitadaChange(checked === true)}
                disabled={saving}
                aria-label='Habilitar bebida para colación'
              />
              <span className='space-y-1'>
                <span className='block text-sm font-medium'>Habilitar bebida para colación</span>
                <span className='block text-xs text-muted-foreground'>
                  La bebida aparecerá en el módulo Colaciones para cobrarla al trabajador.
                </span>
              </span>
            </Label>
          )}
        </>
      )}
      {mostrarCortos &&
        opciones
          .filter(option => option.tipo === 'shot')
          .map(option => (
            <section
              key={option.tipo}
              aria-label='Configuración guardada de cortos'
              className='space-y-3'
            >
              <h3 className={optionPanelHeadingClass}>Venta por cortos</h3>
              <div className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
                <section aria-label='Corto para cliente' className={optionPanelClass}>
                  <div className='flex items-center justify-between gap-2'>
                    <h4 className={optionPanelHeadingClass}>Cliente</h4>
                    <span className='text-xs text-muted-foreground'>Sin comisión</span>
                  </div>
                  <p className='font-semibold tabular-nums'>
                    {option.precio > 0
                      ? `Cliente ${formatCurrencyCLP(option.precio)} · Sin comisión`
                      : 'Corto cliente no habilitado'}
                  </p>
                  <div className='space-y-2'>
                    <Label htmlFor='transfer-ml-shot' className='text-sm font-medium'>
                      Ml por corto a cliente
                    </Label>
                    <Input
                      id='transfer-ml-shot'
                      value={mlShotCliente}
                      onChange={event =>
                        onMlShotClienteChange(event.target.value.replace(/\D/g, ''))
                      }
                      placeholder={String(shotMl)}
                      inputMode='numeric'
                      disabled={saving}
                      className='h-12 tabular-nums'
                    />
                  </div>
                </section>
                <section aria-label='Corto para anfitriona' className={optionPanelClass}>
                  <h4 className={optionPanelHeadingClass}>Anfitriona</h4>
                  <div className='space-y-2'>
                    {preciosCortoAnfitriona(option).length ? (
                      preciosCortoAnfitriona(option).map((row, index) => (
                        <p key={index} className='font-semibold tabular-nums'>
                          Anfitriona {formatCurrencyCLP(row.precio)} · Comisión{' '}
                          {formatCurrencyCLP(row.comision)}
                        </p>
                      ))
                    ) : (
                      <p className='text-sm text-muted-foreground'>
                        Corto anfitriona no habilitado
                      </p>
                    )}
                  </div>
                  <div className='space-y-2'>
                    <Label htmlFor='transfer-ml-shot-anfitriona' className='text-sm font-medium'>
                      Ml por corto a anfitriona
                    </Label>
                    <Input
                      id='transfer-ml-shot-anfitriona'
                      value={mlShotAnfitriona}
                      onChange={event =>
                        onMlShotAnfitrionaChange(event.target.value.replace(/\D/g, ''))
                      }
                      placeholder={mlShotCliente || String(shotMl)}
                      inputMode='numeric'
                      disabled={saving}
                      className='h-12 tabular-nums'
                    />
                  </div>
                  <p className='text-xs text-muted-foreground'>
                    Ml de bebida analcohólica por corto: {option.ml_acompanamiento_anfitriona || 0}{' '}
                    ml.
                  </p>
                </section>
              </div>
            </section>
          ))}
      {esChampagne && tiers.length > 0 && <ChampagneTiersReadonly tiers={tiers} />}
      <Button
        type='button'
        variant='outline'
        disabled={saving}
        onClick={onEditPrices}
        className='w-full rounded-full'
      >
        Modificar precios
      </Button>
    </div>
  );
});
