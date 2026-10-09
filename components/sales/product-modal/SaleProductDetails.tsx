'use client';

import { Check } from 'lucide-react';
import type { SaleProductItem } from '@/components/sales/product-modal/saleProductItems';
import { SaleFormatQuantities } from '@/components/sales/SaleFormatQuantities';

/**
 * Celda de detalles (compartida por tabla y tarjeta): nombre, stock en bar,
 * unidades en carrito, estimación de la botella abierta y las opciones de
 * tipo de venta (botella / shot · ml · precio) cuando la presentación tiene shot.
 */
export function SaleProductDetails({ item }: { item: SaleProductItem }) {
  const p = item.product;
  return (
    <>
      <div className='text-sm font-semibold leading-tight'>{item.name}</div>
      <p className='mt-1 flex items-center gap-1.5 text-xs text-muted-foreground'>
        <span
          className={`size-1.5 shrink-0 rounded-full ${
            Number(p.stock_bar ?? 0) > 0 ? 'bg-emerald-500' : 'bg-red-500'
          }`}
          aria-hidden='true'
        />
        Disponibles en bar: {p.stock_bar ?? 0}
      </p>
      {item.enCarrito > 0 && (
        <span className='mt-1.5 inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-bold text-emerald-600 dark:text-emerald-400'>
          <Check className='size-3' aria-hidden='true' />
          En carrito · {item.enCarrito}
        </span>
      )}
      {Number(p.ml_abierta ?? 0) > 0 && (
        <p className='text-xs text-amber-600 dark:text-amber-400 font-medium'>
          Botella abierta: {Number(p.ml_abierta)} ml
          {item.mlEstimacion > 0
            ? ` · ≈${Math.floor(Number(p.ml_abierta) / item.mlEstimacion)} shots`
            : ''}
        </p>
      )}
      <SaleFormatQuantities options={item.opcionesTipo} onChange={item.onSaleTypeChange} dense />
    </>
  );
}
