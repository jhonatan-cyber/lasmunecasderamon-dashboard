'use client';

import { memo } from 'react';
import { ProductPhoto } from '@/components/shared/ProductPhoto';
import { formatCurrencyCLP } from '@/lib/utils/formatters';
import type { BarStockItem } from '@/components/bar/transfer/transferOptions';

const photoSrc = (item: BarStockItem): string => {
  if (item.foto && item.foto !== 'default.png') {
    return item.foto.startsWith('http') ? item.foto : `/api/images/products/${item.foto}`;
  }
  if (item.producto_foto && item.producto_foto !== 'default.png') {
    return item.producto_foto.startsWith('http')
      ? item.producto_foto
      : `/api/images/products/${item.producto_foto}`;
  }
  return '/api/images/products/default.png';
};

/** Ficha de la presentación que se va a traspasar (foto, stock y configuración). */
export const TransferItemSummary = memo(function TransferItemSummary({
  item
}: {
  item: BarStockItem;
}) {
  const disponible = item.stock ?? 0;

  return (
    <div className='flex items-center gap-3 rounded-2xl border border-gray-200/70 bg-gray-50/60 p-3 dark:border-white/10 dark:bg-white/[0.03]'>
      <div
        data-photo-surface
        className='relative h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-white dark:bg-white/[0.04]'
      >
        <ProductPhoto
          src={photoSrc(item)}
          alt={`${item.producto_nombre} ${item.nombre}`}
          fill
          className='object-contain p-1.5'
        />
      </div>
      <p className='text-sm text-gray-600 dark:text-gray-400 min-w-0'>
        <span className='font-semibold text-gray-900 dark:text-neutral-100 block truncate'>
          {item.producto_nombre} — {item.nombre}
        </span>
        Disponibles en almacén: <span className='font-bold'>{disponible}</span>
        {' · '}En bar: <span className='font-bold'>{item.stock_bar ?? 0}</span>
        {item.precio_compra > 0 && (
          <>
            <br />
            Precio compra: {formatCurrencyCLP(item.precio_compra)}
          </>
        )}
        <br />
        <span className='text-xs'>
          Config. comisiones: máx.{' '}
          {item.max_anfitrionas !== null && item.max_anfitrionas !== undefined
            ? `${item.max_anfitrionas} anf.`
            : 'default por precio'}
          {' · '}
          {item.categoria_nombre ?? 'sin categoría'}
        </span>
      </p>
    </div>
  );
});
