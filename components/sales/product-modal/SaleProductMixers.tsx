'use client';
import { Button } from '@/components/ui/button';

import { matchesProductSearch } from '@/lib/utils/productSearch';
import { useState } from 'react';
import { Minus, Plus, X } from 'lucide-react';
import { formatCurrencyNoDecimals } from '@/lib/utils/formatters';
import { useConfigValue } from '@/hooks/shared/useConfigValue';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import type { AcompanamientoBotellaItem } from '@/lib/sales/acompanamientoBotella';
import { precioUnitarioAcompanamiento } from '@/lib/sales/recargoAcompanamiento';
import type { SaleProductItem, SaleProductMixer } from './saleProductItems';
import { SaleProductPhoto } from './SaleProductPhoto';

function MixerChoice({ choice }: { choice: any }) {
  const name = `${choice.producto_nombre} · ${choice.nombre}`;
  const precio = precioUnitarioAcompanamiento(choice);
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
          {Number(choice.ml_abierta) > 0
            ? ` · ${Number(choice.ml_abierta)} ml abiertos`
            : ''} · {precio > 0 ? formatCurrencyNoDecimals(precio) : 'sin precio'}
        </span>
      </span>
    </span>
  );
}

/**
 * Explica cuánto suma el acompañamiento elegido según el tope configurado; si
 * la bebida no tiene precio guardado, lo advierte porque no habrá excedente.
 */
