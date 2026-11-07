'use client';

import { SaleProductPhoto } from './SaleProductPhoto';
import { SaleProductCollapseButton } from './SaleProductCollapseButton';
import type { SaleProductItem } from './saleProductItems';

export function SaleProductSummary({
  item,
  collapsed,
  onToggle
}: {
  item: SaleProductItem;
  collapsed: boolean;
  onToggle: () => void;
}) {
  const product = item.product;
  const category =
    product.categoria_nombre ||
    product.category_name ||
    (typeof product.categoria === 'string' ? product.categoria : product.categoria?.nombre);
  return (
    <div className='flex items-center gap-3'>
      <SaleProductPhoto foto={product.foto} name={item.name} large={false} />
      <div className='min-w-0 flex-1 text-left'>
        {category && <p className='text-xs text-muted-foreground'>{category}</p>}
        <p className='text-sm font-semibold'>{product.producto_nombre || item.name}</p>
        {product.presentacion_nombre && (
          <p className='text-xs text-muted-foreground'>{product.presentacion_nombre}</p>
        )}
      </div>
      <SaleProductCollapseButton productName={item.name} collapsed={collapsed} onClick={onToggle} />
    </div>
  );
}
