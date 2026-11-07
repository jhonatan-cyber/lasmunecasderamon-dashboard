'use client';
/* eslint-disable */
import { EmptyState } from '@/components/shared/EmptyState';
import { permiteAnfitrionaConComision } from '@/lib/sales/hostessShortPrices';
import { Button } from '@/components/ui/button';
import { Trash2, Plus, Minus } from 'lucide-react';
import { formatCurrencyNoDecimals } from '@/lib/utils/formatters';
import { memo, useEffect, useRef, useState } from 'react';
import { etiquetaVentaDetalle } from '@/lib/sales/ventaDetalle';
import { normalizarAcompanamientoBotella } from '@/lib/sales/acompanamientoBotella';
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
    habitaciones,
    visibleColumns
  }: {
    producto: any;
    index: number;
    onRemoveProducto?: (index: number) => void;
    onUpdateCantidad?: (index: number, nuevaCantidad: number) => void;
    onToggleComision?: (index: number) => void;
    onAssignHostess?: (index: number, hostessId: string | string[]) => void;
    anfitrionas: any[];
    habitaciones: any[];
    visibleColumns: {
      drink: boolean;
      commission: boolean;
      hostess: boolean;
      room: boolean;
    };
  }) => {
    const [search, setSearch] = useState('');
    const admiteAnfitriona = permiteAnfitrionaConComision(
      producto.tipo_venta === 'shot' ? 'shot' : 'botella',
      producto.comisionUnitaria ?? producto.comision,
      Boolean(producto.shot_anfitriona)
    );
    const defaultMl = useConfigValue<number>('bar', 'shot_ml', 50);
    const clientMl = resolveShotMl(producto.ml_shot, defaultMl);
    const shotMl = producto.shot_anfitriona
      ? resolveShotMlAnfitriona(producto.ml_shot_anfitriona, clientMl)
      : clientMl;
    const esShotProducto = producto.tipo_venta === 'shot';
    const saboresBotella = esShotProducto
      ? []
      : normalizarAcompanamientoBotella(producto.acompanamiento_botella);
    const mixer = esShotProducto ? producto.acompanamiento_corto : null;
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
        {visibleColumns.drink && (
          <TableCell className='text-center'>
            {producto.tipo_venta === 'shot' && (
              <p className='mb-2 whitespace-nowrap text-left text-xs text-muted-foreground'>
                {shotMl} ml por corto · {shotMl * producto.cantidad} ml de trago
              </p>
            )}
            {esShotProducto && mixer ? (
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
                    {mixerAmount} {mixerUnit} por corto
                  </p>
                  <p className='text-muted-foreground'>
                    Consumo total: {mixerAmount * producto.cantidad} {mixerUnit}
                  </p>
                </div>
              </div>
            ) : saboresBotella.length ? (
              <div className='space-y-2 text-left'>
                {saboresBotella.map(sabor => (
                  <div key={sabor.presentacion_id} className='flex items-center gap-2'>
                    <SaleProductPhoto
                      foto={sabor.foto ?? undefined}
                      name={sabor.nombre || 'Bebida'}
                      large={false}
                      compact
                    />
                    <div className='min-w-0 space-y-1 text-xs leading-relaxed'>
                      <p className='text-sm font-medium leading-snug'>
                        {sabor.nombre || sabor.presentacion_id}
                      </p>
                      <p>{sabor.unidades} unidades por botella</p>
                      <p className='text-muted-foreground'>
                        Consumo total: {sabor.unidades * producto.cantidad} unidades
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
        {visibleColumns.commission && (
          <TableCell className='text-center'>
            {producto.generaComision === 1 && producto.comision > 0 ? (
              <span className='font-medium text-green-600 dark:text-green-400'>
                {formatCurrencyNoDecimals(producto.comision)}
              </span>
            ) : (
              <span className='text-gray-400'>-</span>
            )}
          </TableCell>
        )}
        {visibleColumns.hostess && (
          <TableCell className='text-center'>
            {producto.tipo_venta === 'shot' &&
            producto.shot_anfitriona &&
            admiteAnfitriona &&
            onAssignHostess ? (
              <HostessMultiSelect
                anfitrionas={anfitrionas}
                value={producto.selectedHostesses || []}
                onChange={ids => onAssignHostess(index, ids.slice(0, producto.cantidad))}
                maxSelection={producto.cantidad}
                searchValue={search}
                onSearchChange={setSearch}
              />
            ) : producto.generaComision === 1 && admiteAnfitriona ? (
              producto.selectedHostesses && producto.selectedHostesses.length > 0 ? (
                <div className='flex flex-row flex-wrap items-center justify-center gap-1'>
                  {producto.selectedHostesses.map((hostessId: string, idx: number) => {
                    const anfitriona = anfitrionas.find(
                      a => String(a.id || a.id_usuario) === hostessId
                    );
                    const hostessName = anfitriona
                      ? anfitriona.nick ||
                        anfitriona.name ||
                        anfitriona.nombre ||
                        `ID: ${hostessId}`
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
        )}
        {visibleColumns.room && (
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
        )}
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

function OrderProductCard({
  producto,
  index,
  onRemoveProducto,
  onUpdateCantidad,
  onToggleComision,
  onAssignHostess,
  anfitrionas,
  habitaciones,
  visibleColumns
}: {
  producto: any;
  index: number;
  onRemoveProducto?: (index: number) => void;
  onUpdateCantidad?: (index: number, nuevaCantidad: number) => void;
  onToggleComision?: (index: number) => void;
  onAssignHostess?: (index: number, hostessId: string | string[]) => void;
  anfitrionas: any[];
  habitaciones: any[];
  visibleColumns: { drink: boolean; commission: boolean; hostess: boolean; room: boolean };
}) {
  const [search, setSearch] = useState('');
  const admitsHostess = permiteAnfitrionaConComision(
    producto.tipo_venta === 'shot' ? 'shot' : 'botella',
    producto.comisionUnitaria ?? producto.comision,
    Boolean(producto.shot_anfitriona)
  );
  const defaultMl = useConfigValue<number>('bar', 'shot_ml', 50);
  const clientMl = resolveShotMl(producto.ml_shot, defaultMl);
  const shotMl = producto.shot_anfitriona
    ? resolveShotMlAnfitriona(producto.ml_shot_anfitriona, clientMl)
    : clientMl;
  const isShot = producto.tipo_venta === 'shot';
  const mixer = isShot ? producto.acompanamiento_corto : null;
  const bottleMixers = isShot
    ? []
    : normalizarAcompanamientoBotella(producto.acompanamiento_botella);
  const isHostessFormat = isShot && producto.shot_anfitriona && admitsHostess;
  const canAssignHostess = admitsHostess && (isHostessFormat || producto.generaComision === 1);
  const room = habitaciones.find(
    habitacion =>
      String(habitacion.id_habitacion || habitacion.id) === String(producto.selectedRoom)
  );

  return (
    <article className='min-w-0 rounded-xl border border-neutral-200 bg-white p-3 shadow-sm dark:border-neutral-800 dark:bg-neutral-950 sm:p-4'>
      <div className='flex items-start gap-3'>
        <SaleProductPhoto
          foto={producto.foto || producto.producto_foto}
          name={producto.nombre || producto.name || 'Producto'}
          large={false}
          compact
        />
        <div className='min-w-0 flex-1'>
          <p className='break-words text-sm font-semibold'>
            {isShot
              ? String(producto.producto_nombre || producto.nombre || producto.name || 'Producto')
                  .replace(/\s*\u00b7?\s*\d+(?:[.,]\d+)?\s*(?:ml|litros?|l)\s*$/i, '')
                  .trim()
              : producto.nombre || producto.name}
          </p>
          <p className='text-xs text-muted-foreground'>
            {isShot
              ? `${etiquetaVentaDetalle(producto)} · ${shotMl} ml por corto`
              : `Botella${producto.presentacion_nombre ? ` · ${producto.presentacion_nombre}` : ''}`}
          </p>
        </div>
        <Button
          variant='ghost'
          size='icon'
          aria-label={`Eliminar ${producto.nombre || producto.name || 'producto'}`}
          onClick={() => onRemoveProducto?.(index)}
          className='h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive'
        >
          <Trash2 className='h-4 w-4' />
        </Button>
      </div>

      <div className='mt-3 flex flex-wrap items-center justify-between gap-3'>
        <div className='flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground'>
          <span>Precio {formatCurrencyNoDecimals(producto.precio || producto.price)}</span>
          <span>Subtotal {formatCurrencyNoDecimals(producto.subtotal)}</span>
          {visibleColumns.commission && producto.generaComision === 1 && (
            <span className='font-medium text-green-600 dark:text-green-400'>
              Comisión {formatCurrencyNoDecimals(producto.comision)}
            </span>
          )}
        </div>
        <div className='flex items-center gap-2'>
          <Button
            size='icon'
            variant='outline'
            aria-label={`Disminuir cantidad de ${producto.nombre || 'producto'}`}
            onClick={() => {
              if (Number(producto.cantidad) > 1) onUpdateCantidad?.(index, producto.cantidad - 1);
            }}
            disabled={producto.cantidad <= 1}
            className='h-8 w-8 rounded-full'
          >
            <Minus className='h-3.5 w-3.5' />
          </Button>
          <span className='min-w-6 text-center text-sm font-semibold tabular-nums'>
            {producto.cantidad}
          </span>
          <Button
            size='icon'
            variant='outline'
            aria-label={`Aumentar cantidad de ${producto.nombre || 'producto'}`}
            onClick={() => onUpdateCantidad?.(index, producto.cantidad + 1)}
            className='h-8 w-8 rounded-full'
          >
            <Plus className='h-3.5 w-3.5' />
          </Button>
        </div>
      </div>

      <div className='mt-3 flex items-center justify-between gap-3 border-t border-border pt-3'>
        <span className='text-xs text-muted-foreground'>Tipo de venta</span>
        <Button
          size='sm'
          variant='outline'
          onClick={() => onToggleComision?.(index)}
          className={`h-7 rounded-full px-3 text-xs ${
            producto.generaComision === 0
              ? 'border-blue-300 bg-blue-100 text-blue-700 hover:bg-blue-200'
              : 'border-pink-300 bg-pink-100 text-pink-700 hover:bg-pink-200'
          }`}
        >
          {etiquetaVentaDetalle(producto)}
        </Button>
      </div>

      {visibleColumns.drink && (
        <div className='mt-3 space-y-2 border-t border-border pt-3'>
          {isShot && (
            <p className='text-xs text-muted-foreground'>
              Trago: {shotMl} ml por corto · {shotMl * producto.cantidad} ml en total
            </p>
          )}
          {mixer && (
            <div className='flex min-w-0 items-center gap-2 rounded-lg bg-muted/40 p-2'>
              <SaleProductPhoto
                foto={mixer.foto}
                name={mixer.nombre || 'Bebida'}
                large={false}
                compact
              />
              <p className='min-w-0 break-words text-xs'>
                <span className='font-medium'>{mixer.nombre || mixer.presentacion_id}</span>
                <span className='block text-muted-foreground'>
                  {Number(mixer.ml_por_corto ?? mixer.unidades ?? 0)}{' '}
                  {mixer.ml_por_corto !== undefined ? 'ml' : 'unidades'} por corto · Total{' '}
                  {Number(mixer.ml_por_corto ?? mixer.unidades ?? 0) * producto.cantidad}
                </span>
              </p>
            </div>
          )}
          {bottleMixers.map(sabor => (
            <div
              key={sabor.presentacion_id}
              className='flex min-w-0 items-center gap-2 rounded-lg bg-muted/40 p-2'
            >
              <SaleProductPhoto
                foto={sabor.foto ?? undefined}
                name={sabor.nombre || 'Bebida'}
                large={false}
                compact
              />
              <p className='min-w-0 break-words text-xs'>
                <span className='font-medium'>{sabor.nombre || sabor.presentacion_id}</span>
                <span className='block text-muted-foreground'>
                  {sabor.unidades} unidades por botella · Total {sabor.unidades * producto.cantidad}
                </span>
              </p>
            </div>
          ))}
          {!mixer && bottleMixers.length === 0 && (
            <p className='text-xs text-muted-foreground'>Sin bebida asociada</p>
          )}
        </div>
      )}

      {visibleColumns.hostess && (
        <div className='mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3'>
          <span className='text-xs text-muted-foreground'>Anfitrionas</span>
          {isHostessFormat && onAssignHostess ? (
            <HostessMultiSelect
              anfitrionas={anfitrionas}
              value={producto.selectedHostesses || []}
              onChange={ids => onAssignHostess(index, ids.slice(0, producto.cantidad))}
              maxSelection={producto.cantidad}
              searchValue={search}
              onSearchChange={setSearch}
            />
          ) : canAssignHostess ? (
            <div className='flex flex-wrap justify-end gap-1'>
              {(producto.selectedHostesses || []).length > 0 ? (
                producto.selectedHostesses.map((hostessId: string, hostessIndex: number) => {
                  const hostess = anfitrionas.find(
                    item => String(item.id || item.id_usuario) === String(hostessId)
                  );
                  return (
                    <span
                      key={hostessId}
                      className={`rounded-full px-2 py-0.5 text-xs ${
                        [
                          'bg-purple-100 text-purple-700',
                          'bg-pink-100 text-pink-700',
                          'bg-blue-100 text-blue-700',
                          'bg-green-100 text-green-700'
                        ][hostessIndex % 4]
                      }`}
                    >
                      {hostess?.nick || hostess?.name || hostess?.nombre || `ID: ${hostessId}`}
                    </span>
                  );
                })
              ) : (
                <span className='text-xs text-muted-foreground'>Sin anfitrionas asignadas</span>
              )}
            </div>
          ) : (
            <span className='text-xs text-muted-foreground'>No aplica</span>
          )}
        </div>
      )}

      {visibleColumns.room && (
        <div className='mt-3 flex items-center justify-between gap-3 border-t border-border pt-3 text-xs'>
          <span className='text-muted-foreground'>Habitación</span>
          <span className='rounded-full bg-orange-100 px-2 py-0.5 font-medium text-orange-700'>
            {room?.nombre ||
              room?.name ||
              (producto.selectedRoom ? `ID: ${producto.selectedRoom}` : 'Sin asignar')}
          </span>
        </div>
      )}
    </article>
  );
}

const OrderProductTable = memo(function OrderProductTable({
  productos,
  onRemoveProducto,
  onUpdateCantidad,
  onToggleComision,
  onAssignHostess,
  anfitrionas,
  habitaciones = []
}: OrderProductTableProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [tableFits, setTableFits] = useState(false);
  const visibleColumns = {
    drink: productos.some(
      producto =>
        producto.tipo_venta === 'shot' ||
        Boolean(producto.acompanamiento_corto) ||
        normalizarAcompanamientoBotella(producto.acompanamiento_botella).length > 0
    ),
    commission: productos.some(
      producto => producto.generaComision === 1 && Number(producto.comision) > 0
    ),
    hostess: productos.some(producto => {
      const admitsHostess = permiteAnfitrionaConComision(
        producto.tipo_venta === 'shot' ? 'shot' : 'botella',
        producto.comisionUnitaria ?? producto.comision,
        Boolean(producto.shot_anfitriona)
      );
      return (
        (producto.selectedHostesses?.length ?? 0) > 0 ||
        (admitsHostess &&
          ((producto.tipo_venta === 'shot' && producto.shot_anfitriona) ||
            producto.generaComision === 1))
      );
    }),
    room: productos.some(producto => Boolean(producto.selectedRoom) || producto.requiresRoom)
  };
  const columnCount =
    6 +
    Number(visibleColumns.drink) +
    Number(visibleColumns.commission) +
    Number(visibleColumns.hostess) +
    Number(visibleColumns.room);
  const tableMinWidth =
    240 +
    110 +
    100 +
    130 +
    (visibleColumns.drink ? 260 : 0) +
    (visibleColumns.commission ? 100 : 0) +
    (visibleColumns.hostess ? 220 : 0) +
    (visibleColumns.room ? 120 : 0) +
    110 +
    80;

  useEffect(() => {
    const container = containerRef.current;
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
    <div ref={containerRef} className='mt-6 w-full min-w-0 max-w-full'>
      {tableFits ? (
        <div className='overflow-hidden rounded-3xl bg-white shadow-md dark:bg-slate-900/40 dark:shadow-black/20'>
          <Table
            className='w-full table-fixed text-center [&_td]:align-middle [&_th]:whitespace-nowrap [&_td]:break-normal'
            style={{ minWidth: tableMinWidth }}
          >
            <colgroup>
              <col style={{ width: 240 }} />
              <col style={{ width: 110 }} />
              <col style={{ width: 100 }} />
              <col style={{ width: 130 }} />
              {visibleColumns.drink && <col style={{ width: 260 }} />}
              {visibleColumns.commission && <col style={{ width: 100 }} />}
              {visibleColumns.hostess && <col style={{ width: 220 }} />}
              {visibleColumns.room && <col style={{ width: 120 }} />}
              <col style={{ width: 110 }} />
              <col style={{ width: 80 }} />
            </colgroup>
            <TableHeader className='border-b dark:border-slate-800'>
              <TableRow>
                <TableHead className='text-center font-bold'>Producto</TableHead>
                <TableHead className='text-center font-bold'>Cantidad</TableHead>
                <TableHead className='text-center font-bold'>Precio</TableHead>
                <TableHead className='text-center font-bold'>Tipo</TableHead>
                {visibleColumns.drink && (
                  <TableHead className='text-center font-bold'>Bebida y consumo</TableHead>
                )}
                {visibleColumns.commission && (
                  <TableHead className='text-center font-bold'>Comisión</TableHead>
                )}
                {visibleColumns.hostess && (
                  <TableHead className='text-center font-bold'>Anfitriona asignada</TableHead>
                )}
                {visibleColumns.room && (
                  <TableHead className='text-center font-bold'>Habitación</TableHead>
                )}
                <TableHead className='text-center font-bold'>Sub total</TableHead>
                <TableHead className='text-center font-bold'>Eliminar</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {productos.length === 0 && (
                <TableRow>
                  <TableCell colSpan={columnCount} className='text-center'>
                    <EmptyState variant='text' title='No hay productos agregados' />
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
                  visibleColumns={visibleColumns}
                />
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <div className='grid min-w-0 gap-3 sm:grid-cols-2 2xl:grid-cols-3'>
          {productos.length === 0 ? (
            <div className='col-span-full rounded-xl border border-border py-8 text-center'>
              <EmptyState variant='text' title='No hay productos agregados' />
            </div>
          ) : (
            productos.map((producto, index) => (
              <OrderProductCard
                key={`${producto.id_producto || producto.id}-${index}`}
                producto={producto}
                index={index}
                onRemoveProducto={onRemoveProducto}
                onUpdateCantidad={onUpdateCantidad}
                onToggleComision={onToggleComision}
                onAssignHostess={onAssignHostess}
                anfitrionas={anfitrionas}
                habitaciones={habitaciones}
                visibleColumns={visibleColumns}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
});

export default OrderProductTable;
