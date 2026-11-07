'use client';

import { Check } from 'lucide-react';
import type { SaleProductItem } from '@/components/sales/product-modal/saleProductItems';
import { SaleFormatQuantities } from '@/components/sales/SaleFormatQuantities';

/**
 * Celda de detalles (compartida por tabla y tarjeta): nombre, stock en bar,
 * unidades en carrito, estimación de la botella abierta y las opciones de
 * tipo de venta (botella / shot · ml · precio) cuando la presentación tiene shot.
 */
export function SaleProductDetails({
  item,
  showFormats = true
}: {
  item: SaleProductItem;
  showFormats?: boolean;
}) {
  const p = item.product;
  return (
    <div className='min-w-0 space-y-1'>
      <div className='text-sm font-semibold leading-tight'>{item.name}</div>
      <p className='flex items-center gap-1.5 text-xs text-muted-foreground'>
        <span
          className={`size-1.5 shrink-0 rounded-full ${
            Number(p.stock_bar ?? 0) > 0 ? 'bg-emerald-500' : 'bg-red-500'
          }`}
          aria-hidden='true'
        />
        Disponibles en bar: {p.stock_bar ?? 0}
      </p>
      {item.enCarrito > 0 && (
        <span className='inline-flex w-fit max-w-full flex-nowrap items-center gap-1.5 whitespace-nowrap rounded-full bg-emerald-500/10 px-2.5 py-1 text-[11px] font-semibold leading-none text-emerald-700 dark:text-emerald-300'>
          <Check className='size-3 shrink-0' aria-hidden='true' />
          <span>En carrito</span>
          <span className='inline-flex min-w-4 items-center justify-center rounded-full bg-emerald-600 px-1 py-0.5 text-[10px] font-bold text-white dark:bg-emerald-500'>
            {item.enCarrito}
          </span>
        </span>
      )}
      {Number(p.ml_abierta ?? 0) > 0 && (
        <p className='text-xs font-medium text-amber-600 dark:text-amber-400'>
          Botella abierta: {Number(p.ml_abierta)} ml
          {item.mlEstimacion > 0
            ? ` · ≈${Math.floor(Number(p.ml_abierta) / item.mlEstimacion)} cortos`
            : ''}
        </p>
      )}
      {showFormats && (
        <SaleFormatQuantities options={item.opcionesTipo} onChange={item.onSaleTypeChange} dense />
      )}
    </div>
  );
}
