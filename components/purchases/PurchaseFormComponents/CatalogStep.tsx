'use client';

import { useMemo, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import CategoryCardList from '@/components/shared/CategoryCardList';
import { PurchaseCatalogItem, Line } from './types';
import { ProductCard } from './ProductCard';

const SIN_CATEGORIA = 'Sin categoría';

function categoriaDe(item: PurchaseCatalogItem): string {
  return item.categoria_nombre?.trim() || SIN_CATEGORIA;
}

export function CatalogStep({
  catalog,
  filteredCatalog,
  lines,
  search,
  setSearch,
  addItem,
  removeItem
}: {
  catalog: PurchaseCatalogItem[];
  filteredCatalog: PurchaseCatalogItem[];
  lines: Line[];
  search: string;
  setSearch: (v: string) => void;
  addItem: (i: PurchaseCatalogItem) => void;
  removeItem: (id: string) => void;
}) {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const categories = useMemo(() => {
    const map = new Map<string, { nombre: string; total_products: number }>();
    for (const item of catalog) {
      const nombre = categoriaDe(item);
      const entry = map.get(nombre) ?? { nombre, total_products: 0 };
      entry.total_products += 1;
      map.set(nombre, entry);
    }
    return [...map.values()].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
  }, [catalog]);

  const searching = search.trim().length > 0;
  const categoryItems = useMemo(
    () => (selectedCategory ? catalog.filter(item => categoriaDe(item) === selectedCategory) : []),
    [catalog, selectedCategory]
  );
  const visibleItems = searching ? filteredCatalog : categoryItems;

  const productGrid = (items: PurchaseCatalogItem[]) => (
    <div className='grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4'>
      {items.map(item => (
        <ProductCard
          key={item.id}
          item={item}
          selected={lines.some(l => l.presentacion_id === item.id)}
          onAction={() =>
            lines.some(l => l.presentacion_id === item.id) ? removeItem(item.id) : addItem(item)
          }
        />
      ))}
    </div>
  );

  return (
    <div className='space-y-5'>
      <div className='flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between'>
        <div className='min-w-0'>
          {!searching && selectedCategory ? (
            <>
              <Button
                type='button'
                className='mb-2 w-full justify-center rounded-full px-6 transition-all hover:scale-105 sm:w-auto'
                onClick={() => setSelectedCategory(null)}
              >
                <ArrowLeft className='h-4 w-4' aria-hidden='true' />
                Atrás
              </Button>
              <h2 className='text-lg font-semibold'>{selectedCategory}</h2>
              <p className='text-sm text-muted-foreground'>
                Elige las presentaciones que ingresarán a la bodega.
              </p>
            </>
          ) : searching ? (
            <>
              <h2 className='text-lg font-semibold'>Resultados de búsqueda</h2>
              <p className='text-sm text-muted-foreground'>
                {visibleItems.length} presentación{visibleItems.length === 1 ? '' : 'es'} en todo el
                catálogo.
              </p>
            </>
          ) : (
            <>
              <h2 className='text-lg font-semibold'>Selecciona una categoría</h2>
              <p className='text-sm text-muted-foreground'>
                Elige la categoría de los productos que ingresarán a la bodega.
              </p>
            </>
          )}
        </div>
        <Input
          aria-label='Buscar productos'
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder='Buscar producto...'
          className='sm:max-w-xs'
        />
      </div>

      {searching || selectedCategory ? (
        visibleItems.length === 0 ? (
          <p className='py-8 text-center text-sm text-muted-foreground'>
            {searching ? 'No hay coincidencias.' : 'Esta categoría no tiene productos disponibles.'}
          </p>
        ) : (
          productGrid(visibleItems)
        )
      ) : categories.length === 0 ? (
        <p className='py-8 text-center text-sm text-muted-foreground'>
          No hay productos disponibles.
        </p>
      ) : (
        <CategoryCardList
          categorias={categories}
          onSelect={categoria => setSelectedCategory(categoria.nombre ?? '')}
          center={true}
          variant='catalog'
        />
      )}
    </div>
  );
}
