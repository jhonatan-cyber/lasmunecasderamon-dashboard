'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Plus, LayoutGrid, List, Check, Search, X } from 'lucide-react';
import { ProductPhoto } from '@/components/shared/ProductPhoto';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import React, { useState, useEffect } from 'react';
import { formatCurrencyNoDecimals } from '@/lib/utils/formatters';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import { HostessMultiSelect } from '@/components/orders';
import { IndividualHostessSelect } from '@/components/shared/selects';
import { isExpensiveDrink, hostessAllowedForPrice } from '@/components/orders/productModalRules';
import { resolverVentaProducto, type SaleChoice } from '@/lib/sales/saleChoice';
import { useConfigValue } from '@/hooks/shared/useConfigValue';
import { resolveShotMl, resolveShotMlAnfitriona } from '@/lib/business/shotMl';
import Paginate from '@/components/shared/Paginate';
import { QuantityStepper } from '@/components/shared/QuantityStepper';
import {
  CUENTA_TABLE_CARD_CLASS,
  CUENTA_TABLE_CELL_CLASS,
  CUENTA_TABLE_CLASS,
  CUENTA_TABLE_HEAD_CLASS,
  CUENTA_TABLE_HEADER_CLASS,
  CUENTA_TABLE_HEADER_ROW_CLASS,
  CUENTA_TABLE_ROW_CLASS
} from '@/components/cuentas/tables/cuentaTableStyles';
import {
  getActiveHostesses,
  getChampagneHostessLimit,
  getExplicitMaxAnfitrionas,
  hasCommission,
  isChampagneProduct
} from '@/components/orders';

function SaleProductPhoto({ foto, name, large }: { foto?: string; name: string; large: boolean }) {
  const [failedSource, setFailedSource] = useState<string | null>(null);
  const fallback = '/api/images/products/default.png';
  const source =
    !foto || foto === 'default.png'
      ? fallback
      : foto.startsWith('http') || foto.startsWith('/')
        ? foto
        : `/api/images/products/${foto}`;
  return (
    <div
      data-photo-surface
      className={
        large
          ? 'relative h-44 w-full shrink-0 overflow-hidden rounded-2xl border border-gray-200/70 bg-white dark:border-white/10 dark:bg-white/[0.04]'
          : 'relative size-20 shrink-0 overflow-hidden rounded-2xl border border-gray-200/70 bg-white dark:border-white/10 dark:bg-white/[0.04]'
      }
    >
      <ProductPhoto
        src={failedSource === source ? fallback : source}
        alt={name}
        fill
        className='object-contain p-2'
        onError={() => setFailedSource(source)}
      />
    </div>
  );
}

interface SaleProductModalProps {
  open: boolean;
  onClose: () => void;
  loading: boolean;
  productos: any[];
  cantidades: { [key: string]: number };
  handleCantidadChange: (id: string, value: string) => void;
  handleAgregarProducto: (producto: any) => void;
  categoria: any;
  anfitrionas: any[];
  champagneHostessSelections: { [key: string]: string[] };
  onChampagneHostessChange: (productId: string, hostessIds: string[]) => void;
  otherProductHostessSelections: { [key: string]: string[] };
  onOtherProductHostessChange: (productId: string, hostessIds: string[]) => void;
  productosEnCarrito: any[];
}

