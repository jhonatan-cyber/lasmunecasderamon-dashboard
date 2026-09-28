'use client';

import React from 'react';
import { Tag as TagIcon } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import type { BarStockItem } from './TransferModal';
import { SalePrices } from './SalePrices';
import { ProductPhoto } from '@/components/shared/ProductPhoto';
import { BarAnfitrionas, isTierPricedItem } from './BarAnfitrionas';
import { useConfigValue } from '@/hooks/shared/useConfigValue';
import { resolveShotMl } from '@/lib/business/shotMl';

interface BarCardProps {
  item: BarStockItem;
}

function imageUrl(foto?: string | null): string {
  if (!foto || foto === 'default.png' || foto === '') return '/api/images/products/default.png';
  if (foto.startsWith('http')) return foto;
  return `/api/images/products/${foto}`;
}

export function BarCard({ item }: BarCardProps) {
  const shotMlGlobal = useConfigValue<number>('bar', 'shot_ml', 50);
  // Ml por shot del producto; sin valor propio se usa el global.
  const shotMl = resolveShotMl(item.ml_shot, shotMlGlobal);
  const mlAbierta = Number(item.ml_abierta ?? 0);
  const mlServidos = Number(item.ml_servidos ?? 0);
  const shotsRestantes = shotMl > 0 ? Math.floor(mlAbierta / shotMl) : 0;

  return (
    <Card className='group relative border-none bg-white dark:bg-slate-900/40 shadow-md hover:shadow-xl transition-all duration-300 rounded-4xl overflow-hidden'>
      {/* Imagen */}
      <div
        data-photo-surface
        className='relative w-full aspect-4/3 overflow-hidden bg-gray-100 dark:bg-slate-800/40'
      >
        <ProductPhoto
          src={imageUrl(item.foto || item.producto_foto)}
          alt={`${item.producto_nombre} ${item.nombre}`}
          fill
          className='object-contain p-4 transition-transform duration-500 group-hover:scale-105'
        />
        <div className='absolute bottom-3 left-3 flex flex-wrap gap-2'>
          <div className='flex items-center gap-1.5 px-3 py-1 bg-green-500/90 text-white rounded-full text-[10px] font-bold uppercase tracking-wider shadow-lg'>
            Bar: {item.stock_bar ?? 0} un.
          </div>
          {mlAbierta > 0 && (
            <div className='flex items-center gap-1.5 px-3 py-1 bg-amber-500/90 text-white rounded-full text-[10px] font-bold uppercase tracking-wider shadow-lg'>
              Abierta: {mlAbierta} ml{shotsRestantes > 0 ? ` · ≈${shotsRestantes} shots` : ''}
            </div>
          )}
        </div>
        <div className='absolute bottom-3 right-3'>
          <div className='flex items-center gap-1.5 px-3 py-1 bg-blue-500/90 text-white rounded-full text-[10px] font-bold uppercase tracking-wider shadow-lg'>
            Almacén: {item.stock ?? 0}
          </div>
        </div>
      </div>

      <CardContent className='p-5 space-y-3'>
        <div className='grid grid-cols-2 gap-4'>
          <div className='space-y-1.5 min-w-0'>
            <div className='flex items-center gap-2 text-gray-400 dark:text-gray-500'>
              <TagIcon className='h-3 w-3 shrink-0' />
              <span className='text-[10px] uppercase font-bold tracking-widest font-mono truncate'>
                {item.codigo_barras || item.producto_codigo}
              </span>
            </div>
            <h3 className='text-lg font-bold text-gray-900 dark:text-neutral-100 line-clamp-1 group-hover:text-purple-600 transition-colors'>
              {item.producto_nombre}
            </h3>
            <span className='inline-flex items-center rounded-full bg-gray-100 dark:bg-slate-800 px-2.5 py-0.5 text-xs font-medium text-gray-700 dark:text-gray-200 w-fit'>
              {item.nombre}
            </span>
            {mlServidos > 0 && (
              <p className='text-[11px] font-bold uppercase tracking-wide text-amber-600 dark:text-amber-400'>
                Shots servidos: {mlServidos} ml
              </p>
            )}
          </div>

          <div className='min-w-0'>
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
        </div>
        <BarAnfitrionas
          productoId={item.producto_id}
          categoriaNombre={item.categoria_nombre}
          maxAnfitrionas={item.max_anfitrionas}
          precio={item.precio_venta}
        />
      </CardContent>
    </Card>
  );
}
