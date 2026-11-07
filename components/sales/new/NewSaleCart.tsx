'use client';
import { EmptyState } from '@/components/shared/EmptyState';
import { permiteAnfitrionaConComision } from '@/lib/sales/hostessShortPrices';

import { Minus, Plus, Trash } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { SaleProductPhoto } from '@/components/sales/product-modal/SaleProductPhoto';
import { resolveShotMl, resolveShotMlAnfitriona } from '@/lib/business/shotMl';
import { useConfigValue } from '@/hooks/shared/useConfigValue';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import {
  CUENTA_TABLE_CARD_CLASS,
  CUENTA_TABLE_CELL_CLASS,
  CUENTA_TABLE_CLASS,
  CUENTA_TABLE_HEAD_CLASS,
  CUENTA_TABLE_HEADER_CLASS,
  CUENTA_TABLE_HEADER_ROW_CLASS,
  CUENTA_TABLE_ROW_CLASS
} from '@/components/accounts/tables/cuentaTableStyles';
import { formatCurrencyNoDecimals } from '@/lib/utils/formatters';
import { esShot, etiquetaVentaDetalle } from '@/lib/sales/ventaDetalle';
import { normalizarAcompanamientoBotella } from '@/lib/sales/acompanamientoBotella';

interface NewSaleCartProps {
  productos: any[];
  anfitrionas: any[];
  handleCantidadChangeTable: (idx: number, newQty: number) => void;
  handleRemoveProducto: (idx: number) => void;
  flat?: boolean;
  onHostessesChange?: (index: number, ids: string[]) => void;
}

