'use client';
/* eslint-disable */
import { Button } from '@/components/ui/button';
import { Trash2, Plus, Minus } from 'lucide-react';
import { formatCurrencyNoDecimals } from '@/lib/utils/formatters';
import { memo, useState } from 'react';
import { etiquetaVentaDetalle } from '@/lib/sales/ventaDetalle';
import { resolveShotMl, resolveShotMlAnfitriona } from '@/lib/business/shotMl';
import { useConfigValue } from '@/hooks/shared/useConfigValue';
import { SaleProductPhoto } from '@/components/sales/product-modal/SaleProductPhoto';
import HostessMultiSelect from '@/components/orders/HostessMultiSelect';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface OrderProductTableProps {
  productos: any[];
  onRemoveProducto?: (index: number) => void;
  onUpdateCantidad?: (index: number, nuevaCantidad: number) => void;
  onToggleComision?: (index: number) => void;
  onAssignHostess?: (index: number, hostessId: string | string[]) => void;
  anfitrionas: any[];
  habitaciones?: any[];
  roomSelections?: Record<string, string>;
  onRoomChange?: (productId: string, roomId: string) => void;
}

const ProductRow = memo(
  ({
    producto,
    index,
    onRemoveProducto,
    onUpdateCantidad,
    onToggleComision,
    onAssignHostess,
    anfitrionas,
    habitaciones
  }: {
    producto: any;
    index: number;
    onRemoveProducto?: (index: number) => void;
    onUpdateCantidad?: (index: number, nuevaCantidad: number) => void;
    onToggleComision?: (index: number) => void;
    onAssignHostess?: (index: number, hostessId: string | string[]) => void;
    anfitrionas: any[];
    habitaciones: any[];
  }) => {
    const [search, setSearch] = useState('');
    const defaultMl = useConfigValue<number>('bar', 'shot_ml', 50);
    const clientMl = resolveShotMl(producto.ml_shot, defaultMl);
    const shotMl = producto.shot_anfitriona
      ? resolveShotMlAnfitriona(producto.ml_shot_anfitriona, clientMl)
      : clientMl;
    const mixer =
      producto.tipo_venta === 'shot'
        ? producto.acompanamiento_corto
        : producto.acompanamiento_botella;
    const mixerAmount = Number(mixer?.ml_por_corto ?? mixer?.unidades ?? 0);
    const mixerUnit = mixer?.ml_por_corto !== undefined ? 'ml' : 'unidades';
    const badgeColors = [
      'bg-purple-100 text-purple-700',
      'bg-pink-100 text-pink-700',
      'bg-blue-100 text-blue-700',
      'bg-green-100 text-green-700',
      'bg-yellow-100 text-yellow-700',
      'bg-red-100 text-red-700',
      'bg-indigo-100 text-indigo-700',
      'bg-cyan-100 text-cyan-700'
    ];

    return (
      <TableRow className='border-b transition-colors'>
        <TableCell className='text-center font-medium'>
          <div className='flex items-center gap-2 text-left'>
            <SaleProductPhoto
              foto={producto.foto || producto.producto_foto}
              name={producto.nombre || producto.name || 'Producto'}
              large={false}
              compact
            />
            <div className='min-w-0 space-y-1'>
              <p className='text-sm font-semibold leading-snug'>
                {producto.tipo_venta === 'shot'
                  ? String(
                      producto.producto_nombre || producto.nombre || producto.name || 'Producto'
                    )
                      .replace(/\s*\u00b7?\s*\d+(?:[.,]\d+)?\s*(?:ml|litros?|l)\s*$/i, '')
                      .trim()
                  : producto.nombre || producto.name}
              </p>
              <p className='text-xs font-medium text-muted-foreground'>
                {producto.tipo_venta === 'shot'
                  ? `${etiquetaVentaDetalle(producto)} · ${shotMl} ml por corto`
                  : `Botella${producto.presentacion_nombre ? ` · ${producto.presentacion_nombre}` : ''}`}
              </p>
            </div>
          </div>
        </TableCell>
        <TableCell className='text-center'>
          <div className='flex items-center justify-center gap-2'>
            <Button
              size='sm'
              variant='outline'
              onClick={() => {
                if (producto.cantidad > 1 && onUpdateCantidad) {
                  onUpdateCantidad(index, producto.cantidad - 1);
                }
              }}
              className='h-6 w-6 rounded-full p-0 transition-all duration-200 hover:scale-105'
              disabled={producto.cantidad <= 1}
            >
              <Minus className='h-3 w-3' />
            </Button>
            <span className='w-8 text-center font-medium text-gray-700 dark:text-gray-200'>
              {producto.cantidad}
            </span>
            <Button
              size='sm'
              variant='outline'
              onClick={() => {
                if (onUpdateCantidad) {
                  onUpdateCantidad(index, producto.cantidad + 1);
                }
              }}
              className='h-6 w-6 rounded-full p-0 transition-all duration-200 hover:scale-105'
            >
              <Plus className='h-3 w-3' />
            </Button>
          </div>
        </TableCell>
        <TableCell className='text-center'>
          {formatCurrencyNoDecimals(producto.precio || producto.price)}
        </TableCell>
        <TableCell className='text-center'>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size='sm'
                  variant='outline'
                  onClick={() => onToggleComision?.(index)}
                  className={`h-6 rounded-full px-2 py-0 text-[10px] transition-all duration-200 ${
                    producto.generaComision === 0
                      ? 'border-blue-300 bg-blue-100 text-blue-700 hover:bg-blue-200'
                      : 'border-pink-300 bg-pink-100 text-pink-700 hover:bg-pink-200'
                  }`}
                >
                  {etiquetaVentaDetalle(producto)}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <div className='text-xs'>
                  {producto.generaComision === 0
                    ? 'Para el cliente (sin comisión)'
                    : 'Para la anfitriona (con comisión)'}
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </TableCell>
        <TableCell className='text-center'>
          {producto.tipo_venta === 'shot' && (
            <p className='mb-2 whitespace-nowrap text-left text-xs text-muted-foreground'>
              {shotMl} ml por corto · {shotMl * producto.cantidad} ml de trago
            </p>
          )}
          {mixer ? (
            <div className='flex items-center gap-2 text-left'>
              <SaleProductPhoto
                foto={mixer.foto}
                name={mixer.nombre || 'Bebida'}
                large={false}
                compact
              />
              <div className='min-w-0 space-y-1 text-xs leading-relaxed'>
                <p className='text-sm font-medium leading-snug'>
                  {mixer.nombre || mixer.presentacion_id}
                </p>
                <p>
                  {mixerAmount} {mixerUnit} por{' '}
                  {producto.tipo_venta === 'shot' ? 'corto' : 'botella'}
                </p>
                <p className='text-muted-foreground'>
                  Consumo total: {mixerAmount * producto.cantidad} {mixerUnit}
                </p>
              </div>
            </div>
          ) : (
            <span className='text-xs text-muted-foreground'>Sin bebida</span>
          )}
        </TableCell>
        <TableCell className='text-center'>
          {producto.generaComision === 1 && producto.comision > 0 ? (
            <span className='font-medium text-green-600 dark:text-green-400'>
              {formatCurrencyNoDecimals(producto.comision)}
            </span>
          ) : (
            <span className='text-gray-400'>-</span>
          )}
        </TableCell>
        <TableCell className='text-center'>
          {producto.tipo_venta === 'shot' &&
          producto.shot_anfitriona &&
          Number(producto.comisionUnitaria ?? producto.comision) > 0 &&
          onAssignHostess ? (
            <HostessMultiSelect
              anfitrionas={anfitrionas}
              value={producto.selectedHostesses || []}
              onChange={ids => onAssignHostess(index, ids.slice(0, producto.cantidad))}
              maxSelection={producto.cantidad}
              searchValue={search}
              onSearchChange={setSearch}
            />
          ) : producto.generaComision === 1 ? (
            producto.selectedHostesses && producto.selectedHostesses.length > 0 ? (
              <div className='flex flex-row flex-wrap items-center justify-center gap-1'>
                {producto.selectedHostesses.map((hostessId: string, idx: number) => {
                  const anfitriona = anfitrionas.find(
                    a => String(a.id || a.id_usuario) === hostessId
                  );
                  const hostessName = anfitriona
                    ? anfitriona.nick || anfitriona.name || anfitriona.nombre || `ID: ${hostessId}`
                    : `ID: ${hostessId}`;

                  return (
                    <span
                      key={hostessId}
                      className={`${badgeColors[idx % badgeColors.length]} whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium`}
                    >
                      {hostessName}
                    </span>
                  );
                })}
              </div>
            ) : (
              <span className='text-xs text-gray-400'>Sin anfitrionas asignadas</span>
            )
          ) : (
            <span className='text-gray-400'>-</span>
          )}
        </TableCell>
        <TableCell className='text-center'>
          {producto.selectedRoom ? (
            (() => {
              const habitacion = habitaciones.find(
                h => String(h.id_habitacion || h.id) === String(producto.selectedRoom)
              );
              const roomName = habitacion
                ? habitacion.nombre || habitacion.name || `Habitación ${producto.selectedRoom}`
                : `ID: ${producto.selectedRoom}`;

              return (
                <span className='rounded-full bg-orange-100 px-2 py-0.5 text-xs font-medium text-orange-700'>
                  {roomName}
                </span>
              );
            })()
          ) : (
            <span className='text-gray-400'>-</span>
          )}
        </TableCell>
        <TableCell className='text-center font-semibold'>
          {formatCurrencyNoDecimals(producto.subtotal)}
        </TableCell>
        <TableCell className='text-center'>
          <Button
            variant='outline'
            className='h-7 w-7 rounded-full bg-red-500 p-0 text-white transition-all duration-200 hover:scale-110 hover:bg-red-600'
            onClick={() => onRemoveProducto?.(index)}
          >
            <Trash2 className='h-3 w-3' />
          </Button>
        </TableCell>
      </TableRow>
    );
  }
);

