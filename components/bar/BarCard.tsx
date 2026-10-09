'use client';

import React from 'react';
import { Tag as TagIcon } from 'lucide-react';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { parseSavedOptions, type BarStockItem } from './TransferModal';
import { SalePrices } from './SalePrices';
import { InteractiveProductPhoto } from '@/components/shared/InteractiveProductPhoto';
import { StaggeredEntrance } from '@/components/shared/StaggeredEntrance';
import { BarAnfitrionas, isTierPricedItem } from './BarAnfitrionas';
import { useConfig } from '@/hooks/shared/useConfigValue';
import { resolveBotellaMl, resolveShotMl } from '@/lib/business/shotMl';

interface BarCardProps {
  item: BarStockItem;
  /** Posición en la grilla: retardo de la entrada escalonada. */
  entranceIndex?: number;
}

function imageUrl(foto?: string | null): string {
  if (!foto || foto === 'default.png' || foto === '') return '/api/images/products/default.png';
  if (foto.startsWith('http')) return foto;
  return `/api/images/products/${foto}`;
}

export function BarCard({ item, entranceIndex }: BarCardProps) {
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
  const agotadoBar = Number(item.stock_bar ?? 0) <= 0;
  const agotadoAlmacen = Number(item.stock ?? 0) <= 0;
  const tieneVentaShot =
    parseSavedOptions(item.opciones_venta)?.some(option => option.tipo === 'shot') ?? false;
  const anfitrionas = (
    <BarAnfitrionas
      productoId={item.producto_id}
      categoriaNombre={item.categoria_nombre}
      maxAnfitrionas={item.max_anfitrionas}
      precio={item.precio_venta}
    />
  );

  return (
    <StaggeredEntrance index={entranceIndex} className='h-full'>
      <Card className='flex h-full min-w-0 flex-col overflow-hidden rounded-3xl'>
        <div className='flex flex-wrap items-center justify-between gap-2 px-4 pt-4 pb-2'>
          <div
            className={`max-w-full rounded-full px-3 py-1 text-[11px] font-bold text-white break-words ${agotadoBar ? 'bg-red-600' : 'bg-green-500/90'}`}
          >
            Bar: {agotadoBar ? 'Agotado' : `${item.stock_bar} un.`}
          </div>
          <div
            className={`ml-auto max-w-full rounded-full px-3 py-1 text-[11px] font-bold text-white break-words ${agotadoAlmacen ? 'bg-red-600' : 'bg-blue-500/90'}`}
          >
            Almacén: {agotadoAlmacen ? 'Agotado' : item.stock}
          </div>
        </div>
        {/* Imagen */}
        <InteractiveProductPhoto
          src={imageUrl(item.foto || item.producto_foto)}
          alt={`${item.producto_nombre} ${item.nombre}`}
          containerClassName='relative mx-4 aspect-4/3 overflow-hidden rounded-2xl bg-muted/50'
          photoClassName='object-contain p-4'
        />
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
            <div className='flex min-w-0 flex-wrap items-center gap-2'>
              {item.categoria_nombre?.trim() && (
                <Badge variant='outline' className='max-w-full break-words whitespace-normal'>
                  {item.categoria_nombre}
                </Badge>
              )}
              <h3 className='min-w-0 text-lg font-semibold leading-snug break-words'>
                {item.producto_nombre}
              </h3>
              <Badge variant='secondary' className='shrink-0'>
                {item.nombre}
              </Badge>
            </div>
            {mlAbierta > 0 && (
              <div className='rounded-xl bg-amber-500/15 px-3 py-2 text-xs font-medium text-amber-700 dark:text-amber-300'>
                Abierta: {mlAbierta} de {capacidadBotella} ml
                {shotsRestantes > 0 ? ` · ≈${shotsRestantes} shots` : ''}
              </div>
            )}
            {Number(item.botellas_vacias_shots ?? 0) > 0 && (
              <div className='rounded-xl bg-rose-500/10 px-3 py-2 text-xs font-semibold text-rose-700 dark:text-rose-300'>
                {item.botellas_vacias_shots} botella(s) vacía(s) por shots o dentro de tolerancia ·
                pendiente(s) de devolución
                <div className='mt-1 space-y-0.5 font-mono font-medium'>
                  {item.botellas_por_devolver?.map(botella => (
                    <p key={botella.id}>
                      {botella.codigo} ·{' '}
                      {botella.ml_restante > 0 ? `${botella.ml_restante} ml de merma` : 'vacía'}
                    </p>
                  ))}
                </div>
              </div>
            )}
            {mlServidos > 0 && (
              <p className='text-xs text-muted-foreground'>Shots servidos: {mlServidos} ml</p>
            )}
          </div>
        </CardHeader>
        <CardContent className='min-w-0 px-4 pb-4'>
          <div
            className={`border-t pt-3 ${tieneVentaShot ? '' : 'grid grid-cols-2 items-start gap-4'}`}
          >
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
                    layout='columns'
                    options={item.opciones_venta}
                    price={item.precio_venta}
                    commission={item.comision}
                    mlShot={item.ml_shot}
                    mlShotAnfitriona={item.ml_shot_anfitriona}
                  />
                );
              })()}
            </div>
            {!tieneVentaShot && <div className='min-w-0'>{anfitrionas}</div>}
          </div>
        </CardContent>
        {tieneVentaShot && <CardFooter className='mt-auto px-4 pb-4'>{anfitrionas}</CardFooter>}
      </Card>
    </StaggeredEntrance>
  );
}
