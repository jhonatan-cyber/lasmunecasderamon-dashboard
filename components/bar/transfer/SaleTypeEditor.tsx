'use client';

import { ShortSaleEditor } from '@/components/bar/transfer/ShortSaleEditor';
import { BottleExtras } from '@/components/bar/transfer/BottleExtras';
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
  mlAcompanamientoAnfitriona,
  onMlAcompanamientoAnfitrionaChange,

  maxAnfitrionas,
  onMaxAnfitrionasChange,
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
  maxAnfitrionas?: string;
  onMaxAnfitrionasChange?: (value: string) => void;
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
          {context === 'settings'
            ? 'Cliente: acompa\u00f1amiento completo. Anfitriona: ml de acompa\u00f1amiento configurados.'
            : 'Puedes seleccionar uno o ambos tipos. La cantidad transferida corresponde a unidades completas de la presentaci\u00f3n.'}
        </p>
        {tipos.map(tipo => (
          <fieldset key={tipo} className='rounded-xl border bg-background p-4 sm:p-5'>
            <legend className='px-1 text-sm font-semibold'>
              {tipo === 'botella' ? 'Venta por botella' : etiquetaShot}
            </legend>
            {tipo === 'shot' ? (
              <ShortSaleEditor
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
              <div className='grid grid-cols-1 items-end gap-4 sm:grid-cols-2'>
                <div className='flex flex-col gap-2'>
                  <label htmlFor={'price-' + tipo} className='text-sm font-medium'>
                    {tipo === 'botella' ? 'Precio por botella' : 'Precio corto cliente'}
                  </label>
                  <Input
                    id={'price-' + tipo}
                    className={
                      tipo === 'botella' ? 'h-12 text-lg font-semibold tabular-nums' : undefined
                    }
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
                <div className='flex flex-col gap-2'>
                  <label htmlFor={'commission-' + tipo} className='text-sm'>
                    Comisión (opcional)
                  </label>
                  <Input
                    id={'commission-' + tipo}
                    className={tipo === 'botella' ? 'h-12 tabular-nums' : undefined}
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
                {tipo === 'botella' && (
                  <BottleExtras
                    context={context}
                    commission={comision}
                    maxHostesses={maxAnfitrionas}
                    onMaxHostesses={onMaxAnfitrionasChange}
                    accompaniment={acompanamientoBotella !== 'ninguno'}
                    onAccompaniment={checked =>
                      onAcompanamientoBotellaChange(checked ? 'gaseosa' : 'ninguno')
                    }
                    units={unidadesAcompanamiento}
                    onUnits={onUnidadesAcompanamientoChange}
                    disabled={saving}
                  />
                )}

                {tipo === 'botella' &&
                  context === 'transfer' &&
                  Number(comision.replace(/\./g, '')) > 0 &&
                  Number(maxAnfitrionas || 1) >= 2 && (
                    <div className='sm:col-span-2'>
                      <ChampagneTiersEditor
                        tiers={tiers}
                        saving={saving}
                        onTierChange={onTierChange}
                      />
                    </div>
                  )}
              </div>
            )}
          </fieldset>
        ))}
      </fieldset>

      <p className='text-[11px] text-gray-400 ml-1'>
        {context === 'settings'
          ? 'La configuración se aplica a esta presentación en ventas y pedidos; guardar no traslada unidades.'
          : 'Se trasladan las unidades más antiguas. El precio y la comisión quedan definidos para esta presentación.'}
      </p>

      {context === 'settings' && esChampagne && tiers.length > 0 && (
        <ChampagneTiersEditor tiers={tiers} saving={saving} onTierChange={onTierChange} />
      )}
    </>
  );
});
