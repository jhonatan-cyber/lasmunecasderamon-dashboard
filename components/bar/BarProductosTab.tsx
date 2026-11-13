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
import { PackageOpen, Search, SearchX } from 'lucide-react';
import { productImageUrl } from '@/lib/utils/productImage';
import { useMemo } from 'react';
import { TransferCategoryCard } from '@/components/bar/transfer/TransferCategoryCard';
import { StaggeredEntrance } from '@/components/shared/StaggeredEntrance';

const isTierPriced = (item: BarStockItem) => isTierPricedItem(item);

const SIN_CATEGORIA = 'Sin categoría';
function categoryKey(item: BarStockItem) {
  return item.categoria_nombre?.trim() || SIN_CATEGORIA;
}

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
  selectedCategory: string | null;
  onCategorySelect: (name: string) => void;
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
  onTablePhotoChange,
  selectedCategory,
  onCategorySelect
}: BarProductosTabProps) {
  // Agrupar todos los items por categoría
  const groups = useMemo(() => {
    const map = new Map<string, BarStockItem[]>();
    for (const item of filtered) {
      const key = categoryKey(item);
      const list = map.get(key);
      if (list) list.push(item);
      else map.set(key, [item]);
    }
    return map;
  }, [filtered]);

  // Nivel 1: tarjetas de categoría filtradas por búsqueda
  const categoryCards = useMemo(() => {
    const term = search.trim().toLocaleLowerCase('es');
    const cards = [...groups.entries()].map(([name, list]) => ({
      name,
      presentationCount: list.length
    }));
    const visible = term
      ? cards.filter(card => card.name.toLocaleLowerCase('es').includes(term))
      : cards;
    return visible.sort((a, b) => {
      if (a.name === SIN_CATEGORIA) return 1;
      if (b.name === SIN_CATEGORIA) return -1;
      return a.name.localeCompare(b.name, 'es');
    });
  }, [groups, search]);

  // Nivel 2: productos de la categoría seleccionada, con búsqueda propia
  const categoryItems = useMemo(() => {
    if (!selectedCategory) return [];
    const list = groups.get(selectedCategory) ?? [];
    const term = search.trim().toLocaleLowerCase('es');
    if (!term) return list;
    return list.filter(item =>
      [item.producto_nombre, item.producto_codigo, item.nombre, item.codigo_barras].some(value =>
        value?.toLocaleLowerCase('es').includes(term)
      )
    );
  }, [groups, selectedCategory, search]);

  if (stockError) {
    return <ListLoadError message='No se pudieron cargar los productos.' onRetry={onRetryStock} />;
  }

  return (
    <>
      <div className='mb-4'>
        <p className='text-xs text-muted-foreground' role='status'>
          {isLoading
            ? 'Cargando productos…'
            : selectedCategory
              ? `${categoryItems.length} ${categoryItems.length === 1 ? 'presentación' : 'presentaciones'} en ${selectedCategory}`
              : `${categoryCards.length} ${categoryCards.length === 1 ? 'categoría' : 'categorías'}`}
          {!isLoading && puedeReordenar && selectedCategory
            ? ' · Arrastra los productos para cambiar su orden'
            : ''}
          {savingOrder ? ' · Guardando orden…' : ''}
          {avisoOrdenManual ? ' · El listado pasó a orden manual' : ''}
        </p>
      </div>

      <BoneyardSkeleton name='bar-table' loading={isLoading}>
        {selectedCategory === null ? (
          // Nivel 1: Tarjetas de categoría
          categoryCards.length === 0 ? (
            <EmptyState
              icon={search ? SearchX : PackageOpen}
              title={search ? 'No hay categorías para esta búsqueda.' : 'Sin productos en el bar'}
              description={
                !search
                  ? 'Los productos aparecerán aquí cuando se registren sus presentaciones.'
                  : undefined
              }
              action={
                search ? (
                  <Button variant='outline' onClick={onClearFilters}>
                    Limpiar filtros
                  </Button>
                ) : undefined
              }
            />
          ) : (
            <div className='grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3 xl:grid-cols-4'>
              {categoryCards.map((category, index) => (
                <StaggeredEntrance key={category.name} index={index} className='h-full'>
                  <TransferCategoryCard
                    name={category.name}
                    presentationCount={category.presentationCount}
                    onClick={() => onCategorySelect(category.name)}
                  />
                </StaggeredEntrance>
              ))}
            </div>
          )
        ) : (
          // Nivel 2: Productos de la categoría seleccionada
          <>
            {categoryItems.length === 0 ? (
              <EmptyState
                icon={search ? SearchX : PackageOpen}
                title={
                  search
                    ? 'No hay coincidencias para esta búsqueda.'
                    : 'No hay productos en esta categoría.'
                }
              />
            ) : showTableView ? (
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
                        {categoryItems.map(item => {
                          const mlPorShot = resolveShotMl(item.ml_shot, shotMl);
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
                                  className={`rounded-full px-1.5 sm:px-2 py-0.5 text-[10px] sm:text-xs ${Number(item.stock_bar ?? 0) > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'} border ${Number(item.stock_bar ?? 0) > 0 ? 'border-green-200' : 'border-red-200'}`}
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
                                  className={`rounded-full px-1.5 sm:px-2 py-0.5 text-[10px] sm:text-xs ${Number(item.stock ?? 0) > 0 ? 'bg-blue-100 text-blue-700' : 'bg-red-100 text-red-700'} border ${Number(item.stock ?? 0) > 0 ? 'border-blue-200' : 'border-red-200'}`}
                                >
                                  {Number(item.stock ?? 0) > 0 ? item.stock : 'Agotado'}
                                </Badge>
                              </TableCell>
                            </BarReorderRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </BarReorderGroup>
                </div>
              </div>
            ) : (
              <BarProductGrid
                items={categoryItems}
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
