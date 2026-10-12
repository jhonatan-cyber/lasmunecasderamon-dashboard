'use client';

import { memo } from 'react';
import { Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { ChampagneTiersEditor } from '@/components/bar/transfer/ChampagneTiers';
import { formatNumber } from '@/components/bar/transfer/transferOptions';
import type { ChampagneTierRow } from '@/components/bar/transfer/transferOptions';
import type { SaleType } from '@/types/sale-options';

/**
 * Modo «editar precios»: toggle de tipos de venta (botella/shot), campos de
 * precio y comisión por tipo, ml por shot y la tabla champagne editable.
 */
export const SaleTypeEditor = memo(function SaleTypeEditor({
  context = 'transfer',
  acompanamientoBotella,
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
  acompanamientoBotella: 'ninguno' | 'gaseosa' | 'soda';
  unidadesAcompanamiento: string;
  onAcompanamientoBotellaChange: (value: 'ninguno' | 'gaseosa' | 'soda') => void;
  onUnidadesAcompanamientoChange: (value: string) => void;
  tipos: SaleType[];
  etiquetaShot: string;
  precioVenta: string;
  comision: string;
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
        <p className='text-xs text-muted-foreground'>
          Puedes seleccionar uno o ambos tipos. La cantidad transferida corresponde a unidades
          completas de la presentación.
        </p>
        {tipos.map(tipo => (
          <fieldset key={tipo} className='rounded-xl border p-3'>
            <legend className='px-1 text-sm font-semibold'>
              {tipo === 'botella' ? 'Botella' : etiquetaShot}
            </legend>
            <div className='grid grid-cols-2 items-end gap-3'>
              {tipo === 'botella' && (
                <>
                  <div className='flex flex-col gap-2'>
                    <label htmlFor='bottle-mixer'>Acompañamiento de la botella</label>
                    <select
                      id='bottle-mixer'
                      className='h-10 rounded-md border bg-background px-3 text-sm'
                      disabled={saving}
                      value={acompanamientoBotella}
                      onChange={event =>
                        onAcompanamientoBotellaChange(
                          event.target.value as 'ninguno' | 'gaseosa' | 'soda'
                        )
                      }
                    >
                      <option value='ninguno'>Sin acompañamiento</option>
                      <option value='gaseosa'>Gaseosas</option>
                      <option value='soda'>Sodas</option>
                    </select>
                  </div>
                  {acompanamientoBotella !== 'ninguno' && (
                    <div className='flex flex-col gap-2'>
                      <label htmlFor='bottle-mixer-units'>Unidades por botella</label>
                      <Input
                        id='bottle-mixer-units'
                        required
                        type='number'
                        min={1}
                        max={1000}
                        step={1}
                        disabled={saving}
                        value={unidadesAcompanamiento}
                        onChange={event => onUnidadesAcompanamientoChange(event.target.value)}
                      />
                    </div>
                  )}
                </>
              )}

              <div className='flex flex-col gap-2'>
                <label htmlFor={'price-' + tipo} className='text-sm'>
                  {tipo === 'botella'
                    ? 'Precio por botella'
                    : 'Precio corto cliente (sin comisión)'}
                </label>
                <Input
                  id={'price-' + tipo}
                  required
                  inputMode='numeric'
                  placeholder='0'
                  disabled={saving}
                  value={tipo === 'botella' ? precioVenta : precioShot}
                  onChange={event =>
                    (tipo === 'botella' ? onPrecioVentaChange : onPrecioShotChange)(
                      formatNumber(event.target.value)
                    )
                  }
                />
              </div>
              {tipo === 'shot' && (
                <div className='flex flex-col gap-2'>
                  <label htmlFor='price-shot-anfitriona' className='text-sm'>
                    Precio corto anfitriona
                  </label>
                  <Input
                    id='price-shot-anfitriona'
                    inputMode='numeric'
                    placeholder='Igual que cliente'
                    disabled={saving}
                    value={precioShotAnfitriona}
                    onChange={event =>
                      onPrecioShotAnfitrionaChange(formatNumber(event.target.value))
                    }
                  />
                </div>
              )}
              <div className='flex flex-col gap-2'>
                <label htmlFor={'commission-' + tipo} className='text-sm'>
                  {tipo === 'shot' ? 'Comisión corto anfitriona' : 'Comisión (opcional)'}
                </label>
                <Input
                  id={'commission-' + tipo}
                  inputMode='numeric'
                  placeholder='Sin comisión'
                  disabled={saving}
                  value={tipo === 'botella' ? comision : comisionShot}
                  onChange={event =>
                    (tipo === 'botella' ? onComisionChange : onComisionShotChange)(
                      formatNumber(event.target.value)
                    )
                  }
                />
              </div>
              {tipo === 'shot' && (
                <div className='col-span-2 space-y-3'>
                  {preciosAnfitrionaExtra.map((row, index) => (
                    <div key={index} className='grid grid-cols-2 gap-2 rounded-lg border p-3'>
                      <label className='text-sm'>
                        Precio anfitriona {index + 2}
                        <Input
                          aria-label={`Precio anfitriona ${index + 2}`}
                          inputMode='numeric'
                          disabled={saving}
                          value={row.precio}
                          onChange={event =>
                            onPreciosAnfitrionaExtraChange(
                              preciosAnfitrionaExtra.map((item, i) =>
                                i === index
                                  ? { ...item, precio: formatNumber(event.target.value) }
                                  : item
                              )
                            )
                          }
                        />
                      </label>
                      <label className='text-sm'>
                        Comisión anfitriona {index + 2}
                        <Input
                          aria-label={`Comisión anfitriona ${index + 2}`}
                          inputMode='numeric'
                          disabled={saving}
                          value={row.comision}
                          onChange={event =>
                            onPreciosAnfitrionaExtraChange(
                              preciosAnfitrionaExtra.map((item, i) =>
                                i === index
                                  ? { ...item, comision: formatNumber(event.target.value) }
                                  : item
                              )
                            )
                          }
                        />
                      </label>
                      <Button
                        type='button'
                        variant='ghost'
                        disabled={saving}
                        onClick={() =>
                          onPreciosAnfitrionaExtraChange(
                            preciosAnfitrionaExtra.filter((_, i) => i !== index)
                          )
                        }
                      >
                        Quitar precio {index + 2}
                      </Button>
                    </div>
                  ))}
                  <Button
                    type='button'
                    variant='outline'
                    disabled={saving || preciosAnfitrionaExtra.length >= 19}
                    onClick={() =>
                      onPreciosAnfitrionaExtraChange([
                        ...preciosAnfitrionaExtra,
                        { precio: '', comision: '' }
                      ])
                    }
                  >
                    Agregar precio de anfitriona
                  </Button>
                  <p className='text-xs text-muted-foreground'>
                    Cada precio de anfitriona tiene su propia comisión. El corto de cliente se vende
                    sin comisión.
                  </p>
                </div>
              )}
              {tipo === 'shot' && (
                <div className='flex flex-col gap-2'>
                  <label htmlFor='transfer-ml-shot-cliente' className='text-sm'>
                    Ml corto cliente
                  </label>
                  <Input
                    id='transfer-ml-shot-cliente'
                    value={mlShotCliente}
                    onChange={event => onMlShotClienteChange(event.target.value.replace(/\D/g, ''))}
                    placeholder={String(shotMl)}
                    inputMode='numeric'
                    disabled={saving}
                  />
                </div>
              )}
              {tipo === 'shot' && (
                <div className='flex flex-col gap-2'>
                  <label htmlFor='transfer-ml-shot-anfitriona' className='text-sm'>
                    Ml corto anfitriona
                  </label>
                  <Input
                    id='transfer-ml-shot-anfitriona'
                    value={mlShotAnfitriona}
                    onChange={event =>
                      onMlShotAnfitrionaChange(event.target.value.replace(/\D/g, ''))
                    }
                    placeholder='Igual que cliente'
                    inputMode='numeric'
                    disabled={saving}
                  />
                </div>
              )}
            </div>
            {tipo === 'shot' && (
              <p className='mt-2 ml-1 text-[11px] text-gray-400 dark:text-gray-500'>
                Si dejas el precio de anfitriona vacío, se usa el precio de cliente. Los ml se
                guardan en el producto: en vacío, cliente usa el valor global ({shotMl} ml) y
                anfitriona usa el de cliente.
              </p>
            )}
          </fieldset>
        ))}
      </fieldset>

      <p className='text-[11px] text-gray-400 ml-1'>
        {context === 'settings'
          ? 'La configuración se aplica a esta presentación en ventas y pedidos; guardar no traslada unidades.'
          : 'Se trasladan las unidades más antiguas. El precio y la comisión quedan definidos para esta presentación.'}
      </p>

      {esChampagne && tiers.length > 0 && (
        <ChampagneTiersEditor tiers={tiers} saving={saving} onTierChange={onTierChange} />
      )}
    </>
  );
});