function MixerExcess({ precio, unidades }: { precio: number; unidades: number }) {
  const tope = Number(useConfigValue('comisiones', 'tope_precio_acompanamiento', 0)) || 0;
  if (precio <= 0) {
    return (
      <p className='text-xs text-amber-700 dark:text-amber-300'>
        Esta bebida no tiene precio configurado; no se sumará excedente.
      </p>
    );
  }
  const exceso = tope > 0 ? Math.max(0, precio - tope) * Math.max(1, unidades) : 0;
  return (
    <p className='text-xs text-muted-foreground'>
      Acompañamiento {formatCurrencyNoDecimals(precio)}
      {exceso > 0
        ? ` · se suman ${formatCurrencyNoDecimals(exceso)} al total`
        : ` · dentro del tope de ${formatCurrencyNoDecimals(tope)}`}
    </p>
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
      {selectedChoice && !mixer.needsConfiguration && mixer.unidades !== undefined && (
        <MixerExcess
          precio={precioUnitarioAcompanamiento(selectedChoice)}
          unidades={Number(mixer.unidades) || 1}
        />
      )}
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

/**
 * Reparto del acompañamiento de una botella entre varios sabores: se elige la
 * cantidad requerida y se reparte por sabor (2 fantas, 1 cocacola, 1 agua) hasta
 * sumar exactamente el total antes de poder agregar el producto.
 */
function MixerDistribute({
  mixer,
  item,
  showLabel
}: {
  mixer: SaleProductMixer;
  item: SaleProductItem;
  showLabel: boolean;
}) {
  const [search, setSearch] = useState('');
  const sabores: AcompanamientoBotellaItem[] = Array.isArray(mixer.selected) ? mixer.selected : [];
  const unidadesPorBotella = Number(mixer.unidades ?? 0);
  const asignado = sabores.reduce((sum, sabor) => sum + (Number(sabor.unidades) || 0), 0);
  const botellas = Math.max(1, Number(mixer.cantidad) || 1);
  const requerido = unidadesPorBotella * botellas;
  const restante = Math.max(0, requerido - asignado);
  const chosen = new Set(sabores.map(sabor => String(sabor.presentacion_id)));
  const stockOf = (sabor: AcompanamientoBotellaItem) =>
    Number(
      (sabor as { stock_bar?: number }).stock_bar ??
        mixer.choices.find(choice => String(choice.id) === String(sabor.presentacion_id))
          ?.stock_bar ??
        0
    );
  const maxFor = (sabor: AcompanamientoBotellaItem) => {
    const otros = asignado - Number(sabor.unidades);
    return Math.max(1, Math.min(requerido - otros, stockOf(sabor)));
  };
  const apply = (next: AcompanamientoBotellaItem[]) => mixer.onDistribute?.(next);
  const addFlavor = (presentacionId: string) => {
    const choice = mixer.choices.find(c => String(c.id) === presentacionId);
    if (!choice || restante < 1) return;
    apply([
      ...sabores,
      {
        presentacion_id: String(presentacionId),
        unidades: 1,
        nombre: `${choice.producto_nombre} ${choice.nombre}`,
        foto: choice.foto && choice.foto !== 'default.png' ? choice.foto : choice.producto_foto,
        stock_bar: Number(choice.stock_bar) || 0,
        precio: precioUnitarioAcompanamiento(choice)
      } as AcompanamientoBotellaItem
    ]);
  };
  const choices = mixer.choices
    .filter(choice => !chosen.has(String(choice.id)))
    .filter(choice => matchesProductSearch(choice, search));
  return (
    <div className='space-y-2 text-xs'>
      {showLabel && <p>{mixer.label}</p>}
      <p className='text-muted-foreground'>
        {botellas === 1
          ? restante > 0
            ? `Reparte ${requerido} unidades por botella · asignado ${asignado}/${requerido}`
            : `Reparto completo · ${requerido} unidades por botella`
          : restante > 0
            ? `Reparte ${requerido} unidades para ${botellas} botellas · asignado ${asignado}/${requerido}`
            : `Reparto completo · ${requerido} unidades para ${botellas} botellas (${unidadesPorBotella} por botella)`}
      </p>
      <Select
        value=''
        onValueChange={(value: string) => addFlavor(value)}
        onOpenChange={() => setSearch('')}
        disabled={
          item.mixerLoading ||
          !!item.mixerError ||
          mixer.needsConfiguration ||
          restante < 1 ||
          !choices.length
        }
      >
        <SelectTrigger
          aria-label={`Agregar sabor de bebida para ${item.name} ${mixer.label}`}
          className='h-14 min-h-14 w-full py-2 [&>span]:line-clamp-none'
        >
          <SelectValue placeholder='Agregar sabor…' />
        </SelectTrigger>
        <SelectContent position='popper' className='w-[var(--radix-select-trigger-width)] min-w-56'>
          <div className='sticky top-0 z-10 bg-popover p-2'>
            <Input
              aria-label={`Buscar sabor de bebida para ${item.name} ${mixer.label}`}
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
      {sabores.length > 0 && (
        <ul className='space-y-2'>
          {sabores.map(sabor => {
            const max = maxFor(sabor);
            const nombre = sabor.nombre || sabor.presentacion_id;
            return (
              <li key={sabor.presentacion_id} className='flex items-center gap-2'>
                <SaleProductPhoto
                  foto={sabor.foto && sabor.foto !== 'default.png' ? sabor.foto : undefined}
                  name={nombre}
                  large={false}
                  compact
                />
                <div className='min-w-0 flex-1'>
                  <p className='truncate text-sm font-medium'>{nombre}</p>
                  <p className='text-xs text-muted-foreground'>
                    Stock: {stockOf(sabor)} · máx {max}
                  </p>
                </div>
                <div className='flex items-center gap-1'>
                  <Button
                    type='button'
                    size='sm'
                    variant='outline'
                    aria-label={`Quitar una unidad de ${nombre}`}
                    disabled={Number(sabor.unidades) <= 1}
                    onClick={() =>
                      apply(
                        sabores.map(item0 =>
                          item0.presentacion_id === sabor.presentacion_id
                            ? { ...item0, unidades: Number(item0.unidades) - 1 }
                            : item0
                        )
                      )
                    }
                    className='h-7 w-7 rounded-full p-0'
                  >
                    <Minus className='h-3 w-3' />
                  </Button>
                  <span className='w-6 text-center font-bold'>{sabor.unidades}</span>
                  <Button
                    type='button'
                    size='sm'
                    variant='outline'
                    aria-label={`Agregar una unidad de ${nombre}`}
                    disabled={Number(sabor.unidades) >= max}
                    onClick={() =>
                      apply(
                        sabores.map(item0 =>
                          item0.presentacion_id === sabor.presentacion_id
                            ? { ...item0, unidades: Number(item0.unidades) + 1 }
                            : item0
                        )
                      )
                    }
                    className='h-7 w-7 rounded-full p-0'
                  >
                    <Plus className='h-3 w-3' />
                  </Button>
                  <Button
                    type='button'
                    size='sm'
                    variant='ghost'
                    aria-label={`Quitar ${nombre}`}
                    onClick={() =>
                      apply(
                        sabores.filter(item0 => item0.presentacion_id !== sabor.presentacion_id)
                      )
                    }
                    className='h-7 w-7 rounded-full p-0'
                  >
                    <X className='h-3 w-3' />
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
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
          <Button
            variant='unstyled'
            type='button'
            className='underline'
            onClick={item.onMixerRetry}
          >
            Reintentar
          </Button>
        </p>
      )}
      {item.mixers.map(mixer =>
        mixer.bottle ? (
          <MixerDistribute
            key={`${mixer.value}:${mixer.unitIndex ?? 0}`}
            mixer={mixer}
            item={item}
            showLabel={showLabels}
          />
        ) : (
          <MixerSelect
            key={`${mixer.value}:${mixer.unitIndex ?? 0}`}
            mixer={mixer}
            item={item}
            showLabel={showLabels}
          />
        )
      )}
    </div>
  );
}
