'use client';

import { Search, X, Plus } from 'lucide-react';
import { Input } from '@/components/ui/input';
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
import { useState } from 'react';
import { formatCurrencyNoDecimals } from '@/lib/utils/formatters';
import {
  HostessMultiSelect,
  getExplicitMaxAnfitrionas,
  getHostessLimit,
  hasCommission,
  isExpensiveDrink
} from '@/components/orders';
import { hostessAllowedForPrice } from '@/components/orders/productModalRules';
import { IndividualHostessSelect } from '@/components/shared/selects';
import { resolverVentaProducto, type SaleChoice } from '@/lib/sales/saleChoice';
import { QuantityStepper } from '@/components/shared/QuantityStepper';
import { useConfigValue } from '@/hooks/shared/useConfigValue';
import { resolveShotMl } from '@/lib/business/shotMl';

interface NewSaleSearchProps {
  searchProducto: string;
  setSearchProducto: (val: string) => void;
  handleClearSearch: () => void;
  searchLoading: boolean;
  searchResults: any[];
  anfitrionas: any[];
  champagneHostessSelections: { [key: string]: string[] };
  handleChampagneHostessChange: (id: string, ids: string[]) => void;
  hostessSearchValues: { [key: string]: string };
  setHostessSearchValues: any;
  otherProductHostessSelections: { [key: string]: string[] };
  handleOtherProductHostessChange: (id: string, val: string[]) => void;
  handleAddProducto: (p: any) => void;
  isChampagneProduct: (p: any) => boolean;
  cantidades: { [key: string]: number };
  handleCantidadChange: (id: string, val: string) => void;
}

