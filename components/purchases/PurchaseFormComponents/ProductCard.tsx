import Image from 'next/image';
import { CheckCircle2, Plus } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { formatCurrencyCLP } from '@/lib/utils/formatters';
import { PurchaseCatalogItem } from './types';

export function ProductCard({
  item,
  selected,
  onAction
}: {
  item: PurchaseCatalogItem;
  selected: boolean;
  onAction: () => void;
}) {
  const image =
    item.foto && item.foto !== 'default.png'
      ? item.foto.startsWith('http')
        ? item.foto
        : `/api/images/products/${encodeURIComponent(item.foto)}`
      : '/api/images/products/default.png';

  return (
    <Card
      className={`overflow-hidden transition-colors ${selected ? 'border-primary ring-2 ring-primary/20' : 'hover:border-primary/50'}`}
    >
      <div className='aspect-square bg-muted'>
        <Image
          src={image}
          alt={`${item.producto_nombre} ${item.nombre}`}
          width={400}
          height={400}
          unoptimized
          className='h-full w-full object-cover'
          onError={event => {
            event.currentTarget.src = '/api/images/products/default.png';
          }}
        />
      </div>
      <CardContent className='space-y-2 p-3'>
        <div className='min-h-12'>
          <p className='line-clamp-2 text-sm font-semibold'>{item.producto_nombre}</p>
          <p className='truncate text-xs text-muted-foreground'>{item.nombre}</p>
        </div>
        <div className='flex items-center justify-between gap-1 text-xs'>
          <span className='font-medium'>{formatCurrencyCLP(item.precio_compra)}</span>
          <span className='text-muted-foreground'>Stock {item.stock}</span>
        </div>
        <Button
          type='button'
          size='sm'
          variant={selected ? 'secondary' : 'default'}
          className='w-full rounded-full'
          onClick={onAction}
          aria-pressed={selected}
        >
          {selected ? <CheckCircle2 className='mr-2 h-4 w-4' /> : <Plus className='mr-2 h-4 w-4' />}
          {selected ? 'Seleccionado' : 'Agregar'}
        </Button>
      </CardContent>
    </Card>
  );
}