export default function SaleProductModal({
  open,
  onClose,
  loading,
  productos,
  cantidades,
  handleCantidadChange,
  handleAgregarProducto,
  categoria,
  anfitrionas,
  champagneHostessSelections,
  onChampagneHostessChange,
  otherProductHostessSelections,
  onOtherProductHostessChange,
  productosEnCarrito
}: SaleProductModalProps) {
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');
  const [currentPage, setCurrentPage] = useState(1);
  const [query, setQuery] = useState('');
  const [hostessSearchValues, setHostessSearchValues] = useState<{ [key: string]: string }>({});
  // Tipo de venta elegido por presentación: botella entera o shot (descuenta ml).
  const [tiposVenta, setTiposVenta] = useState<{ [key: string]: SaleChoice }>({});
  const shotMl = useConfigValue<number>('bar', 'shot_ml', 50);
  const itemsPerPage = 5;

  useEffect(() => {
    setCurrentPage(1);
    setQuery('');
  }, [open, productos]);

  const availableHostesses = getActiveHostesses(anfitrionas || []);

  const getAvailableHostessesForChampagne = (_currentProductId: string) => availableHostesses;

  const getAvailableHostessesForOtherProducts = (_currentProductId: string) => availableHostesses;

  const queryNorm = query.trim().toLowerCase();
  const filteredProductos = queryNorm
    ? (productos || []).filter(p => `${p.nombre || p.name || ''}`.toLowerCase().includes(queryNorm))
    : productos || [];

  const totalPages = Math.ceil((filteredProductos?.length || 0) / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentProductos = filteredProductos?.slice(startIndex, endIndex) || [];

  const productViews = currentProductos.map(p => {
    const id = String(p.id_producto || p.id);
    const isChampagne = isChampagneProduct(p);
    const champagneHostessLimit = getChampagneHostessLimit(p);

    // Ml por shot del producto; sin valor propio se usa el global de Configuraciones.
    const mlPorShot = resolveShotMl(p.ml_shot, shotMl);
    const mlPorShotAnfitriona = resolveShotMlAnfitriona(p.ml_shot_anfitriona, mlPorShot);
    const venta = resolverVentaProducto(p, tiposVenta[id]);
    const tipoVenta = venta.tipoVenta;
    const esShot = venta.esShot;
    const precioVenta = venta.precio;
    const comisionVenta = venta.comision;
    const maxCantidad = venta.maxCantidad;
    const tieneShot = venta.tieneShot;
    // El listado muestra el precio de cada forma de venta, no solo el tipo.
    // Cada audiencia muestra sus propios ml.
    const opcionesTipo: { value: SaleChoice; label: string }[] = venta.opciones.map(opcion => {
      const mlOpcion = opcion.value === 'shot_anfitriona' ? mlPorShotAnfitriona : mlPorShot;
      return {
        value: opcion.value,
        label: `${opcion.nombre}${opcion.esShot ? ` · ${mlOpcion} ml` : ''} · ${formatCurrencyNoDecimals(opcion.precio)}`
      };
    });
    // Cada tipo de venta lleva su propia comisión: sin comisión no se pide anfitriona.
    const pideAnfitriona = esShot
      ? comisionVenta > 0
      : hasCommission(p) || venta.comisionBotella > 0;
    // La regla por precio (bebida cara) es de la botella: el shot no la hereda.
    const muestraAnfitriona =
      pideAnfitriona || (!esShot && hostessAllowedForPrice(venta.precioBotella));

    // Unidades de esta presentación y tipo de venta ya agregadas al carrito.
    const tipoCarrito = tipoVenta === 'botella' ? 'botella' : 'shot';
    const enCarrito = (productosEnCarrito || [])
      .filter(
        c => String(c.id) === id && (c.tipo_venta === 'shot' ? 'shot' : 'botella') === tipoCarrito
      )
      .reduce((sum, c) => sum + (Number(c.cantidad) || 0), 0);
    const cantidadActual = cantidades[id] || 1;
    const agregarDisabled =
      pideAnfitriona &&
      ((isChampagne &&
        (!champagneHostessSelections[id] || champagneHostessSelections[id].length === 0)) ||
        (!isChampagne &&
          (!otherProductHostessSelections[id] || otherProductHostessSelections[id].length === 0)));
    const onAgregar = () => {
      const productWithHostess = {
        ...p,
        // El shot a anfitriona comparte el mismo comportamiento por ml; lo que
        // cambia es el precio, y se guarda para separarlo en reportes y caja.
        tipo_venta: tipoVenta === 'botella' ? 'botella' : 'shot',
        shot_anfitriona: tipoVenta === 'shot_anfitriona',
        precio: precioVenta,
        comision: comisionVenta,
        selectedHostesses: isChampagne
          ? champagneHostessSelections[id] || []
          : otherProductHostessSelections[id] || [],
        isChampagne: isChampagne
      };
      handleAgregarProducto(productWithHostess);
    };
    const totalAgregar = formatCurrencyNoDecimals(precioVenta * cantidadActual);

    const photo = (
      <SaleProductPhoto foto={p.foto} name={p.nombre || p.name} large={viewMode === 'cards'} />
    );
    return {
      id,
      photo,
      name: p.nombre || p.name,
      details: (
        <>
          <div className='text-sm font-semibold leading-tight'>{p.nombre || p.name}</div>
          <p className='mt-1 flex items-center gap-1.5 text-xs text-muted-foreground'>
            <span
              className={`size-1.5 shrink-0 rounded-full ${
                Number(p.stock_bar ?? 0) > 0 ? 'bg-emerald-500' : 'bg-red-500'
              }`}
              aria-hidden='true'
            />
            Disponibles en bar: {p.stock_bar ?? 0}
          </p>
          {enCarrito > 0 && (
            <span className='mt-1.5 inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-bold text-emerald-600 dark:text-emerald-400'>
              <Check className='size-3' aria-hidden='true' />
              En carrito · {enCarrito}
            </span>
          )}
          {Number(p.ml_abierta ?? 0) > 0 && (
            <p className='text-xs text-amber-600 dark:text-amber-400 font-medium'>
              Botella abierta: {Number(p.ml_abierta)} ml
              {(() => {
                const mlEstimacion =
                  tipoVenta === 'shot_anfitriona' ? mlPorShotAnfitriona : mlPorShot;
                return mlEstimacion > 0
                  ? ` · ≈${Math.floor(Number(p.ml_abierta) / mlEstimacion)} shots`
                  : '';
              })()}
            </p>
          )}
          {tieneShot && (
            <div className='mt-2 flex flex-wrap gap-1 rounded-2xl border border-neutral-200 bg-neutral-100 p-1 dark:border-white/10 dark:bg-white/5'>
              {opcionesTipo.map(({ value, label }) => {
                const active = tipoVenta === value;
                return (
                  <button
                    key={value}
                    type='button'
                    onClick={() => setTiposVenta(prev => ({ ...prev, [id]: value }))}
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
      ),
      price: (
        <span className='text-[15px] font-bold tabular-nums'>
          {formatCurrencyNoDecimals(precioVenta)}
        </span>
      ),
      commission: (
        <span className='text-[15px] font-semibold tabular-nums text-muted-foreground'>
          {formatCurrencyNoDecimals(comisionVenta)}
        </span>
      ),
      quantity: (
        <QuantityStepper
          value={cantidadActual}
          max={maxCantidad}
          onChange={siguiente => handleCantidadChange(id, siguiente.toString())}
        >
          {maxCantidad < 99 && (
            <span className='text-[11px] tabular-nums text-muted-foreground'>
              máx. {maxCantidad}
            </span>
          )}
        </QuantityStepper>
      ),
      hostess: (
        <>
          {muestraAnfitriona ? (
            isChampagne ? (
              <div className='space-y-2'>
                <div className='w-full'>
                  <HostessMultiSelect
                    anfitrionas={getAvailableHostessesForChampagne(id)}
                    value={champagneHostessSelections[id] || []}
                    onChange={selectedIds => {
                      onChampagneHostessChange(id, selectedIds);
                    }}
                    searchValue={hostessSearchValues[id] || ''}
                    onSearchChange={searchValue => {
                      setHostessSearchValues(prev => ({
                        ...prev,
                        [id]: searchValue
                      }));
                    }}
                    maxSelection={champagneHostessLimit}
                  />
                </div>

                <div className='text-xs text-gray-500'>
                  {(() => {
                    const currentProduct = productos.find(
                      p => String(p.id_producto || p.id) === id
                    );
                    const precio = Number(currentProduct?.precio || currentProduct?.price || 0);
                    const currentCount = champagneHostessSelections[id]?.length || 0;
                    return `${currentCount} de ${champagneHostessLimit} seleccionadas`;
                  })()}
                </div>
              </div>
            ) : (
              <div className='space-y-2'>
                {(() => {
                  const currentProduct = productos.find(p => String(p.id_producto || p.id) === id);
                  const cantidad = cantidades[id] || 1;

                  if (isExpensiveDrink(currentProduct)) {
                    // Botella cara: tantas anfitrionas como unidades, salvo máximo
                    // explícito por producto (Configuraciones > Comisiones).
                    const maxExplicito = getExplicitMaxAnfitrionas(currentProduct ?? {});
                    const limiteAnfitrionas = maxExplicito
                      ? Math.min(cantidad, maxExplicito)
                      : cantidad;
                    return (
                      <>
                        <HostessMultiSelect
                          anfitrionas={getAvailableHostessesForOtherProducts(id)}
                          value={otherProductHostessSelections[id] || []}
                          onChange={selectedIds => {
                            onOtherProductHostessChange(id, selectedIds);
                          }}
                          searchValue={hostessSearchValues[id] || ''}
                          onSearchChange={searchValue => {
                            setHostessSearchValues(prev => ({
                              ...prev,
                              [id]: searchValue
                            }));
                          }}
                          maxSelection={limiteAnfitrionas}
                        />
                        <div className='text-xs text-gray-500'>
                          {otherProductHostessSelections[id]?.length || 0} de {limiteAnfitrionas}{' '}
                          seleccionadas
                        </div>
                      </>
                    );
                  }

                  return (
                    <>
                      <IndividualHostessSelect
                        anfitrionas={getAvailableHostessesForOtherProducts(id)}
                        value={otherProductHostessSelections[id]?.[0] || ''}
                        onChange={selectedValue => {
                          onOtherProductHostessChange(id, selectedValue ? [selectedValue] : []);
                        }}
                        placeholder={
                          getAvailableHostessesForOtherProducts(id).length === 0
                            ? 'No hay anfitrionas disponibles'
                            : 'Seleccionar anfitriona'
                        }
                        className='w-full'
                      />
                      {otherProductHostessSelections[id]?.length > 0 ? (
                        <div className='text-xs text-green-600 font-medium'>
                          Asignada:{' '}
                          {(() => {
                            const hostessId = otherProductHostessSelections[id][0];
                            const hostess = availableHostesses.find(
                              h => String(h.id || h.id_usuario) === hostessId
                            );
                            return hostess?.nick || hostess?.name || hostess?.nombre || hostessId;
                          })()}
                        </div>
                      ) : (
                        <div className='text-xs text-gray-500'>
                          {getAvailableHostessesForOtherProducts(id).length === 0
                            ? 'Todas las anfitrionas están asignadas'
                            : 'Una anfitriona por bebida'}
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>
            )
          ) : (
            <span className='inline-flex items-center rounded-full bg-neutral-100 px-3 py-1 text-xs text-gray-400 dark:bg-white/5 dark:text-neutral-500'>
              Sin comisión
            </span>
          )}
        </>
      ),
      add: (
        <>
          <Button
            size='icon'
            variant='outline'
            aria-label='Agregar producto'
            className='h-10 w-10 rounded-full bg-black text-white shadow-md transition-all duration-200 hover:scale-110 hover:bg-black/80 disabled:opacity-40 dark:bg-white dark:text-black dark:hover:bg-white/90'
            onClick={onAgregar}
            disabled={agregarDisabled}
          >
            <Plus className='h-4 w-4' />
          </Button>
        </>
      ),
      enCarrito,
      agregarDisabled,
      onAgregar,
      totalAgregar
    };
  });

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className='flex max-h-[90vh] max-w-5xl flex-col gap-0 p-0'>
        <DialogHeader className='shrink-0 border-b px-6 pb-4 pt-6'>
          <div className='flex flex-wrap items-start justify-between gap-3'>
            <div>
              <DialogTitle className='text-lg'>
                {categoria
                  ? `Productos en bar · ${categoria.nombre || categoria.name}`
                  : 'Productos en bar'}
              </DialogTitle>
              <p className='mt-1 text-sm text-muted-foreground'>
                {queryNorm
                  ? `${filteredProductos.length} de ${productos?.length || 0} presentaciones`
                  : productos?.length
                    ? `${productos.length} ${productos.length === 1 ? 'presentación disponible' : 'presentaciones disponibles'} en bar`
                    : 'Sin productos con stock en bar'}
              </p>
            </div>
            <ToggleGroup
              type='single'
              value={viewMode}
              onValueChange={value => {
                if (value === 'table' || value === 'cards') setViewMode(value);
              }}
              variant='default'
              size='sm'
              aria-label='Vista de productos'
              className='justify-start gap-4'
            >
              <ToggleGroupItem
                value='table'
                aria-label='Ver como tabla'
                className='rounded-none px-1 text-muted-foreground hover:bg-transparent hover:text-foreground data-[state=on]:bg-transparent data-[state=on]:text-foreground data-[state=on]:underline data-[state=on]:decoration-2 data-[state=on]:underline-offset-[6px]'
              >
                <List className='size-4' aria-hidden='true' />
                Tabla
              </ToggleGroupItem>
              <ToggleGroupItem
                value='cards'
                aria-label='Ver como tarjetas'
                className='rounded-none px-1 text-muted-foreground hover:bg-transparent hover:text-foreground data-[state=on]:bg-transparent data-[state=on]:text-foreground data-[state=on]:underline data-[state=on]:decoration-2 data-[state=on]:underline-offset-[6px]'
              >
                <LayoutGrid className='size-4' aria-hidden='true' />
                Tarjetas
              </ToggleGroupItem>
            </ToggleGroup>
          </div>
        </DialogHeader>
        <div className='min-h-0 flex-1 overflow-y-auto px-6 py-4'>
          {loading ? (
            <div className='text-center text-gray-400 py-8 flex justify-center items-center'>
              Cargando productos...
            </div>
          ) : (
            <div className='w-full'>
              <div className='mb-3 flex items-center gap-2 rounded-full border border-neutral-200 bg-neutral-50 px-4 py-2 transition-colors focus-within:border-neutral-400 dark:border-white/10 dark:bg-white/5 dark:focus-within:border-white/30'>
                <Search className='size-4 shrink-0 text-muted-foreground' aria-hidden='true' />
                <input
                  value={query}
                  onChange={e => {
                    setQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                  placeholder='Buscar en esta categoría…'
                  aria-label='Buscar producto en esta categoría'
                  className='w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground'
                />
                {query && (
                  <button
                    type='button'
                    onClick={() => setQuery('')}
                    aria-label='Limpiar búsqueda'
                    className='rounded-full p-0.5 text-muted-foreground transition-colors hover:text-foreground'
                  >
                    <X className='size-4' aria-hidden='true' />
                  </button>
                )}
              </div>
              {!Array.isArray(productos) || productos.length === 0 ? (
                <div className='text-center text-gray-400 py-8 w-full'>
                  No hay productos con stock disponible en el bar para esta categoría.
                </div>
              ) : filteredProductos.length === 0 ? (
                <div className='w-full py-8 text-center text-gray-400'>
                  Sin resultados para “{query.trim()}”.
                </div>
              ) : (
                <>
                  {viewMode === 'table' ? (
                    <div className={CUENTA_TABLE_CARD_CLASS}>
                      <div className='overflow-x-auto'>
                        <Table className={CUENTA_TABLE_CLASS}>
                          <TableHeader className={CUENTA_TABLE_HEADER_CLASS}>
                            <TableRow className={CUENTA_TABLE_HEADER_ROW_CLASS}>
                              <TableHead className={CUENTA_TABLE_HEAD_CLASS}>Producto</TableHead>
                              <TableHead className={`${CUENTA_TABLE_HEAD_CLASS} text-center`}>
                                Precio
                              </TableHead>
                              <TableHead className={`${CUENTA_TABLE_HEAD_CLASS} text-center`}>
                                Comisión
                              </TableHead>
                              <TableHead className={`${CUENTA_TABLE_HEAD_CLASS} text-center`}>
                                Cantidad
                              </TableHead>
                              <TableHead className={`${CUENTA_TABLE_HEAD_CLASS} text-center`}>
                                Anfitriona
                              </TableHead>
                              <TableHead className={`${CUENTA_TABLE_HEAD_CLASS} text-center`}>
                                Agregar
                              </TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {productViews.map(product => (
                              <TableRow key={product.id} className={CUENTA_TABLE_ROW_CLASS}>
                                <TableCell
                                  className={`${CUENTA_TABLE_CELL_CLASS} min-w-[300px] text-left align-top`}
                                >
                                  <div className='flex items-start gap-4'>
                                    {product.photo}
                                    <div className='min-w-0 flex-1'>{product.details}</div>
                                  </div>
                                </TableCell>
                                <TableCell
                                  className={`${CUENTA_TABLE_CELL_CLASS} text-center align-middle`}
                                >
                                  {product.price}
                                </TableCell>
                                <TableCell
                                  className={`${CUENTA_TABLE_CELL_CLASS} text-center align-middle`}
                                >
                                  {product.commission}
                                </TableCell>
                                <TableCell
                                  className={`${CUENTA_TABLE_CELL_CLASS} text-center align-middle`}
                                >
                                  {product.quantity}
                                </TableCell>
                                <TableCell
                                  className={`${CUENTA_TABLE_CELL_CLASS} min-w-[210px] text-center align-middle`}
                                >
                                  {product.hostess}
                                </TableCell>
                                <TableCell
                                  className={`${CUENTA_TABLE_CELL_CLASS} text-center align-middle`}
                                >
                                  {product.add}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  ) : (
                    <div className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
                      {productViews.map(product => (
                        <Card
                          key={product.id}
                          className={`flex min-w-0 flex-col overflow-hidden rounded-2xl transition-shadow hover:shadow-lg ${
                            product.enCarrito > 0 ? 'ring-1 ring-emerald-500/50' : ''
                          }`}
                        >
                          <div className='relative px-4 pt-4'>
                            {product.photo}
                            {product.enCarrito > 0 && (
                              <span className='absolute right-7 top-7 inline-flex items-center gap-1 rounded-full bg-emerald-500 px-2.5 py-1 text-[11px] font-bold text-white shadow'>
                                <Check className='size-3' aria-hidden='true' />
                                {product.enCarrito}
                              </span>
                            )}
                          </div>
                          <CardHeader className='p-4'>
                            <CardTitle className='sr-only'>{product.name}</CardTitle>
                            {product.details}
                          </CardHeader>
                          <CardContent className='flex flex-1 flex-col gap-4 p-4 pt-0'>
                            <dl className='grid grid-cols-2 gap-3 rounded-xl border border-neutral-200/60 bg-muted p-3 dark:border-white/10'>
                              <div>
                                <dt className='text-xs text-muted-foreground'>Precio</dt>
                                <dd className='font-semibold tabular-nums'>{product.price}</dd>
                              </div>
                              <div>
                                <dt className='text-xs text-muted-foreground'>Comisión</dt>
                                <dd className='font-semibold tabular-nums'>{product.commission}</dd>
                              </div>
                            </dl>
                            <div className='flex items-center justify-between gap-2'>
                              <span className='text-sm text-muted-foreground'>Cantidad</span>
                              {product.quantity}
                            </div>
                            <div className='flex flex-col gap-2'>
                              <span className='text-sm text-muted-foreground'>Anfitriona</span>
                              {product.hostess}
                            </div>
                          </CardContent>
                          <CardFooter className='border-t p-4'>
                            <Button
                              aria-label='Agregar producto'
                              onClick={product.onAgregar}
                              disabled={product.agregarDisabled}
                              className='h-11 w-full rounded-full bg-black text-sm font-bold text-white shadow-md transition-all hover:scale-[1.02] hover:bg-black/80 disabled:opacity-40 dark:bg-white dark:text-black dark:hover:bg-white/90'
                            >
                              <Plus className='mr-2 size-4' aria-hidden='true' />
                              Agregar · {product.totalAgregar}
                            </Button>
                          </CardFooter>
                        </Card>
                      ))}
                    </div>
                  )}

                  {totalPages > 1 && (
                    <div className='flex justify-center mt-4'>
                      <Paginate
                        page={currentPage}
                        totalPages={totalPages}
                        setPage={setCurrentPage}
                      />
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
        <DialogFooter className='shrink-0 border-t px-6 py-4'>
          <div className='w-full flex justify-center'>
            <Button
              onClick={onClose}
              variant='outline'
              className='rounded-full bg-black px-6 text-white transition-all duration-200 hover:scale-105 hover:bg-black/80 dark:bg-white dark:text-black dark:hover:bg-white/90'
            >
              Aceptar
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
