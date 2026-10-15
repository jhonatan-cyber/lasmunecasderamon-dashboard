'use client';
import { permiteAnfitrionaConComision } from '@/lib/sales/hostessShortPrices';

import { Minus, Plus, Trash } from 'lucide-react';
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
} from '@/components/cuentas/tables/cuentaTableStyles';
import { formatCurrencyNoDecimals } from '@/lib/utils/formatters';
import { esShot, etiquetaVentaDetalle } from '@/lib/sales/ventaDetalle';

interface NewSaleCartProps {
  productos: any[];
  anfitrionas: any[];
  handleCantidadChangeTable: (idx: number, newQty: number) => void;
  handleRemoveProducto: (idx: number) => void;
  flat?: boolean;
  onHostessesChange?: (index: number, ids: string[]) => void;
}

export const NewSaleCart = ({
  productos,
  anfitrionas,
  handleCantidadChangeTable,
  handleRemoveProducto,
  flat = false
}: NewSaleCartProps) => {
  const defaultShotMl = useConfigValue<number>('bar', 'shot_ml', 50);
  return (
    <div
      className={
        flat
          ? 'mt-8 border-y border-border'
          : `mt-8 ${CUENTA_TABLE_CARD_CLASS} dark:border-neutral-800 dark:bg-neutral-950/80`
      }
    >
      <div className='border-b border-gray-100 bg-gray-50/50 px-6 py-3 dark:border-neutral-800 dark:bg-neutral-900/80'>
        <div className='text-center text-xs font-bold uppercase tracking-widest text-gray-500 dark:text-neutral-300'>
          Resumen de Productos
        </div>
      </div>
      <div className='overflow-x-auto'>
        <Table className={`${CUENTA_TABLE_CLASS} min-w-[1200px]`}>
          <TableHeader className={CUENTA_TABLE_HEADER_CLASS}>
            <TableRow className={CUENTA_TABLE_HEADER_ROW_CLASS}>
              <TableHead className={CUENTA_TABLE_HEAD_CLASS}>PRODUCTO</TableHead>
              <TableHead className={CUENTA_TABLE_HEAD_CLASS}>BEBIDA</TableHead>
              <TableHead className={`${CUENTA_TABLE_HEAD_CLASS} text-center`}>CANTIDAD</TableHead>
              <TableHead className={`${CUENTA_TABLE_HEAD_CLASS} text-center`}>PRECIO</TableHead>
              <TableHead className={`${CUENTA_TABLE_HEAD_CLASS} text-center`}>
                ANFITRIONAS
              </TableHead>
              <TableHead className={`${CUENTA_TABLE_HEAD_CLASS} text-center`}>SUBTOTAL</TableHead>
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
              const mixer =
                p.tipo_venta === 'shot' ? p.acompanamiento_corto : p.acompanamiento_botella;
              const quantity = Number(p.cantidad) || 0;
              const shotMl = p.shot_anfitriona
                ? resolveShotMlAnfitriona(
                    p.ml_shot_anfitriona,
                    resolveShotMl(p.ml_shot, defaultShotMl)
                  )
                : resolveShotMl(p.ml_shot, defaultShotMl);
              const mixerPerUnit = Number(mixer?.ml_por_corto ?? mixer?.unidades ?? 0);
              const mixerUnit = mixer?.ml_por_corto !== undefined ? 'ml' : 'unidades';
              return (
                <TableRow key={i} className={CUENTA_TABLE_ROW_CLASS}>
                  <TableCell
                    className={`${CUENTA_TABLE_CELL_CLASS} min-w-[280px] text-left align-top`}
                  >
                    <div className='flex items-start gap-3'>
                      <SaleProductPhoto foto={p.foto} name={p.nombre} large={false} />
                      <div className='space-y-1'>
                        <div className='text-xs text-muted-foreground'>
                          {typeof p.categoria === 'string' ? p.categoria : p.categoria?.nombre}
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
                  <TableCell
                    className={`${CUENTA_TABLE_CELL_CLASS} min-w-[220px] text-left align-top`}
                  >
                    {mixer ? (
                      <div className='flex items-start gap-2'>
                        <SaleProductPhoto
                          foto={mixer.foto}
                          name={mixer.nombre || 'Bebida'}
                          large={false}
                          compact
                        />
                        <div className='space-y-1'>
                          <p className='font-medium'>{mixer.nombre || mixer.presentacion_id}</p>
                          <p className='text-xs text-muted-foreground'>
                            {mixerPerUnit} {mixerUnit} por {esShot(p) ? 'corto' : 'botella'}
                          </p>
                          <p className='text-xs font-medium'>
                            Total: {mixerPerUnit * quantity} {mixerUnit}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <span className='text-xs text-muted-foreground'>Sin bebida</span>
                    )}
                  </TableCell>
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
                      <span className='w-6 text-center font-bold text-gray-700'>{p.cantidad}</span>
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
                  <TableCell className={`${CUENTA_TABLE_CELL_CLASS} text-center text-gray-600`}>
                    {formatCurrencyNoDecimals(p.precio)}
                    <p className='mt-1 text-xs text-muted-foreground'>
                      Comisión por unidad: {formatCurrencyNoDecimals(Number(p.comision) || 0)}
                    </p>
                  </TableCell>
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
                              {hostess?.nick || hostess?.nombre || hostess?.name || String(id)}
                            </Badge>
                          );
                        })
                      ) : (
                        <span className='text-xs text-muted-foreground'>Sin asignación</span>
                      )}
                    </div>
                  </TableCell>
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
                <TableCell colSpan={7} className={`${CUENTA_TABLE_CELL_CLASS} text-center py-12`}>
                  <div className='flex flex-col items-center gap-2'>
                    <div className='bg-gray-50 p-3 rounded-full'>
                      <Trash className='w-6 h-6 text-gray-200' />
                    </div>
                    <span className='text-gray-400 text-sm'>Tu carrito está vacío</span>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};
