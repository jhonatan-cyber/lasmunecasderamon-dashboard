import { Input } from '@/components/ui/input';
import { PurchaseCatalogItem, Line } from './types';
import { ProductCard } from './ProductCard';

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
  return (
    <div className='space-y-5'>
      <div className='flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between'>
        <div>
          <h2 className='text-lg font-semibold'>Selecciona los productos</h2>
          <p className='text-sm text-muted-foreground'>
            Elige las presentaciones que ingresarán a la bodega.
          </p>
        </div>
        <Input
          aria-label='Buscar productos'
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder='Buscar producto...'
          className='sm:max-w-xs'
        />
      </div>
      {filteredCatalog.length === 0 ? (
        <p className='py-8 text-center text-sm text-muted-foreground'>
          {catalog.length ? 'No hay coincidencias.' : 'No hay productos disponibles.'}
        </p>
      ) : (
        <div className='grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4'>
          {filteredCatalog.map(item => (
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
      )}
    </div>
  );
}