export const NewSaleSearch = ({
  searchProducto,
  setSearchProducto,
  handleClearSearch,
  searchLoading,
  searchResults,
  anfitrionas,
  champagneHostessSelections,
  handleChampagneHostessChange,
  hostessSearchValues,
  setHostessSearchValues,
  otherProductHostessSelections,
  handleOtherProductHostessChange,
  handleAddProducto,
  isChampagneProduct,
  cantidades,
  handleCantidadChange
}: NewSaleSearchProps) => {
  // Forma de venta elegida por presentación: botella entera o shot, a precio de cliente
  // o de anfitriona. El buscador ofrece lo mismo que el modal de categoría.
  const [tiposVenta, setTiposVenta] = useState<{ [key: string]: SaleChoice }>({});
  // Ml por shot global de Configuraciones: sirve para estimar los shots que quedan
  // en la botella abierta. Cada presentación puede traer su propio ml_shot.
  const shotMl = useConfigValue<number>('bar', 'shot_ml', 50);
  return (
    <div className='space-y-4'>
      <div className='flex flex-col sm:flex-row items-center justify-center gap-2 mb-4'>
        <div className='relative w-full max-w-xs'>
          <Search className='absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-3 h-3 sm:w-4 sm:h-4' />
          <Input
            placeholder='Buscar Producto'
            value={searchProducto}
            onChange={e => setSearchProducto(e.target.value)}
            className='pl-10 pr-20 py-2 text-sm sm:text-base rounded-full'
          />
          <Button
            variant='outline'
            className='absolute bg-black text-white right-0 top-1/2 -translate-y-1/2 text-xs sm:text-sm rounded-full'
          >
            Buscar
          </Button>
        </div>
        {searchProducto && (
          <Button
            variant='outline'
            size='sm'
            className='rounded-full px-4 bg-black text-white'
            onClick={handleClearSearch}
          >
            <X className='mr-1' /> Limpiar
          </Button>
        )}
      </div>

      {searchProducto && (
        <div className={`mb-4 ${CUENTA_TABLE_CARD_CLASS}`}>
          <div className='overflow-x-auto'>
            <Table className={CUENTA_TABLE_CLASS}>
              <TableHeader className={CUENTA_TABLE_HEADER_CLASS}>
                <TableRow className={CUENTA_TABLE_HEADER_ROW_CLASS}>
                  <TableHead className={CUENTA_TABLE_HEAD_CLASS}>PRODUCTO</TableHead>
                  <TableHead className={`${CUENTA_TABLE_HEAD_CLASS} text-center`}>PRECIO</TableHead>
                  <TableHead className={`${CUENTA_TABLE_HEAD_CLASS} text-center`}>
                    COMISIÓN
                  </TableHead>
                  <TableHead className={`${CUENTA_TABLE_HEAD_CLASS} text-center`}>
                    CANTIDAD
                  </TableHead>
                  <TableHead className={`${CUENTA_TABLE_HEAD_CLASS} text-center text-xs`}>
                    CATEGORÍA
                  </TableHead>
                  <TableHead className={`${CUENTA_TABLE_HEAD_CLASS} text-center`}>
                    ANFITRIONA
                  </TableHead>
                  <TableHead className={`${CUENTA_TABLE_HEAD_CLASS} text-center`}>
                    AGREGAR
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {searchLoading ? (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      className={`${CUENTA_TABLE_CELL_CLASS} text-center py-4`}
                    >
                      Buscando...
                    </TableCell>
                  </TableRow>
                ) : searchResults.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      className={`${CUENTA_TABLE_CELL_CLASS} text-center py-4 text-gray-400`}
                    >
                      No hay resultados
                    </TableCell>
                  </TableRow>
                ) : (
                  searchResults.map((producto, idx) => {
                    const id = String(producto.id_producto || producto.id);
                    const isChampagne = isChampagneProduct(producto);
                    const champagneHostessLimit = getHostessLimit(producto);
                    const venta = resolverVentaProducto(producto, tiposVenta[id]);
                    const mlPorShot = resolveShotMl(producto.ml_shot, shotMl);
                    const mlAbierta = Number(producto.ml_abierta ?? 0);
                    // Cantidad pedida para esta presentación: es la que el carro recibe al
                    // agregar, y la que limita cuántas anfitrionas pide una bebida cara.
                    const cantidad = cantidades[id] || 1;
                    // Sin comisión no se pide anfitriona; la regla por precio (bebida cara)
                    // es de la botella, el shot no la hereda.
                    const pideAnfitriona = venta.esShot
                      ? venta.comision > 0
                      : hasCommission(producto) || venta.comisionBotella > 0;
                    const muestraAnfitriona =
                      pideAnfitriona ||
                      (!venta.esShot && hostessAllowedForPrice(venta.precioBotella));
                    return (
                      <TableRow key={idx} className={CUENTA_TABLE_ROW_CLASS}>
                        <TableCell className={CUENTA_TABLE_CELL_CLASS}>
                          <div>{producto.nombre}</div>
                          {mlAbierta > 0 && (
                            <p className='text-xs text-amber-600 dark:text-amber-400 font-medium'>
                              Botella abierta: {mlAbierta} ml
                              {mlPorShot > 0
                                ? ` · ≈${Math.floor(mlAbierta / mlPorShot)} shots`
                                : ''}
                            </p>
                          )}
                          {venta.tieneShot && (
                            <div className='mt-1.5 flex flex-wrap items-center gap-1.5'>
                              {venta.opciones.map(opcion => (
                                <button
                                  key={opcion.value}
                                  type='button'
                                  onClick={() =>
                                    setTiposVenta(prev => ({ ...prev, [id]: opcion.value }))
                                  }
                                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold border transition-colors ${
                                    venta.tipoVenta === opcion.value
                                      ? 'bg-black text-white border-black dark:bg-white dark:text-black dark:border-white'
                                      : 'border-neutral-300 dark:border-neutral-700 text-neutral-500'
                                  }`}
                                >
                                  {opcion.nombre} · {formatCurrencyNoDecimals(opcion.precio)}
                                </button>
                              ))}
                            </div>
                          )}
                        </TableCell>
                        <TableCell className={`${CUENTA_TABLE_CELL_CLASS} text-center`}>
                          {formatCurrencyNoDecimals(venta.precio)}
                        </TableCell>
                        <TableCell className={`${CUENTA_TABLE_CELL_CLASS} text-center`}>
                          {formatCurrencyNoDecimals(venta.comision)}
                        </TableCell>
                        <TableCell className={`${CUENTA_TABLE_CELL_CLASS} text-center`}>
                          <QuantityStepper
                            value={cantidad}
                            max={venta.maxCantidad}
                            onChange={siguiente => handleCantidadChange(id, siguiente.toString())}
                          >
                            {/* Cuánto hay en el bar, como el modal de categoría: es el tope
                                que aplica el botón de aumentar al vender botella entera. */}
                            <p className='text-[10px] whitespace-nowrap text-muted-foreground'>
                              Disponibles en bar: {producto.stock_bar ?? 0}
                            </p>
                          </QuantityStepper>
                        </TableCell>
                        <TableCell className={`${CUENTA_TABLE_CELL_CLASS} text-center text-xs`}>
                          {producto.categoria}
                        </TableCell>
                        <TableCell className={`${CUENTA_TABLE_CELL_CLASS} text-center`}>
                          {muestraAnfitriona ? (
                            isChampagne ? (
                              <div className='space-y-2'>
                                <HostessMultiSelect
                                  anfitrionas={anfitrionas.filter(
                                    h => h.status === 1 || h.status === 2
                                  )}
                                  value={champagneHostessSelections[id] || []}
                                  onChange={ids => handleChampagneHostessChange(id, ids)}
                                  searchValue={hostessSearchValues[id] || ''}
                                  onSearchChange={val =>
                                    setHostessSearchValues((prev: any) => ({ ...prev, [id]: val }))
                                  }
                                  maxSelection={champagneHostessLimit}
                                />
                                <div className='text-xs text-gray-500'>
                                  {(champagneHostessSelections[id] || []).length} de{' '}
                                  {champagneHostessLimit} seleccionadas
                                </div>
                              </div>
                            ) : (
                              (() => {
                                if (isExpensiveDrink(producto)) {
                                  // Botella cara: tantas anfitrionas como unidades, salvo máximo
                                  // explícito por producto (Configuraciones > Comisiones).
                                  const maxExplicito = getExplicitMaxAnfitrionas(producto ?? {});
                                  const limiteAnfitrionas = maxExplicito
                                    ? Math.min(cantidad, maxExplicito)
                                    : cantidad;
                                  return (
                                    <div className='space-y-2'>
                                      <HostessMultiSelect
                                        anfitrionas={anfitrionas.filter(
                                          h => h.status === 1 || h.status === 2
                                        )}
                                        value={otherProductHostessSelections[id] || []}
                                        onChange={ids => handleOtherProductHostessChange(id, ids)}
                                        searchValue={hostessSearchValues[id] || ''}
                                        onSearchChange={val =>
                                          setHostessSearchValues((prev: any) => ({
                                            ...prev,
                                            [id]: val
                                          }))
                                        }
                                        maxSelection={limiteAnfitrionas}
                                      />
                                      <div className='text-xs text-gray-500'>
                                        {(otherProductHostessSelections[id] || []).length} de{' '}
                                        {limiteAnfitrionas} seleccionadas
                                      </div>
                                    </div>
                                  );
                                }

                                return (
                                  <IndividualHostessSelect
                                    anfitrionas={anfitrionas.filter(
                                      h => h.status === 1 || h.status === 2
                                    )}
                                    value={otherProductHostessSelections[id]?.[0] || ''}
                                    onChange={val =>
                                      handleOtherProductHostessChange(id, val ? [val] : [])
                                    }
                                  />
                                );
                              })()
                            )
                          ) : (
                            <span className='text-gray-400 text-xs'>Sin comisión</span>
                          )}
                        </TableCell>
                        <TableCell className={`${CUENTA_TABLE_CELL_CLASS} text-center`}>
                          <Button
                            size='icon'
                            aria-label='Agregar producto'
                            className='bg-black text-white rounded-full hover:scale-110 transition-all duration-200'
                            onClick={() =>
                              handleAddProducto({
                                ...producto,
                                // El shot se sirve por ml y puede cobrarse a precio de
                                // anfitriona: viaja marcado para separarlo en reportes y caja.
                                tipo_venta: venta.esShot ? 'shot' : 'botella',
                                shot_anfitriona: venta.tipoVenta === 'shot_anfitriona',
                                ...(venta.esShot
                                  ? { precio: venta.precio, comision: venta.comision }
                                  : {}),
                                selectedHostesses: isChampagne
                                  ? champagneHostessSelections[id] || []
                                  : otherProductHostessSelections[id] || []
                              })
                            }
                            disabled={
                              pideAnfitriona &&
                              ((isChampagne && !champagneHostessSelections[id]?.length) ||
                                (!isChampagne && !otherProductHostessSelections[id]?.length))
                            }
                          >
                            <Plus className='w-4 h-4' />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
    </div>
  );
};
