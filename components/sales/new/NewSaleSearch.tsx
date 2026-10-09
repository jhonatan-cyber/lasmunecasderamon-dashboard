'use client';

import { Search, X, Plus } from 'lucide-react';
import { useState } from 'react';
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
import {
  HostessMultiSelect,
  getExplicitMaxAnfitrionas,
  getHostessLimit,
  hasCommission,
  isExpensiveDrink
} from '@/components/orders';
import { hostessAllowedForPrice } from '@/components/orders/productModalRules';
import { IndividualHostessSelect } from '@/components/shared/selects';
import { resolverVentaProducto } from '@/lib/sales/saleChoice';
import { SaleFormatQuantities } from '@/components/sales/SaleFormatQuantities';
import type { SaleChoice } from '@/lib/sales/saleChoice';
import { useConfigValue } from '@/hooks/shared/useConfigValue';
import { resolveShotMl, resolveShotMlAnfitriona } from '@/lib/business/shotMl';

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

export const NewSaleSearch = (props: NewSaleSearchProps) => {
  const [cantidadesPorFormato, setCantidadesPorFormato] = useState<Record<string, number>>({});
  const shotMl = useConfigValue<number>('bar', 'shot_ml', 50);
  return (
    <div className='space-y-4'>
      <div className='mb-4 flex flex-col items-center justify-center gap-2 sm:flex-row'>
        <div className='relative w-full max-w-xs'>
          <Search className='absolute left-3 top-1/2 h-3 w-3 -translate-y-1/2 transform text-gray-400 sm:h-4 sm:w-4' />
          <Input
            placeholder='Buscar Producto'
            value={props.searchProducto}
            onChange={e => props.setSearchProducto(e.target.value)}
            className='rounded-full py-2 pl-10 pr-20 text-sm sm:text-base'
          />
          <Button
            variant='outline'
            className='absolute right-0 top-1/2 -translate-y-1/2 rounded-full bg-black text-xs text-white sm:text-sm'
          >
            Buscar
          </Button>
        </div>
        {props.searchProducto && (
          <Button
            variant='outline'
            size='sm'
            className='rounded-full bg-black px-4 text-white'
            onClick={props.handleClearSearch}
          >
            <X className='mr-1' />
            Limpiar
          </Button>
        )}
      </div>

      {props.searchProducto && (
        <div className={`mb-4 ${CUENTA_TABLE_CARD_CLASS}`}>
          <div className='overflow-x-auto'>
            <Table className={CUENTA_TABLE_CLASS}>
              <TableHeader className={CUENTA_TABLE_HEADER_CLASS}>
                <TableRow className={CUENTA_TABLE_HEADER_ROW_CLASS}>
                  <TableHead className={CUENTA_TABLE_HEAD_CLASS}>PRODUCTO Y FORMATOS</TableHead>
                  <TableHead className={`${CUENTA_TABLE_HEAD_CLASS} text-center`}>
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
                {props.searchLoading ? (
                  <TableRow>
                    <TableCell
                      colSpan={4}
                      className={`${CUENTA_TABLE_CELL_CLASS} py-4 text-center`}
                    >
                      Buscando...
                    </TableCell>
                  </TableRow>
                ) : props.searchResults.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={4}
                      className={`${CUENTA_TABLE_CELL_CLASS} py-4 text-center text-gray-400`}
                    >
                      No hay resultados
                    </TableCell>
                  </TableRow>
                ) : (
                  props.searchResults.map(producto => {
                    const id = String(producto.id_producto || producto.id);
                    const isChampagne = props.isChampagneProduct(producto);
                    const champagneLimit = getHostessLimit(producto);
                    const sale = resolverVentaProducto(producto);
                    const shotMlCliente = resolveShotMl(producto.ml_shot, shotMl);
                    const shotMlAnfitriona = resolveShotMlAnfitriona(
                      producto.ml_shot_anfitriona,
                      shotMlCliente
                    );
                    const options = sale.opciones.map(option => ({
                      value: option.value,
                      label: `${option.nombre}${option.esShot ? ` · ${option.value === 'shot_anfitriona' ? shotMlAnfitriona : shotMlCliente} ml` : ''}`,
                      precio: option.precio,
                      comision: option.comision,
                      cantidad: cantidadesPorFormato[`${id}:${option.value}`] || 0,
                      maxCantidad: option.esShot ? 99 : Number(producto.stock_bar ?? 0)
                    }));
                    const totalCantidad = options.reduce((sum, option) => sum + option.cantidad, 0);
                    const champagneSelected = props.champagneHostessSelections[id] || [];
                    const otherSelected = props.otherProductHostessSelections[id] || [];
                    const botellaConComision = hasCommission(producto) || sale.comisionBotella > 0;
                    const shotConComision = options.some(
                      option => option.value !== 'botella' && option.comision > 0
                    );
                    const muestraAnfitriona =
                      isChampagne ||
                      shotConComision ||
                      botellaConComision ||
                      hostessAllowedForPrice(sale.precioBotella);
                    const maxHostesses = isChampagne
                      ? champagneLimit
                      : isExpensiveDrink(producto)
                        ? Math.max(1, totalCantidad)
                        : (getExplicitMaxAnfitrionas(producto) ?? 1);
                    const selectedHostesses = isChampagne ? champagneSelected : otherSelected;
                    const onAdd = () =>
                      options
                        .filter(option => option.cantidad > 0)
                        .forEach(option => {
                          props.handleAddProducto({
                            ...producto,
                            tipo_venta: option.value === 'botella' ? 'botella' : 'shot',
                            shot_anfitriona: option.value === 'shot_anfitriona',
                            precio: option.precio,
                            comision: option.comision,
                            cantidad: option.cantidad,
                            selectedHostesses,
                            isChampagne
                          });
                          setCantidadesPorFormato(prev => ({
                            ...prev,
                            [`${id}:${option.value}`]: 0
                          }));
                        });
                    return (
                      <TableRow key={id} className={CUENTA_TABLE_ROW_CLASS}>
                        <TableCell className={`${CUENTA_TABLE_CELL_CLASS} min-w-[340px]`}>
                          <div className='font-semibold'>{producto.nombre}</div>
                          {Number(producto.ml_abierta ?? 0) > 0 && (
                            <p className='text-xs font-medium text-amber-600 dark:text-amber-400'>
                              Botella abierta: {Number(producto.ml_abierta)} ml · ≈
                              {Math.floor(Number(producto.ml_abierta) / Math.max(shotMlCliente, 1))}{' '}
                              shots
                            </p>
                          )}
                          <SaleFormatQuantities
                            options={options}
                            onChange={(value: SaleChoice, cantidad) =>
                              setCantidadesPorFormato(prev => ({
                                ...prev,
                                [`${id}:${value}`]: cantidad
                              }))
                            }
                          />
                          <p className='mt-1 text-[10px] text-muted-foreground'>
                            Disponibles en bar: {producto.stock_bar ?? 0}
                          </p>
                        </TableCell>
                        <TableCell className={`${CUENTA_TABLE_CELL_CLASS} text-center text-xs`}>
                          {producto.categoria}
                        </TableCell>
                        <TableCell
                          className={`${CUENTA_TABLE_CELL_CLASS} min-w-[190px] text-center`}
                        >
                          {!muestraAnfitriona ? (
                            <span className='text-xs text-gray-400'>Sin comisión</span>
                          ) : isChampagne ? (
                            <div className='space-y-2'>
                              <HostessMultiSelect
                                anfitrionas={props.anfitrionas.filter(
                                  h => h.status === 1 || h.status === 2
                                )}
                                value={champagneSelected}
                                onChange={ids => props.handleChampagneHostessChange(id, ids)}
                                searchValue={props.hostessSearchValues[id] || ''}
                                onSearchChange={val =>
                                  props.setHostessSearchValues((prev: any) => ({
                                    ...prev,
                                    [id]: val
                                  }))
                                }
                                maxSelection={champagneLimit}
                              />
                              <div className='text-xs text-gray-500'>
                                {champagneSelected.length} de {champagneLimit} seleccionadas
                              </div>
                            </div>
                          ) : isExpensiveDrink(producto) ? (
                            <HostessMultiSelect
                              anfitrionas={props.anfitrionas.filter(
                                h => h.status === 1 || h.status === 2
                              )}
                              value={otherSelected}
                              onChange={ids => props.handleOtherProductHostessChange(id, ids)}
                              searchValue={props.hostessSearchValues[id] || ''}
                              onSearchChange={val =>
                                props.setHostessSearchValues((prev: any) => ({
                                  ...prev,
                                  [id]: val
                                }))
                              }
                              maxSelection={maxHostesses}
                            />
                          ) : (
                            <IndividualHostessSelect
                              anfitrionas={props.anfitrionas.filter(
                                h => h.status === 1 || h.status === 2
                              )}
                              value={otherSelected[0] || ''}
                              onChange={val =>
                                props.handleOtherProductHostessChange(id, val ? [val] : [])
                              }
                            />
                          )}
                        </TableCell>
                        <TableCell className={`${CUENTA_TABLE_CELL_CLASS} text-center`}>
                          <Button
                            size='icon'
                            aria-label={`Agregar ${producto.nombre}`}
                            className='rounded-full bg-black text-white transition-all duration-200 hover:scale-110 disabled:opacity-40'
                            onClick={onAdd}
                            disabled={totalCantidad === 0}
                          >
                            <Plus className='h-4 w-4' />
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
