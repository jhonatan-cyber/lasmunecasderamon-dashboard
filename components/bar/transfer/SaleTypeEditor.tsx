'use client';

import { ShortSaleEditor } from '@/components/bar/transfer/ShortSaleEditor';
import { BottleExtras } from '@/components/bar/transfer/BottleExtras';
import { memo } from 'react';
import { Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input as PlainInput } from '@/components/ui/input';
import { FormattedNumberInput as Input } from '@/components/shared/FormattedNumberInput';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { ChampagneTiersEditor } from '@/components/bar/transfer/ChampagneTiers';
import { formatNumber } from '@/components/bar/transfer/transferOptions';
import { Checkbox } from '@/components/ui/checkbox';
import { optionPanelClass, optionPanelHeadingClass } from '@/components/bar/transfer/panelStyles';
import type { ChampagneTierRow } from '@/components/bar/transfer/transferOptions';
import type { SaleType } from '@/types/sale-options';

/**
 * Modo «editar precios»: toggle de tipos de venta (botella/shot), campos de
 * precio y comisión por tipo, ml por shot y la tabla champagne editable.
 */
export const SaleTypeEditor = memo(function SaleTypeEditor({
  context = 'transfer',
  precioSinAnfitriona = '',
  onPrecioSinAnfitrionaChange,
  mlAcompanamientoAnfitriona,
  onMlAcompanamientoAnfitrionaChange,

  maxAnfitrionas,
  onMaxAnfitrionasChange,
  colacionHabilitada = false,
  onColacionHabilitadaChange,
  coverHabilitado = false,
  onCoverHabilitadoChange,
  mostrarBebidasIncluidas = true,
  mostrarAnfitrionas = true,
  mostrarCortos = true,
  esCigarrillos = false,
  unidadesAcompanamiento,
  onAcompanamientoBotellaChange,
  onUnidadesAcompanamientoChange,
  tipos,
  etiquetaShot,
  precioVenta,
  comision,
  precioShot,
  precioShotAnfitriona,
  comisionShot,
  preciosAnfitrionaExtra,
  onPreciosAnfitrionaExtraChange,
  shotMl,
  mlShotCliente,
  mlShotAnfitriona,
  esChampagne,
  tiers,
  saving,
  onTiposChange,
  onPrecioVentaChange,
  onComisionChange,
  onPrecioShotChange,
  onPrecioShotAnfitrionaChange,
  onComisionShotChange,
  onMlShotClienteChange,
  onMlShotAnfitrionaChange,
  onTierChange,
  onUseSavedConfig
}: {
  context?: 'transfer' | 'settings';
  precioSinAnfitriona?: string;
  onPrecioSinAnfitrionaChange?: (value: string) => void;
  maxAnfitrionas?: string;
  onMaxAnfitrionasChange?: (value: string) => void;
  colacionHabilitada?: boolean;
  onColacionHabilitadaChange?: (value: boolean) => void;
  /** Solo settings: cover por botella para entradas de clientes (analgólicas). */
  coverHabilitado?: boolean;
  onCoverHabilitadoChange?: (value: boolean) => void;
  /** Bebidas analcohólicas por botella: oculto si el producto ya es analcohólico. */
  mostrarBebidasIncluidas?: boolean;
  /** Anfitrionas/comisión: oculto si el producto es analcohólico. */
  mostrarAnfitrionas?: boolean;
  /** Venta por cortos: oculta si el producto es analcohólico. */
  mostrarCortos?: boolean;
  /** La presentación se vende como cigarrillo (textos «de botella» → «de cigarrillo»). */
  esCigarrillos?: boolean;
  acompanamientoBotella: 'ninguno' | 'gaseosa' | 'soda';
  unidadesAcompanamiento: string;
  onAcompanamientoBotellaChange: (value: 'ninguno' | 'gaseosa' | 'soda') => void;
  onUnidadesAcompanamientoChange: (value: string) => void;
  tipos: SaleType[];
  etiquetaShot: string;
  precioVenta: string;
  comision: string;
  mlAcompanamientoAnfitriona: string;
  onMlAcompanamientoAnfitrionaChange: (value: string) => void;
  precioShot: string;
  precioShotAnfitriona: string;
  comisionShot: string;
  preciosAnfitrionaExtra: { precio: string; comision: string }[];
  onPreciosAnfitrionaExtraChange: (rows: { precio: string; comision: string }[]) => void;
  shotMl: number;
  mlShotCliente: string;
  mlShotAnfitriona: string;
  esChampagne: boolean;
  tiers: ChampagneTierRow[];
  saving: boolean;
  onTiposChange: (tipos: SaleType[]) => void;
  onPrecioVentaChange: (value: string) => void;
  onComisionChange: (value: string) => void;
  onPrecioShotChange: (value: string) => void;
  onPrecioShotAnfitrionaChange: (value: string) => void;
  onComisionShotChange: (value: string) => void;
  onMlShotClienteChange: (value: string) => void;
  onMlShotAnfitrionaChange: (value: string) => void;
  onTierChange: (index: number, field: 'precio' | 'comision', value: string) => void;
  /** Solo existe cuando el producto ya tenía precios configurados. */
  onUseSavedConfig?: () => void;
}) {
  return (
    <>
      {onUseSavedConfig && (
        <Button
          type='button'
          variant='ghost'
          disabled={saving}
          onClick={onUseSavedConfig}
          className='w-full rounded-full text-xs'
        >
          Usar configuración guardada
        </Button>
      )}
      <fieldset className='flex flex-col gap-3'>
        {mostrarCortos && (
          <>
            <legend className='mb-2 text-sm font-semibold'>Tipo de venta</legend>
            <ToggleGroup
              type='multiple'
              variant='selection'
              value={tipos}
              onValueChange={value => onTiposChange(value as SaleType[])}
              disabled={saving}
              aria-label='Tipos de venta'
              className='justify-start'
            >
              <ToggleGroupItem value='botella' className='flex-1 rounded-full'>
                {tipos.includes('botella') && <Check aria-hidden='true' />}
                Botella
              </ToggleGroupItem>
              <ToggleGroupItem value='shot' className='flex-1 rounded-full'>
                {tipos.includes('shot') && <Check aria-hidden='true' />}
                {etiquetaShot}
              </ToggleGroupItem>
            </ToggleGroup>
          </>
        )}
        {tipos.map(tipo => (
          <fieldset key={tipo} className='min-w-0 space-y-3'>
            <legend className='px-1 text-sm font-semibold'>
              {tipo === 'botella'
                ? esCigarrillos
                  ? 'Venta por cigarrillo'
                  : 'Venta por botella'
                : etiquetaShot}
            </legend>
            {tipo === 'shot' ? (
              <ShortSaleEditor
                hideHelp={context === 'transfer'}
                mlAcompanamientoAnfitriona={mlAcompanamientoAnfitriona}
                onMlAcompanamientoAnfitrionaChange={onMlAcompanamientoAnfitrionaChange}

                precioShot={precioShot}
                precioShotAnfitriona={precioShotAnfitriona}
                comisionShot={comisionShot}
                mlShotCliente={mlShotCliente}
                mlShotAnfitriona={mlShotAnfitriona}
                shotMl={shotMl}
                preciosAnfitrionaExtra={preciosAnfitrionaExtra}
                saving={saving}
                onPrecioShotChange={onPrecioShotChange}
                onPrecioShotAnfitrionaChange={onPrecioShotAnfitrionaChange}
                onComisionShotChange={onComisionShotChange}
                onMlShotClienteChange={onMlShotClienteChange}
                onMlShotAnfitrionaChange={onMlShotAnfitrionaChange}
                onPreciosAnfitrionaExtraChange={onPreciosAnfitrionaExtraChange}
              />
            ) : (
              <div className='space-y-5'>
                {mostrarAnfitrionas ? (
                  <div className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
                    <section aria-label='Botella con anfitriona' className={optionPanelClass}>
                      <div>
                        <h3 className={optionPanelHeadingClass}>Con anfitriona</h3>
                      </div>
                      <div className='space-y-2'>
                        <label htmlFor='price-botella' className='text-sm font-medium'>
                          Precio de botella con anfitriona
                        </label>
                        <Input
                          currency
                          id='price-botella'
                          required
                          value={precioVenta}
                          onChange={event => onPrecioVentaChange(formatNumber(event.target.value))}
                          disabled={saving}
                          placeholder='0'
                          className='h-12 text-lg font-semibold tabular-nums'
                        />
                      </div>
                      <div className='space-y-2'>
                        <label htmlFor='commission-botella' className='text-sm font-medium'>
                          Comisión
                        </label>
                        <Input
                          currency
                          id='commission-botella'
                          required={
                            context === 'settings' && Number(precioVenta.replace(/\./g, '')) > 0
                          }
                          value={comision}
                          onChange={event => onComisionChange(formatNumber(event.target.value))}
                          disabled={saving}
                          placeholder='Sin comisión'
                          className='h-12 tabular-nums'
                        />
                      </div>
                      {onMaxAnfitrionasChange &&
                        (context === 'settings' || Number(comision.replace(/\./g, '')) > 0) && (
                          <div className='space-y-2'>
                            <label htmlFor='bottle-hostess-limit' className='text-sm font-medium'>
                              Máximo de anfitrionas
                            </label>
                            <PlainInput
                              id='bottle-hostess-limit'
                              type='number'
                              min={1}
                              max={20}
                              step={1}
                              value={maxAnfitrionas ?? ''}
                              onChange={event => onMaxAnfitrionasChange(event.target.value)}
                              disabled={saving}
                              placeholder={context === 'settings' ? 'Default' : '1'}
                              className='h-12'
                            />
                          </div>
                        )}
                      {context === 'transfer' &&
                        Number(comision.replace(/\./g, '')) > 0 &&
                        Number(maxAnfitrionas || 1) >= 2 && (
                          <ChampagneTiersEditor
                            tiers={tiers}
                            saving={saving}
                            onTierChange={onTierChange}
                          />
                        )}
                    </section>
                    <section aria-label='Botella sin anfitriona' className={optionPanelClass}>
                      <div>
                        <h3 className={optionPanelHeadingClass}>Sin anfitriona</h3>
                      </div>
                      {onPrecioSinAnfitrionaChange && (
                        <div className='space-y-2'>
                          <label htmlFor='bottle-price-no-hostess' className='text-sm font-medium'>
                            Precio de botella sin anfitriona
                          </label>
                          <Input
                            currency
                            id='bottle-price-no-hostess'
                            value={precioSinAnfitriona}
                            onChange={event =>
                              onPrecioSinAnfitrionaChange(formatNumber(event.target.value))
                            }
                            disabled={saving}
                            placeholder='Sin precio adicional'
                            className='h-12 text-lg font-semibold tabular-nums'
                          />
                        </div>
                      )}
                    </section>
                  </div>
                ) : (
                  <section aria-label='Botella sin anfitrionas' className={optionPanelClass}>
                    <div>
                      <h3 className={optionPanelHeadingClass}>Precio</h3>
                    </div>
                    <div className='space-y-2'>
                      <label htmlFor='price-botella' className='text-sm font-medium'>
                        {esCigarrillos ? 'Precio de cigarrillo' : 'Precio de botella'}
                      </label>
                      <Input
                        currency
                        id='price-botella'
                        required
                        value={precioVenta}
                        onChange={event => onPrecioVentaChange(formatNumber(event.target.value))}
                        disabled={saving}
                        placeholder='0'
                        className='h-12 text-lg font-semibold tabular-nums'
                      />
                    </div>
                  </section>
                )}
                {mostrarBebidasIncluidas && (
                  <section
                    aria-label='Bebidas incluidas en ambas opciones'
                    className={optionPanelClass}
                  >
                    <div>
                      <h3 className={optionPanelHeadingClass}>Bebidas incluidas</h3>
                      {context === 'settings' && (
                        <p className='mt-1 text-xs text-muted-foreground'>
                          La misma cantidad de bebidas analcohólicas por botella, con o sin
                          anfitriona.
                        </p>
                      )}
                    </div>
                    <BottleExtras
                      context={context}
                      commission={comision}

                      onAccompaniment={checked =>
                        onAcompanamientoBotellaChange(checked ? 'gaseosa' : 'ninguno')
                      }
                      units={unidadesAcompanamiento}
                      onUnits={onUnidadesAcompanamientoChange}
                      disabled={saving}
                    />
                  </section>
                )}
                {context === 'settings' && mostrarAnfitrionas && onColacionHabilitadaChange && (
                  <label className='flex cursor-pointer items-start gap-3'>
                    <Checkbox
                      checked={colacionHabilitada}
                      onCheckedChange={checked => onColacionHabilitadaChange(checked === true)}
                      disabled={saving}
                      aria-label='Habilitar bebida para colación'
                    />
                    <span className='space-y-1'>
                      <span className='block text-sm font-medium'>
                        Habilitar bebida para colación
                      </span>
                      <span className='block text-xs text-muted-foreground'>
                        La bebida aparecerá en el módulo Colaciones para cobrarla al trabajador.
                      </span>
                    </span>
                  </label>
                )}
                {context === 'settings' && !mostrarAnfitrionas && !esCigarrillos && (
                  <div className='flex flex-wrap items-start gap-x-8 gap-y-3'>
                    {onColacionHabilitadaChange && (
                      <label className='flex cursor-pointer items-start gap-2'>
                        <Checkbox
                          checked={colacionHabilitada}
                          onCheckedChange={checked => onColacionHabilitadaChange(checked === true)}
                          disabled={saving}
                          aria-label='Habilitar bebida para colación'
                        />
                        <span>
                          <span className='block text-sm font-medium'>Habilitar colación</span>
                          <span className='block text-xs text-muted-foreground'>
                            Aparecerá en el módulo Colaciones para cobrarla al trabajador.
                          </span>
                        </span>
                      </label>
                    )}
                    {onCoverHabilitadoChange && (
                      <label className='flex cursor-pointer items-start gap-2'>
                        <Checkbox
                          checked={coverHabilitado}
                          onCheckedChange={checked => onCoverHabilitadoChange(checked === true)}
                          disabled={saving}
                          aria-label='Habilitar bebida para cover de clientes'
                        />
                        <span>
                          <span className='block text-sm font-medium'>
                            Habilitar cover para clientes
                          </span>
                          <span className='block text-xs text-muted-foreground'>
                            Aparecerá como opción al registrar entradas de clientes.
                          </span>
                        </span>
                      </label>
                    )}
                  </div>
                )}
              </div>
            )}
          </fieldset>
        ))}
      </fieldset>

      {context === 'settings' && esChampagne && tiers.length > 0 && (
        <ChampagneTiersEditor tiers={tiers} saving={saving} onTierChange={onTierChange} />
      )}
    </>
  );
});
