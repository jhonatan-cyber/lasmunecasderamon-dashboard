'use client';

import { memo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { formatCurrencyCLP } from '@/lib/utils/formatters';
import { ChampagneTiersReadonly } from '@/components/bar/transfer/ChampagneTiers';
import type { ChampagneTierRow } from '@/components/bar/transfer/transferOptions';
import type { SaleOption } from '@/types/sale-options';

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
  onEditPrices
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
}) {
  return (
    <div className='space-y-2 rounded-xl border border-emerald-200 bg-emerald-50/60 p-3 dark:border-emerald-900 dark:bg-emerald-950/20'>
      <p className='text-sm font-semibold'>Configuración guardada</p>
      <p className='text-xs text-muted-foreground'>
        Se usará el precio, la comisión y las anfitrionas ya configurados. Solo indica la cantidad.
      </p>
      <dl className='grid gap-2'>
        {opciones.map(option => (
          <div
            key={option.tipo}
            className='flex items-center justify-between rounded-lg bg-white/70 px-3 py-2 text-sm dark:bg-black/20'
          >
            <dt className='font-medium capitalize'>
              {option.tipo === 'botella' ? 'Botella' : 'Shot'}
            </dt>
            <dd className='flex flex-wrap items-center justify-end gap-x-2 gap-y-1 text-right tabular-nums'>
              {option.tipo === 'shot' && (
                <span className='flex flex-wrap items-center gap-x-1.5 gap-y-1'>
                  <span className='text-xs text-muted-foreground'>Cli.</span>
                  <Input
                    id='transfer-ml-shot'
                    aria-label='Ml por shot a cliente'
                    value={mlShotCliente}
                    onChange={event => onMlShotClienteChange(event.target.value.replace(/\D/g, ''))}
                    placeholder={String(shotMl)}
                    inputMode='numeric'
                    disabled={saving}
                    className='h-8 w-16 text-center'
                  />
                  <span className='text-xs text-muted-foreground'>ml · Anf.</span>
                  <Input
                    id='transfer-ml-shot-anfitriona'
                    aria-label='Ml por shot a anfitriona'
                    value={mlShotAnfitriona}
                    onChange={event =>
                      onMlShotAnfitrionaChange(event.target.value.replace(/\D/g, ''))
                    }
                    placeholder='= cli.'
                    inputMode='numeric'
                    disabled={saving}
                    className='h-8 w-16 text-center'
                  />
                  <span className='text-xs text-muted-foreground'>ml</span>
                </span>
              )}
              {option.tipo === 'shot' ? (
                <span className='font-semibold'>
                  {formatCurrencyCLP(option.precio)} · Cliente y anfitriona
                </span>
              ) : (
                <span className='font-semibold'>{formatCurrencyCLP(option.precio)}</span>
              )}{' '}
              <span className='text-xs text-muted-foreground'>
                {Number(option.comision) > 0
                  ? `· Comisión ${formatCurrencyCLP(Number(option.comision))}`
                  : '· Sin comisión'}
              </span>
            </dd>
          </div>
        ))}
      </dl>
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
