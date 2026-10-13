'use client';

import type { VentaDetalle } from '@/types/venta';
import { SaleProductPhoto } from './product-modal/SaleProductPhoto';
import { etiquetaVentaDetalle } from '@/lib/sales/ventaDetalle';
import { formatCurrencyNoDecimals } from '@/lib/utils/formatters';

export function SalesProductDetail({
  detail,
  consumoProducto
}: {
  detail: VentaDetalle;
  consumoProducto?: string;
}) {
  const mixer = detail.acompanamiento;
  const perUnit = Number(mixer?.ml_por_corto ?? mixer?.unidades ?? 0);
  const unit = mixer?.ml_por_corto !== undefined ? 'ml' : 'unidades';
  return (
    <div className='grid gap-4 py-5 sm:grid-cols-[minmax(0,1fr)_auto] lg:grid-cols-[minmax(0,1fr)_minmax(0,0.7fr)_auto]'>
      <div className='flex items-start gap-3'>
        <SaleProductPhoto
          foto={detail.producto_foto ?? undefined}
          name={detail.producto_nombre || 'Producto'}
          large={false}
        />
        <div className='min-w-0 space-y-1 text-sm'>
          <p className='text-xs text-muted-foreground'>{detail.categoria_nombre}</p>
          <p className='font-semibold'>
            {detail.producto_nombre || detail.producto_etiqueta || 'Producto'}
          </p>
          <p className='text-xs text-muted-foreground'>{detail.presentacion_nombre}</p>
          <p className='text-xs font-medium'>
            {etiquetaVentaDetalle(detail)} · {detail.cantidad} unidades
          </p>
          {consumoProducto && (
            <p className='text-xs text-muted-foreground'>Consumo previsto: {consumoProducto}</p>
          )}
          <p className='text-xs text-muted-foreground'>
            Precio por unidad: {formatCurrencyNoDecimals(detail.precio)}
          </p>
          <p className='text-xs text-muted-foreground'>
            Comisión total: {formatCurrencyNoDecimals(detail.comision)}
          </p>
          <p className='text-xs'>
            Anfitrionas: {detail.anfitrionas?.join(', ') || 'Sin asignación'}
          </p>
        </div>
      </div>
      {mixer && (
        <div className='space-y-2 text-sm sm:col-span-2 lg:col-span-1 lg:col-start-2 lg:row-start-1'>
          <p className='text-xs font-semibold text-muted-foreground'>Bebida</p>
          <div className='flex items-start gap-2'>
            <SaleProductPhoto
              foto={mixer.foto ?? undefined}
              name={mixer.nombre || 'Bebida'}
              large={false}
              compact
            />
            <div className='space-y-1'>
              <p className='font-medium'>{mixer.nombre || mixer.presentacion_id}</p>
              <p className='text-xs text-muted-foreground'>
                {perUnit} {unit} por {detail.tipo_venta === 'shot' ? 'corto' : 'botella'}
              </p>
              <p className='text-xs font-medium'>
                Consumo total: {perUnit * detail.cantidad} {unit}
              </p>
            </div>
          </div>
        </div>
      )}
      <div className='text-left sm:col-start-2 sm:row-start-1 sm:text-right lg:col-start-3'>
        <p className='text-xs text-muted-foreground'>Subtotal</p>
        <p className='text-lg font-bold text-emerald-600'>
          {formatCurrencyNoDecimals(detail.sub_total)}
        </p>
      </div>
    </div>
  );
}
