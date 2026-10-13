'use client';

import { matchesProductSearch } from '@/lib/utils/productSearch';
import { useState } from 'react';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import type { SaleProductItem, SaleProductMixer } from './saleProductItems';
import { SaleProductPhoto } from './SaleProductPhoto';

function MixerChoice({ choice }: { choice: any }) {
  const name = `${choice.producto_nombre} · ${choice.nombre}`;
  return (
    <span className='flex min-w-0 items-center gap-2 text-left'>
      <SaleProductPhoto
        foto={
          choice.foto && choice.foto !== 'default.png'
            ? choice.foto
            : choice.presentacion_foto || choice.producto_foto
        }
        name={name}
        large={false}
        compact
      />
      <span className='min-w-0'>
        <span className='block truncate text-sm font-medium'>{name}</span>
        <span className='block text-xs text-muted-foreground'>
          Stock: {Number(choice.stock_bar) || 0} unidades
          {Number(choice.ml_abierta) > 0 ? ` · ${Number(choice.ml_abierta)} ml abiertos` : ''}
        </span>
      </span>
    </span>
  );
}

function MixerSelect({
  mixer,
  item,
  showLabel = true
}: {
  mixer: SaleProductMixer;
  item: SaleProductItem;
  showLabel?: boolean;
}) {
  const [search, setSearch] = useState('');
  const selectedChoice = mixer.choices.find(
    choice => String(choice.id) === mixer.selected?.presentacion_id
  );
  const choices = mixer.choices.filter(choice => matchesProductSearch(choice, search));
  return (
    <div className='space-y-1 text-xs'>
      {showLabel && <p>{mixer.label}</p>}
      <p className='text-muted-foreground'>
        {mixer.needsConfiguration
          ? 'Configura los ml de bebida para corto anfitriona en este producto.'
          : `Consumo: ${mixer.cantidad * (mixer.unidades ?? mixer.ml_por_corto ?? 0)} ${mixer.unidades !== undefined ? 'unidades' : 'ml'}`}
      </p>
      <Select
        value={mixer.selected?.presentacion_id ?? ''}
        onValueChange={(value: string) => mixer.onChange(value === '__clear__' ? '' : value)}
        onOpenChange={() => setSearch('')}
        disabled={item.mixerLoading || !!item.mixerError || mixer.needsConfiguration}
      >
        <SelectTrigger
          aria-label={`Bebida para ${item.name} ${mixer.label}`}
          className='h-14 min-h-14 w-full py-2 [&>span]:line-clamp-none'
        >
          <SelectValue placeholder='Seleccionar bebida'>
            {selectedChoice ? <MixerChoice choice={selectedChoice} /> : undefined}
          </SelectValue>
        </SelectTrigger>
        <SelectContent position='popper' className='w-[var(--radix-select-trigger-width)] min-w-56'>
          <div className='sticky top-0 z-10 bg-popover p-2'>
            <Input
              aria-label={`Buscar bebida para ${item.name} ${mixer.label}`}
              placeholder='Buscar bebida o presentación…'
              value={search}
              onChange={event => setSearch(event.target.value)}
              onKeyDown={event => {
                if (event.key !== 'Escape' && event.key !== 'Tab') event.stopPropagation();
              }}
            />
          </div>
          <div
            className='max-h-56 overflow-y-auto overscroll-contain'
            onWheel={event => event.stopPropagation()}
          >
            <SelectItem value='__clear__'>Seleccionar bebida</SelectItem>
            {choices.map(choice => (
              <SelectItem
                key={choice.id}
                value={String(choice.id)}
                textValue={`${choice.producto_nombre} ${choice.nombre}`}
              >
                <MixerChoice choice={choice} />
              </SelectItem>
            ))}
            {!choices.length && (
              <p className='px-3 py-2 text-sm text-muted-foreground'>No se encontraron bebidas.</p>
            )}
          </div>
        </SelectContent>
      </Select>
    </div>
  );
}

export function SaleProductMixers({
  item,
  showLabels = true
}: {
  item: SaleProductItem;
  showLabels?: boolean;
}) {
  if (!item.mixers?.length) return null;
  return (
    <div className='space-y-3'>
      {item.mixerLoading && (
        <p role='status' className='text-xs'>
          Cargando bebidas…
        </p>
      )}
      {item.mixerError && (
        <p role='alert' className='text-xs'>
          {item.mixerError}{' '}
          <button type='button' className='underline' onClick={item.onMixerRetry}>
            Reintentar
          </button>
        </p>
      )}
      {item.mixers.map(mixer => (
        <MixerSelect
          key={`${mixer.value}:${mixer.unitIndex ?? 0}`}
          mixer={mixer}
          item={item}
          showLabel={showLabels}
        />
      ))}
    </div>
  );
}
