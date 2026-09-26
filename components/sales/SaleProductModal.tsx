'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Plus, Minus, LayoutGrid, List } from 'lucide-react';
import Image from 'next/image';
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
import type { SaleOption, SaleType } from '@/types/sale-options';
import { useConfigValue } from '@/hooks/shared/useConfigValue';
import { resolveShotMl } from '@/lib/business/shotMl';
import Paginate from '@/components/shared/Paginate';
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
          ? 'relative h-40 w-full shrink-0'
          : 'relative size-14 shrink-0 overflow-hidden rounded-lg'
      }
    >
      <Image
        data-themed-photo
        src={failedSource === source ? fallback : source}
        alt={name}
        fill
        sizes={large ? '(max-width: 640px) 90vw, 400px' : '56px'}
        className='object-contain p-1'
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
  const [hostessSearchValues, setHostessSearchValues] = useState<{ [key: string]: string }>({});
  // Tipo de venta elegido por presentación: botella entera o shot (descuenta ml).
  const [tiposVenta, setTiposVenta] = useState<{ [key: string]: SaleType }>({});
  const shotMl = useConfigValue<number>('bar', 'shot_ml', 50);
  const itemsPerPage = 5;

  useEffect(() => {
    setCurrentPage(1);
  }, [open, productos]);

  const availableHostesses = getActiveHostesses(anfitrionas || []);

  const getAvailableHostessesForChampagne = (_currentProductId: string) => availableHostesses;

  const getAvailableHostessesForOtherProducts = (_currentProductId: string) => availableHostesses;

  const totalPages = Math.ceil((productos?.length || 0) / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentProductos = productos?.slice(startIndex, endIndex) || [];

  const productViews = currentProductos.map(p => {
    const id = String(p.id_producto || p.id);
    const isChampagne = isChampagneProduct(p);
    const champagneHostessLimit = getChampagneHostessLimit(p);

    const tipoVenta: SaleType = tiposVenta[id] === 'shot' ? 'shot' : 'botella';
    // Ml por shot del producto; sin valor propio se usa el global de Configuraciones.
    const mlPorShot = resolveShotMl(p.ml_shot, shotMl);
    const opcionesVenta: SaleOption[] = Array.isArray(p.opciones_venta) ? p.opciones_venta : [];
    const opcionShot = opcionesVenta.find(o => o.tipo === 'shot');
    const opcionBotella = opcionesVenta.find(o => o.tipo === 'botella');
    // La comisión del shot también pide anfitriona al venderlo.
    const hasComm = hasCommission(p) || Number(opcionShot?.comision ?? 0) > 0;
    const tieneShot = Boolean(opcionShot && Number(opcionShot.precio) > 0);
    const precioVenta =
      tipoVenta === 'shot'
        ? Number(opcionShot?.precio ?? 0)
        : Number(opcionBotella?.precio ?? p.precio ?? p.price ?? 0);
    const comisionVenta =
      tipoVenta === 'shot'
        ? Number(opcionShot?.comision ?? 0)
        : Number(opcionBotella?.comision ?? p.comision ?? p.commission ?? 0);
    const maxCantidad = tipoVenta === 'shot' ? 99 : Number(p.stock_bar ?? 0);

    const photo = (
      <SaleProductPhoto foto={p.foto} name={p.nombre || p.name} large={viewMode === 'cards'} />
    );
    return {
      id,
      photo,
      name: p.nombre || p.name,
      details: (
        <>
          <div className='font-medium'>{p.nombre || p.name}</div>
          <p className='text-xs text-muted-foreground'>Disponibles en bar: {p.stock_bar ?? 0}</p>
          {Number(p.ml_abierta ?? 0) > 0 && (
            <p className='text-xs text-amber-600 dark:text-amber-400 font-medium'>
              Botella abierta: {Number(p.ml_abierta)} ml
              {mlPorShot > 0 ? ` · ≈${Math.floor(Number(p.ml_abierta) / mlPorShot)} shots` : ''}
            </p>
          )}
          {tieneShot && (
            <div className='mt-1.5 flex items-center gap-1.5'>
              {(['botella', 'shot'] as SaleType[]).map(tipo => (
                <button
                  key={tipo}
                  type='button'
                  onClick={() => setTiposVenta(prev => ({ ...prev, [id]: tipo }))}
                  className={`px-2.5 py-1 rounded-full text-[11px] font-bold border transition-colors ${
                    tipoVenta === tipo
                      ? 'bg-black text-white border-black dark:bg-white dark:text-black dark:border-white'
                      : 'border-neutral-300 dark:border-neutral-700 text-neutral-500'
                  }`}
                >
                  {tipo === 'botella' ? 'Botella' : `Shot · ${mlPorShot} ml`}
                </button>
              ))}
            </div>
          )}
        </>
      ),
      price: <>{formatCurrencyNoDecimals(precioVenta)}</>,
      commission: <>{formatCurrencyNoDecimals(comisionVenta)}</>,
      quantity: (
        <>
          <div className='flex items-center justify-center gap-2'>
            <Button
              size='sm'
              variant='outline'
              aria-label='Disminuir'
              onClick={() => {
                const currentCantidad = cantidades[id] || 1;
                if (currentCantidad > 1) {
                  handleCantidadChange(id, (currentCantidad - 1).toString());
                }
              }}
              className='w-6 h-6 p-0 rounded-full hover:scale-105 transition-all duration-200'
              disabled={(cantidades[id] || 1) <= 1}
            >
              <Minus className='w-3 h-3' />
            </Button>
            <span className='w-8 text-center'>{cantidades[id] || 1}</span>
            <Button
              size='sm'
              variant='outline'
              aria-label='Aumentar'
              onClick={() => {
                const currentCantidad = cantidades[id] || 1;
                handleCantidadChange(id, (currentCantidad + 1).toString());
              }}
              disabled={(cantidades[id] || 1) >= maxCantidad}
              className='w-6 h-6 p-0 rounded-full hover:scale-105 transition-all duration-200'
            >
              <Plus className='w-3 h-3' />
            </Button>
          </div>
        </>
      ),
      hostess: (
        <>
          {hasComm || hostessAllowedForPrice(p.precio ?? p.price) ? (
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
                          maxSelection={cantidad}
                        />
                        <div className='text-xs text-gray-500'>
                          {otherProductHostessSelections[id]?.length || 0} de {cantidad}{' '}
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
                          ? Asignada:{' '}
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
                            ? 'Todas las anfitrionas est?n asignadas'
                            : 'Una anfitriona por bebida'}
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>
            )
          ) : (
            <div className='text-xs text-gray-400'>Sin comisión</div>
          )}
        </>
      ),
      add: (
        <>
          <Button
            size='icon'
            variant='outline'
            aria-label='Agregar producto'
            className='rounded-full bg-black text-white hover:scale-110 transition-all duration-200'
            onClick={() => {
              const productWithHostess = {
                ...p,
                tipo_venta: tipoVenta,
                precio: precioVenta,
                comision: comisionVenta,
                selectedHostesses: isChampagne
                  ? champagneHostessSelections[id] || []
                  : otherProductHostessSelections[id] || [],
                isChampagne: isChampagne
              };
              handleAgregarProducto(productWithHostess);
            }}
            disabled={
              hasComm &&
              ((isChampagne &&
                (!champagneHostessSelections[id] || champagneHostessSelections[id].length === 0)) ||
                (!isChampagne &&
                  (!otherProductHostessSelections[id] ||
                    otherProductHostessSelections[id].length === 0)))
            }
          >
            <Plus className='w-4 h-4' />
          </Button>
        </>
      )
    };
  });

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className='max-w-4xl max-h-[90vh] flex flex-col p-0'>
        <DialogHeader className='shrink-0 px-6 pt-6 pb-4 border-b'>
          <DialogTitle>
            {categoria
              ? `Productos en bar · ${categoria.nombre || categoria.name}`
              : 'Productos en bar'}
          </DialogTitle>
          <ToggleGroup
            type='single'
            value={viewMode}
            onValueChange={value => {
              if (value === 'table' || value === 'cards') setViewMode(value);
            }}
            variant='outline'
            size='sm'
            aria-label='Vista de productos'
            className='justify-start pt-2'
          >
            <ToggleGroupItem value='table' aria-label='Ver como tabla'>
              <List className='size-4' aria-hidden='true' />
              Tabla
            </ToggleGroupItem>
            <ToggleGroupItem value='cards' aria-label='Ver como tarjetas'>
              <LayoutGrid className='size-4' aria-hidden='true' />
              Tarjetas
            </ToggleGroupItem>
          </ToggleGroup>
        </DialogHeader>
        <div className='min-h-0 flex-1 overflow-y-auto px-6 py-4'>
          {loading ? (
            <div className='text-center text-gray-400 py-8 flex justify-center items-center'>
              Cargando productos...
            </div>
          ) : (
            <div className='w-full'>
              {!Array.isArray(productos) || productos.length === 0 ? (
                <div className='text-center text-gray-400 py-8 w-full'>
                  No hay productos con stock disponible en el bar para esta categoría.
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
                                <TableCell className={CUENTA_TABLE_CELL_CLASS}>
                                  <div className='flex items-start gap-3'>
                                    {product.photo}
                                    <div className='min-w-0'>{product.details}</div>
                                  </div>
                                </TableCell>
                                <TableCell className={`${CUENTA_TABLE_CELL_CLASS} text-center`}>
                                  {product.price}
                                </TableCell>
                                <TableCell className={`${CUENTA_TABLE_CELL_CLASS} text-center`}>
                                  {product.commission}
                                </TableCell>
                                <TableCell className={`${CUENTA_TABLE_CELL_CLASS} text-center`}>
                                  {product.quantity}
                                </TableCell>
                                <TableCell className={`${CUENTA_TABLE_CELL_CLASS} text-center`}>
                                  {product.hostess}
                                </TableCell>
                                <TableCell className={`${CUENTA_TABLE_CELL_CLASS} text-center`}>
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
                          className='flex min-w-0 flex-col overflow-hidden rounded-2xl'
                        >
                          {product.photo}
                          <CardHeader className='p-4'>
                            <CardTitle className='sr-only'>{product.name}</CardTitle>
                            {product.details}
                          </CardHeader>
                          <CardContent className='flex flex-1 flex-col gap-4 p-4 pt-0'>
                            <dl className='grid grid-cols-2 gap-3 rounded-xl bg-muted p-3'>
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
                          <CardFooter className='justify-between gap-3 border-t p-4'>
                            <span className='text-sm font-medium'>Agregar a la venta</span>
                            {product.add}
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
              className='rounded-full px-4 bg-black text-white hover:scale-110 transition-all duration-200'
            >
              Aceptar
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
