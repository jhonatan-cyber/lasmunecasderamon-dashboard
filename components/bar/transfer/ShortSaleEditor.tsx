'use client';

import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Plus, Trash2 } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipPortal,
  TooltipProvider,
  TooltipTrigger
} from '@/components/ui/tooltip';
import { formatNumber } from '@/components/bar/transfer/transferOptions';

interface ShortSaleEditorProps {
  mlAcompanamientoAnfitriona: string;
  onMlAcompanamientoAnfitrionaChange: (value: string) => void;
  precioShot: string;
  precioShotAnfitriona: string;
  comisionShot: string;
  mlShotCliente: string;
  mlShotAnfitriona: string;
  shotMl: number;
  preciosAnfitrionaExtra: { precio: string; comision: string }[];
  saving: boolean;
  onPrecioShotChange: (value: string) => void;
  onPrecioShotAnfitrionaChange: (value: string) => void;
  onComisionShotChange: (value: string) => void;
  onMlShotClienteChange: (value: string) => void;
  onMlShotAnfitrionaChange: (value: string) => void;
  onPreciosAnfitrionaExtraChange: (rows: { precio: string; comision: string }[]) => void;
}

export function ShortSaleEditor(props: ShortSaleEditorProps) {
  const { saving, preciosAnfitrionaExtra: rows, onPreciosAnfitrionaExtraChange: onRows } = props;
  const field = (
    id: string,
    label: string,
    value: string,
    onChange: (value: string) => void,
    placeholder: string,
    ml = false,
    required = false
  ) => (
    <div className='space-y-2'>
      <label htmlFor={id} className='text-sm font-medium'>
        {label}
      </label>
      <Input
        id={id}
        value={value}
        disabled={saving}
        required={required}
        inputMode='numeric'
        placeholder={placeholder}
        className='h-12 tabular-nums'
        onChange={event =>
          onChange(ml ? event.target.value.replace(/\D/g, '') : formatNumber(event.target.value))
        }
      />
    </div>
  );
  return (
    <div className='space-y-5'>
      <div className='grid gap-5 sm:grid-cols-[minmax(0,1fr)_minmax(0,3fr)]'>
        <section className='min-w-0 space-y-4' aria-label='Corto para cliente'>
          <div className='flex items-center justify-between gap-2'>
            <h3 className='text-sm font-semibold'>Cliente</h3>
            <span className='rounded-full bg-muted px-2 py-1 text-xs text-muted-foreground'>
              Sin comisión
            </span>
          </div>
          {field(
            'price-shot',
            'Precio corto cliente',
            props.precioShot,
            props.onPrecioShotChange,
            '0',
            false,
            false
          )}
          {field(
            'transfer-ml-shot-cliente',
            'Ml corto cliente',
            props.mlShotCliente,
            props.onMlShotClienteChange,
            String(props.shotMl),
            true
          )}

          <p className='text-xs text-muted-foreground'>
            Sin precio no se vende corto al cliente. Con precio configurado y ml vacíos se sirven {props.shotMl}{' '}
            ml.
          </p>
        </section>
        <section
          className='min-w-0 space-y-4 sm:border-l sm:pl-5'
          aria-label='Corto para anfitriona'
        >
          <h3 className='py-1 text-sm font-semibold'>Anfitriona</h3>
          <div className='grid grid-cols-2 items-end gap-3'>
            {field(
              'price-shot-anfitriona',
              'Precio corto anfitriona',
              props.precioShotAnfitriona,
              props.onPrecioShotAnfitrionaChange,
              'Sin venta a anfitriona'
            )}
            {field(
              'commission-shot',
              'Comisión corto anfitriona',
              props.comisionShot,
              props.onComisionShotChange,
              'Sin comisión'
            )}
          </div>
          {rows.length > 0 && (
            <section className='space-y-3' aria-label='Precios adicionales de corto'>
              {rows.map((row, index) => (
                <div
                  key={index}
                  className='grid min-w-0 grid-cols-2 items-end gap-3 border-b pb-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]'
                >
                  {field(
                    `extra-shot-price-${index}`,
                    `Precio corto anfitriona ${index + 2}`,
                    row.precio,
                    value =>
                      onRows(
                        rows.map((item, i) => (i === index ? { ...item, precio: value } : item))
                      ),
                    '0'
                  )}
                  {field(
                    `extra-shot-commission-${index}`,
                    `Comisión corto anfitriona ${index + 2}`,
                    row.comision,
                    value =>
                      onRows(
                        rows.map((item, i) => (i === index ? { ...item, comision: value } : item))
                      ),
                    'Sin comisión'
                  )}
                  <TooltipProvider delayDuration={200}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          type='button'
                          variant='ghost'
                          size='icon'
                          aria-label={`Quitar precio ${index + 2}`}
                          className='col-span-2 justify-self-end rounded-full hover:bg-red-50 hover:text-red-600 focus-visible:text-red-600 dark:hover:bg-red-950/40 dark:hover:text-red-400 sm:col-span-1'
                          disabled={saving}
                          onClick={() => onRows(rows.filter((_, i) => i !== index))}
                        >
                          <Trash2 aria-hidden='true' />
                        </Button>
                      </TooltipTrigger>
                      <TooltipPortal>
                        <TooltipContent>Quitar precio {index + 2}</TooltipContent>
                      </TooltipPortal>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              ))}
            </section>
          )}
          <div className='grid grid-cols-2 items-end gap-3'>
            {field(
              'transfer-ml-shot-anfitriona',
              'Ml corto anfitriona',
              props.mlShotAnfitriona,
              props.onMlShotAnfitrionaChange,
              props.mlShotCliente || String(props.shotMl),
              true
            )}
            {field(
              'shot-mixer-hostess',
              'Ml acompa\u00f1amiento anfitriona',
              props.mlAcompanamientoAnfitriona,
              props.onMlAcompanamientoAnfitrionaChange,
              'Sin acompa\u00f1amiento',
              true
            )}
          </div>
          <div className='flex justify-center'>
            <Button
              type='button'
              variant='outline'
              size='sm'
              className='rounded-full px-4'
              disabled={saving || rows.length >= 19}
              onClick={() => onRows([...rows, { precio: '', comision: '' }])}
            >
              <Plus className='h-3.5 w-3.5' aria-hidden='true' />
              Agregar
            </Button>
          </div>
          <p className='text-xs text-muted-foreground'>
            Configura un precio para vender a anfitrionas. Permite una anfitriona por corto; la
            comisión es opcional. Los ml vacíos usan los del cliente o el valor por defecto.
          </p>
        </section>
      </div>
    </div>
  );
}
