'use client';

import { EmptyState } from '@/components/shared/EmptyState';
import { BarAnfitrionas, isTierPricedItem } from '@/components/bar/BarAnfitrionas';
import { BarProductGrid } from '@/components/bar/BarProductGrid';
import { BarReorderGroup } from '@/components/bar/BarReorderGroup';
import { BarReorderRow } from '@/components/bar/BarReorderRow';
import { SalePrices } from '@/components/bar/SalePrices';
import { ListLoadError } from '@/components/shared/ListLoadError';
import { ProductPhoto } from '@/components/shared/ProductPhoto';
import { ProductImageLightbox } from '@/components/products/ProductImageLightbox';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import { resolveBotellaMl, resolveShotMl } from '@/lib/business/shotMl';
import type { BarStockItem } from '@/components/bar/TransferModal';
import { Skeleton as BoneyardSkeleton } from 'boneyard-js/react';
import { Search } from 'lucide-react';
import { productImageUrl } from '@/lib/utils/productImage';

const isTierPriced = (item: BarStockItem) => isTierPricedItem(item);

interface BarProductosTabProps {
  stockError: boolean;
  onRetryStock: () => void;
  isLoading: boolean;
  filtered: BarStockItem[];
  puedeReordenar: boolean;
  savingOrder: boolean;
  avisoOrdenManual: boolean;
  showTableView: boolean;
  search: string;
  stockFilter: string;
  /** Limpia búsqueda y filtro de stock a la vez. */
  onClearFilters: () => void;
  shotMl: number;
  botellaMl: number;
  onMove: (activeId: string, overId: string) => Promise<void>;
  tablePhoto: { src: string; alt: string } | null;
  onTablePhotoChange: (photo: { src: string; alt: string } | null) => void;
}

