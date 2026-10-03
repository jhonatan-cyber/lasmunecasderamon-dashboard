'use client';

import React from 'react';
import { Tag as TagIcon } from 'lucide-react';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { BarStockItem } from './TransferModal';
import { SalePrices } from './SalePrices';
import { ProductPhoto } from '@/components/shared/ProductPhoto';
import { BarAnfitrionas, isTierPricedItem } from './BarAnfitrionas';
import { useConfig } from '@/hooks/shared/useConfigValue';
import { resolveBotellaMl, resolveShotMl } from '@/lib/business/shotMl';

interface BarCardProps {
  item: BarStockItem;
}

function imageUrl(foto?: string | null): string {
  if (!foto || foto === 'default.png' || foto === '') return '/api/images/products/default.png';
  if (foto.startsWith('http')) return foto;
  return `/api/images/products/${foto}`;
}

export function BarCard({ item }: BarCardProps) {
  // Categoría y default salen del registro de claves, no de literales repetidos.
  const shotMlGlobal = useConfig<number>('shot_ml');
  const botellaMlGlobal = useConfig<number>('botella_ml');
  // Ml por shot del producto; sin valor propio se usa el global.
  const shotMl = resolveShotMl(item.ml_shot, shotMlGlobal);
  const mlAbierta = Number(item.ml_abierta ?? 0);
  const mlServidos = Number(item.ml_servidos ?? 0);
  const shotsRestantes = shotMl > 0 ? Math.floor(mlAbierta / shotMl) : 0;
  // Capacidad con la que el bar abre esta botella, con la misma resolución que aplica el
  // descuento de la venta (presentación > nombre > Configuraciones). Mostrarla junto a lo
  // que queda hace que un desajuste se vea en la tarjeta sin abrir el producto.
  const capacidadBotella = resolveBotellaMl(item.ml_botella, item.nombre, botellaMlGlobal);

  return (
    <Card className='flex h-full min-w-0 flex-col overflow-hidden rounded-3xl'>
      <div className='flex flex-wrap items-center justify-between gap-2 px-4 pt-4 pb-2'>
        <div className='max-w-full rounded-full bg-green-500/90 px-3 py-1 text-[11px] font-bold text-white break-words'>
          Bar: {item.stock_bar ?? 0} un.
        </div>
        <div className='ml-auto max-w-full rounded-full bg-blue-500/90 px-3 py-1 text-[11px] font-bold text-white break-words'>
          Almacén: {item.stock ?? 0}
        </div>
      </div>
      {/* Imagen */}
      <div
        data-photo-surface
        className='relative mx-4 aspect-4/3 overflow-hidden rounded-2xl bg-muted/50'
      >
        <ProductPhoto
          src={imageUrl(item.foto || item.producto_foto)}
          alt={`${item.producto_nombre} ${item.nombre}`}
          fill
          className='object-contain p-4'
        />
      </div>
      <CardHeader className='p-4'>
        <div className='flex min-w-0 flex-col gap-2'>
          <div className='flex items-center gap-2 text-muted-foreground'>
            <TagIcon className='size-3 shrink-0' aria-hidden='true' />
            <span
              className='truncate font-mono text-[11px]'
              title={item.codigo_barras || item.producto_codigo || undefined}
            >
              {item.codigo_barras || item.producto_codigo}
            </span>
          </div>
          <h3 className='text-lg font-semibold leading-snug break-words'>{item.producto_nombre}</h3>
          <Badge variant='secondary' className='w-fit max-w-full'>
            {item.nombre}
          </Badge>
          {mlAbierta > 0 && (
            <div className='rounded-xl bg-amber-500/15 px-3 py-2 text-xs font-medium text-amber-700 dark:text-amber-300'>
              Abierta: {mlAbierta} de {capacidadBotella} ml
              {shotsRestantes > 0 ? ` · ≈${shotsRestantes} shots` : ''}
            </div>
          )}
          {mlServidos > 0 && (
            <p className='text-xs text-muted-foreground'>Shots servidos: {mlServidos} ml</p>
          )}
        </div>
      </CardHeader>
      <CardContent className='min-w-0 px-4 pb-4'>
        <div className='border-t pt-3'>
          {(() => {
            // Champagne se vende por tiers (precio según N° anfitrionas):
            // el precio de presentación ($0) no aplica, se muestra la tabla.
            if (isTierPricedItem(item)) {
              return (
                <p className='text-xs text-muted-foreground'>
                  Precio según n° de anfitrionas (ver tabla).
                </p>
              );
            }
            return (
              <SalePrices
                options={item.opciones_venta}
                price={item.precio_venta}
                commission={item.comision}
                mlShot={item.ml_shot}
                mlShotAnfitriona={item.ml_shot_anfitriona}
              />
            );
          })()}
        </div>
      </CardContent>
      <CardFooter className='mt-auto px-4 pb-4'>
        <BarAnfitrionas
          productoId={item.producto_id}
          categoriaNombre={item.categoria_nombre}
          maxAnfitrionas={item.max_anfitrionas}
          precio={item.precio_venta}
        />
      </CardFooter>
    </Card>
  );
}