const OrderProductTable = memo(function OrderProductTable({
  productos,
  onRemoveProducto,
  onUpdateCantidad,
  onToggleComision,
  onAssignHostess,
  anfitrionas,
  habitaciones = []
}: OrderProductTableProps) {
  return (
    <div className='mt-6 w-full min-w-0 max-w-full overflow-x-auto'>
      <div className='overflow-hidden rounded-3xl bg-white shadow-md dark:bg-slate-900/40 dark:shadow-black/20'>
        <Table className='w-full min-w-[1470px] table-fixed text-center [&_td]:align-middle [&_th]:whitespace-nowrap [&_td]:break-normal'>
          <colgroup>
            <col style={{ width: 240 }} />
            <col style={{ width: 110 }} />
            <col style={{ width: 100 }} />
            <col style={{ width: 130 }} />
            <col style={{ width: 260 }} />
            <col style={{ width: 100 }} />
            <col style={{ width: 220 }} />
            <col style={{ width: 120 }} />
            <col style={{ width: 110 }} />
            <col style={{ width: 80 }} />
          </colgroup>
          <TableHeader className='border-b dark:border-slate-800'>
            <TableRow>
              <TableHead className='text-center font-bold'>Producto</TableHead>
              <TableHead className='text-center font-bold'>Cantidad</TableHead>
              <TableHead className='text-center font-bold'>Precio</TableHead>
              <TableHead className='text-center font-bold'>Tipo</TableHead>
              <TableHead className='text-center font-bold'>Bebida y consumo</TableHead>
              <TableHead className='text-center font-bold'>Comisión</TableHead>
              <TableHead className='text-center font-bold'>Anfitriona asignada</TableHead>
              <TableHead className='text-center font-bold'>Habitación</TableHead>
              <TableHead className='text-center font-bold'>Sub total</TableHead>
              <TableHead className='text-center font-bold'>Eliminar</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {productos.length === 0 && (
              <TableRow>
                <TableCell colSpan={10} className='text-center'>
                  No hay productos agregados
                </TableCell>
              </TableRow>
            )}
            {productos.map((p, idx) => (
              <ProductRow
                key={`${p.id_producto || p.id}-${idx}`}
                producto={p}
                index={idx}
                onRemoveProducto={onRemoveProducto}
                onUpdateCantidad={onUpdateCantidad}
                onToggleComision={onToggleComision}
                onAssignHostess={onAssignHostess}
                anfitrionas={anfitrionas}
                habitaciones={habitaciones}
              />
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
});

export default OrderProductTable;