function SaleCartProductCard({
  producto,
  index,
  anfitrionas,
  defaultShotMl,
  onQuantityChange,
  onRemove
}: {
  producto: any;
  index: number;
  anfitrionas: any[];
  defaultShotMl: number;
  onQuantityChange: (idx: number, quantity: number) => void;
  onRemove: (idx: number) => void;
}) {
  const esShotProducto = esShot(producto);
  const saboresBotella = esShotProducto
    ? []
    : normalizarAcompanamientoBotella(producto.acompanamiento_botella);
  const mixerCorto = esShotProducto ? producto.acompanamiento_corto : undefined;
  const quantity = Number(producto.cantidad) || 0;
  const shotMl = producto.shot_anfitriona
    ? resolveShotMlAnfitriona(
        producto.ml_shot_anfitriona,
        resolveShotMl(producto.ml_shot, defaultShotMl)
      )
    : resolveShotMl(producto.ml_shot, defaultShotMl);
  const selectedHostesses = permiteAnfitrionaConComision(
    producto.tipo_venta === 'shot' ? 'shot' : 'botella',
    producto.comision ?? producto.commission,
    Boolean(producto.shot_anfitriona)
  )
    ? producto.selectedHostesses || []
    : [];
  const productName = producto.producto_nombre || producto.nombre || 'Producto';

  return (
    <article className='min-w-0 rounded-xl border border-neutral-200 bg-white p-3 shadow-sm dark:border-neutral-800 dark:bg-neutral-950 sm:p-4'>
      <div className='flex items-start gap-3'>
        <SaleProductPhoto foto={producto.foto} name={productName} large={false} compact />
        <div className='min-w-0 flex-1'>
          {(typeof producto.categoria === 'string'
            ? producto.categoria
            : producto.categoria?.nombre) && (
            <p className='text-xs text-muted-foreground'>
              {typeof producto.categoria === 'string'
                ? producto.categoria
                : producto.categoria?.nombre}
            </p>
          )}
          <p className='break-words text-sm font-semibold text-foreground'>{productName}</p>
          {producto.presentacion_nombre && (
            <p className='text-xs text-muted-foreground'>{producto.presentacion_nombre}</p>
          )}
          <Badge className='mt-1 rounded-md bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-800 hover:bg-amber-100 dark:bg-amber-900/30 dark:text-amber-300'>
            {etiquetaVentaDetalle(producto)}
            {esShotProducto ? ` · ${shotMl} ml por corto` : ''}
          </Badge>
        </div>
        <Button
          variant='ghost'
          size='icon'
          onClick={() => onRemove(index)}
          aria-label={`Eliminar ${productName}`}
          className='h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive'
        >
          <Trash className='h-4 w-4' />
        </Button>
      </div>

      <div className='mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground'>
        <span>
          Consumo total: {esShotProducto ? `${shotMl * quantity} ml` : `${quantity} unidades`}
          {producto.stock_bar != null ? ` · Stock ${producto.stock_bar}` : ''}
          {Number(producto.ml_abierta) > 0 ? ` · ${producto.ml_abierta} ml abiertos` : ''}
        </span>
        {selectedHostesses.length > 0 && (
          <div className='flex flex-wrap gap-1.5'>
            {selectedHostesses.map((hostessId: string | number) => {
              const hostess = anfitrionas.find(
                item => String(item.id ?? item.id_usuario) === String(hostessId)
              );
              return (
                <Badge
                  key={String(hostessId)}
                  variant='secondary'
                  className='h-5 rounded-md px-1.5 text-[10px]'
                >
                  {hostess?.nick || hostess?.nombre || hostess?.name || String(hostessId)}
                </Badge>
              );
            })}
          </div>
        )}
      </div>

      {(mixerCorto || saboresBotella.length > 0) && (
        <div className='mt-3 space-y-2 rounded-lg bg-muted/40 p-2.5'>
          {mixerCorto && (
            <div className='flex min-w-0 items-center gap-2'>
              <SaleProductPhoto
                foto={mixerCorto.foto}
                name={mixerCorto.nombre || 'Bebida'}
                large={false}
                compact
              />
              <div className='min-w-0 text-xs'>
                <p className='break-words font-medium'>{mixerCorto.nombre || 'Bebida'}</p>
                <p className='text-muted-foreground'>
                  Total: {Number(mixerCorto.ml_por_corto ?? mixerCorto.unidades ?? 0) * quantity}{' '}
                  {mixerCorto.ml_por_corto !== undefined ? 'ml' : 'unidades'}
                </p>
              </div>
            </div>
          )}
          {saboresBotella.map((sabor: any) => (
            <div key={sabor.presentacion_id} className='flex min-w-0 items-center gap-2'>
              <SaleProductPhoto
                foto={sabor.foto ?? undefined}
                name={sabor.nombre || 'Bebida'}
                large={false}
                compact
              />
              <div className='min-w-0 text-xs'>
                <p className='break-words font-medium'>{sabor.nombre || 'Bebida'}</p>
                <p className='text-muted-foreground'>Total: {sabor.unidades * quantity} unidades</p>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className='mt-3 flex flex-wrap items-end justify-between gap-3 border-t border-border pt-3'>
        <div className='flex gap-4'>
          <div>
            <p className='text-[10px] uppercase tracking-wide text-muted-foreground'>Precio</p>
            <p className='text-sm font-medium'>{formatCurrencyNoDecimals(producto.precio)}</p>
            {selectedHostesses.length > 0 && Number(producto.comision) > 0 && (
              <p className='text-[10px] text-muted-foreground'>
                Comisión {formatCurrencyNoDecimals(Number(producto.comision))}
              </p>
            )}
            {selectedHostesses.length > 0 && (
              <p className='text-[10px] text-muted-foreground'>
                Comisión total:{' '}
                {formatCurrencyNoDecimals(Number(producto.comision || 0) * quantity)}
              </p>
            )}
          </div>
          <div>
            <p className='text-[10px] uppercase tracking-wide text-muted-foreground'>Subtotal</p>
            <p className='text-sm font-semibold'>{formatCurrencyNoDecimals(producto.subtotal)}</p>
          </div>
        </div>
        <div className='flex items-center gap-2'>
          <Button
            size='icon'
            variant='outline'
            aria-label={`Disminuir cantidad de ${productName}`}
            onClick={() => onQuantityChange(index, quantity - 1)}
            className='h-8 w-8 rounded-full'
          >
            <Minus className='h-3.5 w-3.5' />
          </Button>
          <span className='min-w-6 text-center text-sm font-semibold tabular-nums'>{quantity}</span>
          <Button
            size='icon'
            variant='outline'
            aria-label={`Aumentar cantidad de ${productName}`}
            onClick={() => onQuantityChange(index, quantity + 1)}
            className='h-8 w-8 rounded-full'
          >
            <Plus className='h-3.5 w-3.5' />
          </Button>
        </div>
      </div>
    </article>
  );
}

export const NewSaleCart = ({
  productos,
  anfitrionas,
  handleCantidadChangeTable,
  handleRemoveProducto,
  flat = false
}: NewSaleCartProps) => {
  const cartContainerRef = useRef<HTMLDivElement | null>(null);
  const [tableFits, setTableFits] = useState(false);
  const defaultShotMl = useConfigValue<number>('bar', 'shot_ml', 50);
  const visibleColumns = {
    drink: productos.some(producto => {
      const esShotProducto = esShot(producto);
      return (
        (esShotProducto && Boolean(producto.acompanamiento_corto)) ||
        (!esShotProducto &&
          normalizarAcompanamientoBotella(producto.acompanamiento_botella).length > 0)
      );
    }),
    hostess: productos.some(producto => {
      const eligible = permiteAnfitrionaConComision(
        producto.tipo_venta === 'shot' ? 'shot' : 'botella',
        producto.comision ?? producto.commission,
        Boolean(producto.shot_anfitriona)
      );
      return eligible && (producto.selectedHostesses?.length ?? 0) > 0;
    })
  };
  const columnCount = 5 + Number(visibleColumns.drink) + Number(visibleColumns.hostess);
  const tableMinWidth =
    280 +
    150 +
    150 +
    150 +
    72 +
    (visibleColumns.drink ? 220 : 0) +
    (visibleColumns.hostess ? 220 : 0);

  useEffect(() => {
    const container = cartContainerRef.current;
    if (!container) return;

    const updateLayout = () => setTableFits(container.clientWidth >= tableMinWidth);
    updateLayout();

    if (typeof ResizeObserver !== 'undefined') {
      const observer = new ResizeObserver(updateLayout);
      if (typeof observer.observe === 'function') {
        observer.observe(container);
        return () => observer.disconnect();
      }
    }

    window.addEventListener('resize', updateLayout);
    return () => window.removeEventListener('resize', updateLayout);
  }, [tableMinWidth]);

  return (
    <div className='mt-8 min-w-0'>
      <div className='mb-4 text-center'>
        <div className='text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-400 dark:text-zinc-500'>
          Detalles de la venta
        </div>
        <div className='mt-1 text-sm text-zinc-500 dark:text-zinc-400'>
          Revisa cantidades, bebidas y comisiones antes de generar la venta
        </div>
      </div>
      <div
        className={
          flat
            ? 'min-w-0 border-y border-border'
            : `min-w-0 ${CUENTA_TABLE_CARD_CLASS} dark:border-neutral-800 dark:bg-neutral-950/80`
        }
      >
        <div ref={cartContainerRef} className='min-w-0'>
          {tableFits ? (
            <div className='overflow-hidden'>
              <Table className={CUENTA_TABLE_CLASS} style={{ minWidth: tableMinWidth }}>
                <TableHeader className={CUENTA_TABLE_HEADER_CLASS}>
                  <TableRow className={CUENTA_TABLE_HEADER_ROW_CLASS}>
                    <TableHead className={CUENTA_TABLE_HEAD_CLASS}>PRODUCTO</TableHead>
                    {visibleColumns.drink && (
                      <TableHead className={CUENTA_TABLE_HEAD_CLASS}>BEBIDA</TableHead>
                    )}
                    <TableHead className={`${CUENTA_TABLE_HEAD_CLASS} text-center`}>
                      CANTIDAD
                    </TableHead>
                    <TableHead className={`${CUENTA_TABLE_HEAD_CLASS} text-center`}>
                      PRECIO
                    </TableHead>
                    {visibleColumns.hostess && (
                      <TableHead className={`${CUENTA_TABLE_HEAD_CLASS} text-center`}>
                        ANFITRIONAS
                      </TableHead>
                    )}
                    <TableHead className={`${CUENTA_TABLE_HEAD_CLASS} text-center`}>
                      SUBTOTAL
                    </TableHead>
                    <TableHead className={CUENTA_TABLE_HEAD_CLASS}></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {productos.map((p, i) => {
                    const selectedHostesses = permiteAnfitrionaConComision(
                      p.tipo_venta === 'shot' ? 'shot' : 'botella',
                      p.comision ?? p.commission,
                      Boolean(p.shot_anfitriona)
                    )
                      ? p.selectedHostesses || []
                      : [];
                    const esShotItem = esShot(p);
                    const saboresBotella = esShotItem
                      ? []
                      : normalizarAcompanamientoBotella(p.acompanamiento_botella);
                    const mixerCorto = esShotItem ? p.acompanamiento_corto : undefined;
                    const quantity = Number(p.cantidad) || 0;
                    const shotMl = p.shot_anfitriona
                      ? resolveShotMlAnfitriona(
                          p.ml_shot_anfitriona,
                          resolveShotMl(p.ml_shot, defaultShotMl)
                        )
                      : resolveShotMl(p.ml_shot, defaultShotMl);
                    const mixerPerUnit = Number(
                      mixerCorto?.ml_por_corto ?? mixerCorto?.unidades ?? 0
                    );
                    const mixerUnit = mixerCorto?.ml_por_corto !== undefined ? 'ml' : 'unidades';
                    return (
                      <TableRow key={i} className={CUENTA_TABLE_ROW_CLASS}>
                        <TableCell
                          className={`${CUENTA_TABLE_CELL_CLASS} min-w-[280px] text-left align-top`}
                        >
                          <div className='flex items-start gap-3'>
                            <SaleProductPhoto foto={p.foto} name={p.nombre} large={false} />
                            <div className='space-y-1'>
                              <div className='text-xs text-muted-foreground'>
                                {typeof p.categoria === 'string'
                                  ? p.categoria
                                  : p.categoria?.nombre}
                              </div>
                              <div className='font-semibold text-foreground'>
                                {p.producto_nombre || p.nombre}
                              </div>
                              {p.presentacion_nombre && (
                                <div className='text-xs text-muted-foreground'>
                                  {p.presentacion_nombre}
                                </div>
                              )}
                              <span className='mt-1 inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'>
                                {etiquetaVentaDetalle(p)}
                                {esShot(p) ? ` · ${shotMl} ml por corto` : ''}
                              </span>
                              <p className='text-xs text-muted-foreground'>
                                Consumo total:{' '}
                                {esShot(p) ? `${shotMl * quantity} ml` : `${quantity} unidades`}
                              </p>
                              {p.stock_bar != null && (
                                <p className='text-xs text-muted-foreground'>
                                  Stock en bar: {p.stock_bar} unidades
                                </p>
                              )}
                              {Number(p.ml_abierta) > 0 && (
                                <p className='text-xs text-muted-foreground'>
                                  {p.ml_abierta} ml abiertos
                                </p>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        {visibleColumns.drink && (
                          <TableCell
                            className={`${CUENTA_TABLE_CELL_CLASS} min-w-[220px] text-left align-top`}
                          >
                            {esShotItem && mixerCorto ? (
                              <div className='flex items-start gap-2'>
                                <SaleProductPhoto
                                  foto={mixerCorto.foto}
                                  name={mixerCorto.nombre || 'Bebida'}
                                  large={false}
                                  compact
                                />
                                <div className='space-y-1'>
                                  <p className='font-medium'>
                                    {mixerCorto.nombre || mixerCorto.presentacion_id}
                                  </p>
                                  <p className='text-xs text-muted-foreground'>
                                    {mixerPerUnit} {mixerUnit} por corto
                                  </p>
                                  <p className='text-xs font-medium'>
                                    Total: {mixerPerUnit * quantity} {mixerUnit}
                                  </p>
                                </div>
                              </div>
                            ) : saboresBotella.length > 0 ? (
                              <div className='space-y-2'>
                                {saboresBotella.map(sabor => (
                                  <div
                                    key={sabor.presentacion_id}
                                    className='flex items-start gap-2'
                                  >
                                    <SaleProductPhoto
                                      foto={sabor.foto ?? undefined}
                                      name={sabor.nombre || 'Bebida'}
                                      large={false}
                                      compact
                                    />
                                    <div className='space-y-1'>
                                      <p className='font-medium'>
                                        {sabor.nombre || sabor.presentacion_id}
                                      </p>
                                      <p className='text-xs text-muted-foreground'>
                                        {sabor.unidades} unidades por botella
                                      </p>
                                      <p className='text-xs font-medium'>
                                        Total: {sabor.unidades * quantity} unidades
                                      </p>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <span className='text-xs text-muted-foreground'>Sin bebida</span>
                            )}
                          </TableCell>
                        )}
                        <TableCell className={CUENTA_TABLE_CELL_CLASS}>
                          <div className='flex items-center justify-center gap-3'>
                            <Button
                              size='sm'
                              variant='outline'
                              aria-label={`Disminuir cantidad de ${p.nombre}`}
                              onClick={() => handleCantidadChangeTable(i, p.cantidad - 1)}
                              className='rounded-full w-7 h-7 p-0 border-black bg-black text-white dark:border-white dark:bg-white dark:text-black hover:bg-accent hover:text-accent-foreground hover:scale-105 transition-all duration-200'
                            >
                              <Minus className='w-3 h-3' />
                            </Button>
                            <span className='w-6 text-center font-bold text-gray-700'>
                              {p.cantidad}
                            </span>
                            <Button
                              size='sm'
                              variant='outline'
                              aria-label={`Aumentar cantidad de ${p.nombre}`}
                              onClick={() => handleCantidadChangeTable(i, p.cantidad + 1)}
                              className='rounded-full w-7 h-7 p-0 border-black bg-black text-white dark:border-white dark:bg-white dark:text-black hover:bg-accent hover:text-accent-foreground hover:scale-105 transition-all duration-200'
                            >
                              <Plus className='w-3 h-3' />
                            </Button>
                          </div>
                        </TableCell>
                        <TableCell
                          className={`${CUENTA_TABLE_CELL_CLASS} text-center text-gray-600`}
                        >
                          {formatCurrencyNoDecimals(p.precio)}
                          <p className='mt-1 text-xs text-muted-foreground'>
                            Comisión por unidad: {formatCurrencyNoDecimals(Number(p.comision) || 0)}
                          </p>
                        </TableCell>
                        {visibleColumns.hostess && (
                          <TableCell
                            className={`${CUENTA_TABLE_CELL_CLASS} text-center text-[11px] leading-tight font-medium text-gray-900 dark:text-neutral-100 min-w-[220px] w-[220px]`}
                          >
                            <div className='flex flex-wrap items-center justify-center gap-1.5'>
                              {selectedHostesses.length ? (
                                selectedHostesses.map((id: string) => {
                                  const hostess = anfitrionas.find(
                                    a => String(a.id ?? a.id_usuario) === String(id)
                                  );
                                  return (
                                    <Badge
                                      key={id}
                                      variant='secondary'
                                      className='max-w-full rounded-full text-xs break-words whitespace-normal'
                                    >
                                      {hostess?.nick ||
                                        hostess?.nombre ||
                                        hostess?.name ||
                                        String(id)}
                                    </Badge>
                                  );
                                })
                              ) : (
                                <span className='text-xs text-muted-foreground'>
                                  Sin asignación
                                </span>
                              )}
                            </div>
                          </TableCell>
                        )}
                        <TableCell
                          className={`${CUENTA_TABLE_CELL_CLASS} text-center font-bold text-gray-900`}
                        >
                          {formatCurrencyNoDecimals(p.subtotal)}
                          <p className='mt-1 text-xs font-normal text-muted-foreground'>
                            Comisión total:{' '}
                            {formatCurrencyNoDecimals(
                              selectedHostesses.length ? (Number(p.comision) || 0) * quantity : 0
                            )}
                          </p>
                        </TableCell>
                        <TableCell className={`${CUENTA_TABLE_CELL_CLASS} text-center`}>
                          <Button
                            variant='outline'
                            size='sm'
                            onClick={() => handleRemoveProducto(i)}
                            aria-label={`Eliminar ${p.nombre}`}
                            className='rounded-full w-7 h-7 p-0 border-black bg-black text-white dark:border-white dark:bg-white dark:text-black hover:bg-accent hover:text-accent-foreground hover:scale-105 transition-all duration-200'
                          >
                            <Trash className='w-4 h-4' />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {!productos.length && (
                    <TableRow>
                      <TableCell
                        colSpan={columnCount}
                        className={`${CUENTA_TABLE_CELL_CLASS} text-center py-12`}
                      >
                        <EmptyState variant='text' icon={Trash} title='Tu carrito está vacío' />
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className='grid gap-3 p-3 sm:grid-cols-2 2xl:grid-cols-3'>
              {productos.length ? (
                productos.map((producto, index) => (
                  <SaleCartProductCard
                    key={`${producto.id_producto || producto.id || producto.nombre}-${index}`}
                    producto={producto}
                    index={index}
                    anfitrionas={anfitrionas}
                    defaultShotMl={defaultShotMl}
                    onQuantityChange={handleCantidadChangeTable}
                    onRemove={handleRemoveProducto}
                  />
                ))
              ) : (
                <div className='col-span-full py-8 text-center'>
                  <EmptyState variant='text' icon={Trash} title='Tu carrito está vacío' />
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