export function BarProductosTab({
  stockError,
  onRetryStock,
  isLoading,
  filtered,
  puedeReordenar,
  savingOrder,
  avisoOrdenManual,
  showTableView,
  search,
  stockFilter,
  onClearFilters,
  shotMl,
  botellaMl,
  onMove,
  tablePhoto,
  onTablePhotoChange
}: BarProductosTabProps) {
  if (stockError) {
    return <ListLoadError message='No se pudieron cargar los productos.' onRetry={onRetryStock} />;
  }

  return (
    <>
      <div className='mb-4'>
        <p className='text-xs text-muted-foreground' role='status'>
          {isLoading
            ? 'Cargando productos…'
            : `${filtered.length} ${filtered.length === 1 ? 'presentación' : 'presentaciones'}`}
          {!isLoading && puedeReordenar ? ' · Arrastra los productos para cambiar su orden' : ''}
          {savingOrder ? ' · Guardando orden…' : ''}
          {avisoOrdenManual ? ' · El listado pasó a orden manual' : ''}
        </p>
      </div>

      <BoneyardSkeleton name='bar-table' loading={isLoading}>
        {showTableView ? (
          <div className='overflow-hidden rounded-3xl border bg-card'>
            <div className='overflow-x-auto'>
              <BarReorderGroup enabled={puedeReordenar && !savingOrder} onMove={onMove}>
                <Table className='min-w-full text-center'>
                  <TableHeader>
                    <TableRow className='hover:bg-transparent'>
                      <TableHead className='w-10'>Orden</TableHead>
                      <TableHead>Foto</TableHead>
                      <TableHead>Producto</TableHead>
                      <TableHead>Precio venta</TableHead>
                      <TableHead>Comisión</TableHead>
                      <TableHead>Anfitrionas</TableHead>
                      <TableHead>Stock bar</TableHead>
                      <TableHead>Stock bodega</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.length === 0 ? (
                      <TableRow key='empty'>
                        <TableCell colSpan={8} className='text-center text-muted-foreground'>
                          <EmptyState
                            variant='text'
                            title={
                              isLoading
                                ? 'Cargando...'
                                : search || stockFilter !== 'todos'
                                  ? 'No hay productos que coincidan con los filtros.'
                                  : 'Sin productos en el bar.'
                            }
                            action={
                              (search || stockFilter !== 'todos') && (
                                <Button variant='link' onClick={onClearFilters}>
                                  Limpiar filtros
                                </Button>
                              )
                            }
                          />
                        </TableCell>
                      </TableRow>
                    ) : (
                      filtered.map(item => {
                        const mlPorShot = resolveShotMl(item.ml_shot, shotMl);
                        // Misma resolución de capacidad que usa el descuento de la
                        // venta, para comparar lo que queda con lo que trae la botella.
                        const capacidadBotella = resolveBotellaMl(
                          item.ml_botella,
                          item.nombre,
                          botellaMl
                        );
                        return (
                          <BarReorderRow
                            key={item.id}
                            id={item.id}
                            label={`${item.producto_nombre} ${item.nombre}`}
                            canReorder={puedeReordenar}
                            disabled={savingOrder}
                          >
                            <TableCell className='sm:px-4 text-center'>
                              <Button
                                variant='unstyled'
                                type='button'
                                onClick={() =>
                                  onTablePhotoChange({
                                    src: productImageUrl(item.foto, item.producto_foto),
                                    alt: `${item.producto_nombre} ${item.nombre}`
                                  })
                                }
                                aria-label={`Ver ${item.producto_nombre} ${item.nombre} en grande`}
                                className='mx-auto block cursor-zoom-in rounded-xl focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:outline-hidden'
                              >
                                <div
                                  data-photo-surface
                                  className='relative mx-auto flex h-12 w-12 items-center justify-center overflow-hidden rounded-xl border border-gray-100'
                                >
                                  <ProductPhoto
                                    src={productImageUrl(item.foto, item.producto_foto)}
                                    alt={`${item.producto_nombre} ${item.nombre}`}
                                    width={48}
                                    height={48}
                                    className='h-12 w-12 object-contain p-0.5'
                                  />
                                </div>
                              </Button>
                            </TableCell>
                            <TableCell className='sm:px-4 text-center sm:text-sm font-medium'>
                              <div className='flex min-w-0 flex-col items-start gap-1.5 text-left'>
                                {item.categoria_nombre?.trim() && (
                                  <Badge
                                    variant='outline'
                                    className='max-w-full break-words whitespace-normal'
                                  >
                                    {item.categoria_nombre}
                                  </Badge>
                                )}
                                <span className='text-sm font-semibold leading-snug'>
                                  {item.producto_nombre}
                                </span>
                                <span className='inline-flex shrink-0 rounded-full bg-gray-100 dark:bg-slate-800 px-2.5 py-0.5 font-medium whitespace-nowrap'>
                                  {item.nombre}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell className='sm:px-4 text-center font-mono sm:text-sm'>
                              {isTierPriced(item) ? (
                                <span className='text-muted-foreground'>Según N° anf.</span>
                              ) : (
                                <SalePrices
                                  options={item.opciones_venta}
                                  price={item.precio_venta}
                                  commission={item.comision}
                                  field='precio'
                                  mlShot={item.ml_shot}
                                  mlShotAnfitriona={item.ml_shot_anfitriona}
                                />
                              )}
                            </TableCell>
                            <TableCell className='sm:px-4 text-center font-mono sm:text-sm'>
                              {isTierPriced(item) ? (
                                <span className='text-muted-foreground'>Según N° anf.</span>
                              ) : (
                                <SalePrices
                                  options={item.opciones_venta}
                                  price={item.precio_venta}
                                  commission={item.comision}
                                  field='comision'
                                  mlShot={item.ml_shot}
                                  mlShotAnfitriona={item.ml_shot_anfitriona}
                                />
                              )}
                            </TableCell>
                            <TableCell className='sm:px-4 text-center'>
                              <BarAnfitrionas
                                productoId={item.producto_id}
                                categoriaNombre={item.categoria_nombre}
                                maxAnfitrionas={item.max_anfitrionas}
                                precio={item.precio_venta}
                                compact
                              />
                            </TableCell>
                            <TableCell className='sm:px-4 text-center'>
                              <Badge
                                className={`rounded-full px-2 sm:px-3 py-1 text-xs sm:text-sm ${Number(item.stock_bar ?? 0) > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}
                              >
                                {Number(item.stock_bar ?? 0) > 0 ? item.stock_bar : 'Agotado'}
                              </Badge>
                              {Number(item.ml_abierta ?? 0) > 0 && (
                                <p className='mt-1 text-[10px] font-bold uppercase text-amber-600 dark:text-amber-400'>
                                  Abierta: {Number(item.ml_abierta)} de {capacidadBotella} ml
                                  {mlPorShot > 0
                                    ? ` · ≈${Math.floor(Number(item.ml_abierta) / mlPorShot)} cortos`
                                    : ''}
                                </p>
                              )}
                              {Number(item.botellas_vacias_shots ?? 0) > 0 && (
                                <p className='mt-1 text-[10px] font-bold uppercase text-amber-700 dark:text-amber-400'>
                                  Vacías por cortos o dentro de tolerancia:{' '}
                                  {Number(item.botellas_vacias_shots)} · pendientes de devolución
                                </p>
                              )}
                              {Number(item.ml_servidos ?? 0) > 0 && (
                                <p className='mt-1 text-[10px] font-bold uppercase text-amber-700 dark:text-amber-500'>
                                  Servido: {Number(item.ml_servidos)} ml
                                </p>
                              )}
                            </TableCell>
                            <TableCell className='sm:px-4 text-center'>
                              <Badge
                                className={`rounded-full px-2 sm:px-3 py-1 text-xs sm:text-sm ${Number(item.stock ?? 0) > 0 ? 'bg-blue-100 text-blue-700' : 'bg-red-100 text-red-700'}`}
                              >
                                {Number(item.stock ?? 0) > 0 ? item.stock : 'Agotado'}
                              </Badge>
                            </TableCell>
                          </BarReorderRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </BarReorderGroup>
            </div>
          </div>
        ) : (
          <>
            {filtered.length === 0 ? (
              <div className='flex flex-col items-center gap-3 rounded-2xl border border-dashed bg-card px-6 py-12 text-center'>
                <Search className='size-8 text-muted-foreground' aria-hidden='true' />
                <p className='font-medium'>
                  {isLoading
                    ? 'Cargando...'
                    : search || stockFilter !== 'todos'
                      ? 'No encontramos coincidencias'
                      : 'Sin productos en el bar'}
                </p>
                <p className='max-w-sm text-sm text-muted-foreground'>
                  {search || stockFilter !== 'todos'
                    ? 'Prueba con otro nombre o código, o limpia los filtros para ver todas las presentaciones.'
                    : 'Los productos aparecerán aquí cuando se registren sus presentaciones.'}
                </p>
                {(search || stockFilter !== 'todos') && (
                  <Button variant='outline' onClick={onClearFilters}>
                    Limpiar filtros
                  </Button>
                )}
              </div>
            ) : (
              <BarProductGrid
                items={filtered}
                canReorder={puedeReordenar}
                reordering={savingOrder}
                onMove={onMove}
              />
            )}
          </>
        )}
      </BoneyardSkeleton>
      <ProductImageLightbox
        open={Boolean(tablePhoto)}
        onOpenChange={open => {
          if (!open) onTablePhotoChange(null);
        }}
        src={tablePhoto?.src ?? ''}
        alt={tablePhoto?.alt ?? ''}
      />
    </>
  );
}
