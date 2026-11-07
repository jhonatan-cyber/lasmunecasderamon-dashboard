'use client';

import type { VentaDetalle } from '@/types/venta';
import { SaleProductPhoto } from './product-modal/SaleProductPhoto';
import { etiquetaVentaDetalle } from '@/lib/sales/ventaDetalle';
import { normalizarAcompanamientoBotella } from '@/lib/sales/acompanamientoBotella';
import { formatCurrencyNoDecimals } from '@/lib/utils/formatters';

export function SalesProductDetail({
  detail,
  consumoProducto
}: {
  detail: VentaDetalle;
  consumoProducto?: string;
}) {
  const raw = detail.acompanamiento;
  const sabores = Array.isArray(raw) ? normalizarAcompanamientoBotella(raw) : [];
  const mixer =
    !Array.isArray(raw) && raw
      ? (raw as {
          presentacion_id: string;
          unidades?: number;
          ml_por_corto?: number;
          nombre?: string;
          foto?: string | null;
        })
      : null;
  const perUnit = Number(mixer?.ml_por_corto ?? mixer?.unidades ?? 0);
  const unit = mixer?.ml_por_corto !== undefined ? 'ml' : 'unidades';
  const anfitrionas = detail.anfitrionas?.filter(Boolean) ?? [];
  const categoria = detail.categoria_nombre?.trim();
  const presentacion = detail.presentacion_nombre?.trim();
  return (
    <div className='grid gap-4 py-5 sm:grid-cols-[minmax(0,1fr)_auto] lg:grid-cols-[minmax(0,1fr)_minmax(0,0.7fr)_auto]'>
      <div className='flex items-start gap-3'>
        <SaleProductPhoto
          foto={detail.producto_foto ?? undefined}
          name={detail.producto_nombre || 'Producto'}
          large={false}
        />
        <div className='min-w-0 space-y-1 text-sm'>
          {categoria && <p className='text-xs text-muted-foreground'>{categoria}</p>}
          <p className='font-semibold'>
            {detail.producto_nombre || detail.producto_etiqueta || 'Producto'}
          </p>
          {presentacion && <p className='text-xs text-muted-foreground'>{presentacion}</p>}
          <p className='text-xs font-medium'>
            {etiquetaVentaDetalle(detail)} · {detail.cantidad} unidades
          </p>
          {consumoProducto && (
            <p className='text-xs text-muted-foreground'>Consumo previsto: {consumoProducto}</p>
          )}
          {detail.precio !== null &&
            detail.precio !== undefined &&
            Number.isFinite(Number(detail.precio)) && (
              <p className='text-xs text-muted-foreground'>
                Precio por unidad: {formatCurrencyNoDecimals(detail.precio)}
              </p>
            )}
          {Number(detail.comision) > 0 && (
            <p className='text-xs text-muted-foreground'>
              Comisión total: {formatCurrencyNoDecimals(detail.comision)}
            </p>
          )}
          {anfitrionas.length > 0 && (
            <p className='text-xs'>Anfitrionas: {anfitrionas.join(', ')}</p>
          )}
        </div>
      </div>
      {(mixer || sabores.length > 0) && (
        <div className='space-y-2 text-sm sm:col-span-2 lg:col-span-1 lg:col-start-2 lg:row-start-1'>
          <p className='text-xs font-semibold text-muted-foreground'>Bebida</p>
          {mixer ? (
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
          ) : (
            <div className='space-y-2'>
              {sabores.map(sabor => (
                <div key={sabor.presentacion_id} className='flex items-start gap-2'>
                  <SaleProductPhoto
                    foto={sabor.foto ?? undefined}
                    name={sabor.nombre || 'Bebida'}
                    large={false}
                    compact
                  />
                  <div className='space-y-1'>
                    <p className='font-medium'>{sabor.nombre || sabor.presentacion_id}</p>
                    <p className='text-xs text-muted-foreground'>
                      {sabor.unidades} unidades por botella
                    </p>
                    <p className='text-xs font-medium'>
                      Consumo total: {sabor.unidades * detail.cantidad} unidades
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
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
