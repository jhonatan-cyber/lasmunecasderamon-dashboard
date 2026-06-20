import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Plus, Minus } from 'lucide-react';
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
  const [currentPage, setCurrentPage] = useState(1);
  const [hostessSearchValues, setHostessSearchValues] = useState<{ [key: string]: string }>({});
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

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className='max-w-4xl max-h-[90vh] flex flex-col p-0'>
        <DialogHeader className='flex-shrink-0 px-6 pt-6 pb-4 border-b'>
          <DialogTitle>
            {categoria ? `Productos de ${categoria.nombre || categoria.name}` : 'Productos'}
          </DialogTitle>
        </DialogHeader>
        <div className='flex-1 overflow-y-auto px-6 py-4'>
          {loading ? (
            <div className='text-center text-gray-400 py-8 flex justify-center items-center'>
              Cargando productos...
            </div>
          ) : (
            <div className='w-full'>
              {!Array.isArray(productos) || productos.length === 0 ? (
                <div className='text-center text-gray-400 py-8 w-full'>
                  No hay productos en esta categorÃ­a.
                </div>
              ) : (
                <>
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
                              ComisiÃ³n
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
                          {currentProductos.map((p, index) => {
                            const id = String(p.id_producto || p.id);
                            const isChampagne = isChampagneProduct(p);
                            const hasComm = hasCommission(p);
                            const champagneHostessLimit = getChampagneHostessLimit(p);

                            return (
                              <TableRow
                                key={id}
                                className={`${CUENTA_TABLE_ROW_CLASS} ${index === 0 ? 'first:rounded-t-xl' : ''} ${index === currentProductos.length - 1 ? 'last:rounded-b-xl' : ''}`}
                              >
                                <TableCell className={CUENTA_TABLE_CELL_CLASS}>
                                  <div className='font-medium'>{p.nombre || p.name}</div>
                                </TableCell>
                                <TableCell className={`${CUENTA_TABLE_CELL_CLASS} text-center`}>
                                  {formatCurrencyNoDecimals(p.price || p.precio)}
                                </TableCell>
                                <TableCell className={`${CUENTA_TABLE_CELL_CLASS} text-center`}>
                                  {formatCurrencyNoDecimals(p.commission || p.comision || 0)}
                                </TableCell>
                                <TableCell className={`${CUENTA_TABLE_CELL_CLASS} text-center`}>
                                  <div className='flex items-center justify-center gap-2'>
                                    <Button
                                      size='sm'
                                      variant='outline'
                                      onClick={() => {
                                        const currentCantidad = cantidades[id] || 1;
                                        if (currentCantidad > 1) {
                                          handleCantidadChange(
                                            id,
                                            (currentCantidad - 1).toString()
                                          );
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
                                      onClick={() => {
                                        const currentCantidad = cantidades[id] || 1;
                                        handleCantidadChange(id, (currentCantidad + 1).toString());
                                      }}
                                      className='w-6 h-6 p-0 rounded-full hover:scale-105 transition-all duration-200'
                                    >
                                      <Plus className='w-3 h-3' />
                                    </Button>
                                  </div>
                                </TableCell>
                                <TableCell className={`${CUENTA_TABLE_CELL_CLASS} text-center`}>
                                  {hasComm ? (
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
                                            const precio = Number(
                                              currentProduct?.precio || currentProduct?.price || 0
                                            );
                                            const currentCount =
                                              champagneHostessSelections[id]?.length || 0;
                                            return `${currentCount} de ${champagneHostessLimit} seleccionadas`;
                                          })()}
                                        </div>
                                      </div>
                                    ) : (
                                      <div className='space-y-2'>
                                        {(() => {
                                          const currentProduct = productos.find(
                                            p => String(p.id_producto || p.id) === id
                                          );
                                          const precio = Number(
                                            currentProduct?.precio || currentProduct?.price || 0
                                          );
                                          const cantidad = cantidades[id] || 1;

                                          if (precio >= 30000) {
                                            return (
                                              <>
                                                <HostessMultiSelect
                                                  anfitrionas={getAvailableHostessesForOtherProducts(
                                                    id
                                                  )}
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
                                                  {otherProductHostessSelections[id]?.length || 0}{' '}
                                                  de {cantidad} seleccionadas
                                                </div>
                                              </>
                                            );
                                          }

                                          return (
                                            <>
                                              <IndividualHostessSelect
                                                anfitrionas={getAvailableHostessesForOtherProducts(
                                                  id
                                                )}
                                                value={otherProductHostessSelections[id]?.[0] || ''}
                                                onChange={selectedValue => {
                                                  onOtherProductHostessChange(
                                                    id,
                                                    selectedValue ? [selectedValue] : []
                                                  );
                                                }}
                                                placeholder={
                                                  getAvailableHostessesForOtherProducts(id)
                                                    .length === 0
                                                    ? 'No hay anfitrionas disponibles'
                                                    : 'Seleccionar anfitriona'
                                                }
                                                className='w-full'
                                              />
                                              {otherProductHostessSelections[id]?.length > 0 ? (
                                                <div className='text-xs text-green-600 font-medium'>
                                                  ? Asignada:{' '}
                                                  {(() => {
                                                    const hostessId =
                                                      otherProductHostessSelections[id][0];
                                                    const hostess = availableHostesses.find(
                                                      h =>
                                                        String(h.id || h.id_usuario) === hostessId
                                                    );
                                                    return (
                                                      hostess?.nick ||
                                                      hostess?.name ||
                                                      hostess?.nombre ||
                                                      hostessId
                                                    );
                                                  })()}
                                                </div>
                                              ) : (
                                                <div className='text-xs text-gray-500'>
                                                  {getAvailableHostessesForOtherProducts(id)
                                                    .length === 0
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
                                    <div className='text-xs text-gray-400'>Sin comisiÃ³n</div>
                                  )}
                                </TableCell>
                                <TableCell className={`${CUENTA_TABLE_CELL_CLASS} text-center`}>
                                  <Button
                                    size='icon'
                                    variant='outline'
                                    className='rounded-full bg-black text-white hover:scale-110 transition-all duration-200'
                                    onClick={() => {
                                      const productWithHostess = {
                                        ...p,
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
                                        (!champagneHostessSelections[id] ||
                                          champagneHostessSelections[id].length === 0)) ||
                                        (!isChampagne &&
                                          (!otherProductHostessSelections[id] ||
                                            otherProductHostessSelections[id].length === 0)))
                                    }
                                  >
                                    <Plus className='w-4 h-4' />
                                  </Button>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  </div>

                  {}
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
        <DialogFooter className='flex-shrink-0 border-t px-6 py-4'>
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
