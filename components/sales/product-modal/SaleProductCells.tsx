'use client';

import { formatCurrencyNoDecimals } from '@/lib/utils/formatters';
import { QuantityStepper } from '@/components/shared/QuantityStepper';
import type { SaleProductItem } from '@/components/sales/product-modal/saleProductItems';

/** Precio de la forma de venta elegida (tabla y tarjeta). */
export function SaleProductPrice({ item }: { item: SaleProductItem }) {
  return (
    <span className='text-[15px] font-bold tabular-nums'>
      {formatCurrencyNoDecimals(item.precioVenta)}
    </span>
  );
}

/** Comisión de la forma de venta elegida (tabla y tarjeta). */
export function SaleProductCommission({ item }: { item: SaleProductItem }) {
  return (
    <span className='text-[15px] font-semibold tabular-nums text-muted-foreground'>
      {formatCurrencyNoDecimals(item.comisionVenta)}
    </span>
  );
}

/** Selector de cantidad con el tope de la forma de venta (tabla y tarjeta). */
export function SaleProductQuantity({ item }: { item: SaleProductItem }) {
  return (
    <QuantityStepper
      value={item.cantidadActual}
      max={item.maxCantidad}
      onChange={item.onCantidadChange}
    >
      {item.maxCantidad < 99 && (
        <span className='text-[11px] tabular-nums text-muted-foreground'>
          máx. {item.maxCantidad}
        </span>
      )}
    </QuantityStepper>
  );
}
