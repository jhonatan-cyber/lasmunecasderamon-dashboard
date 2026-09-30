'use client';

import { Check } from 'lucide-react';
import type { SaleProductItem } from '@/components/sales/product-modal/saleProductItems';

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
      {item.tieneShot && (
        <div className='mt-2 flex flex-wrap gap-1 rounded-2xl border border-neutral-200 bg-neutral-100 p-1 dark:border-white/10 dark:bg-white/5'>
          {item.opcionesTipo.map(({ value, label }) => {
            const active = item.tipoVenta === value;
            return (
              <button
                key={value}
                type='button'
                onClick={() => item.onSaleTypeChange(value)}
                aria-pressed={active}
                className={`flex min-w-[130px] flex-1 items-center justify-center gap-1.5 rounded-xl px-3 py-1.5 text-[11px] font-bold transition-all ${
                  active
                    ? 'bg-black text-white shadow dark:bg-white dark:text-black'
                    : 'text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-200'
                }`}
              >
                <span
                  className={`size-1.5 shrink-0 rounded-full ${
                    active ? 'bg-current' : 'bg-neutral-400 dark:bg-neutral-600'
                  }`}
                  aria-hidden='true'
                />
                {label}
              </button>
            );
          })}
        </div>
      )}
    </>
  );
}
