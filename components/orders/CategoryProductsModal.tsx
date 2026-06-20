import logger from '@/lib/utils/logger';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Plus, Minus } from 'lucide-react';
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { formatCurrencyNoDecimals } from '@/lib/utils/formatters';
import { useDebounce } from 'use-debounce';
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
import { RoomSelect } from '@/components/shared/selects';
import { useRefreshOnFocus } from '@/hooks/shared';
import {
  getActiveHostesses,
  getAssignedHostessIds,
  getChampagneHostessLimit,
  hasCommission,
  isChampagneProduct
} from '@/components/orders/productModalRules';

interface CategoryProductsModalProps {
  open: boolean;
  onClose: () => void;
  loading: boolean;
  productosCategoria: any[];
  cantidades: { [key: string]: number };
  handleCantidadChange: (id: string, value: string) => void;
  handleAgregarProducto: (producto: any) => void;
  modalCategoria: any;
  anfitrionas: any[];
  champagneHostessSelections: { [key: string]: string[] };
  onChampagneHostessChange: (productId: string, hostessIds: string[]) => void;
  otherProductHostessSelections: { [key: string]: string[] };
  onOtherProductHostessChange: (productId: string, hostessIds: string[]) => void;
  productosEnCarrito: any[];
  habitaciones?: any[];
  roomSelections?: { [key: string]: string };
  onRoomChange?: (productId: string, roomId: string) => void;
}

const CategoryProductsModal: React.FC<CategoryProductsModalProps> = ({
  open,
  onClose,
  loading,
  productosCategoria,
  cantidades,
  handleCantidadChange,
  handleAgregarProducto,
  modalCategoria,
  anfitrionas,
  champagneHostessSelections,
  onChampagneHostessChange,
  otherProductHostessSelections,
  onOtherProductHostessChange,
  productosEnCarrito,
  habitaciones = [],
  roomSelections = {},
  onRoomChange = () => {}
}) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [hostessSearchValues, setHostessSearchValues] = useState<{ [key: string]: string }>({});
  const [anfitrionasDisponibles, setAnfitrionasDisponibles] = useState<any[]>([]);
  const [loadingAnfitrionas, setLoadingAnfitrionas] = useState(false);
  const [debouncedSearchValues] = useDebounce(hostessSearchValues, 300);

  const itemsPerPage = 5;

  useEffect(() => {
    setCurrentPage(1);
  }, [open, productosCategoria]);

  const refreshAvailableHostesses = useCallback(async () => {
    const hasAnyRoomSelected = Object.values(roomSelections).some(room => room && room !== '');

    if (!hasAnyRoomSelected) {
      setAnfitrionasDisponibles([]);
      return;
    }

    setLoadingAnfitrionas(true);
    try {
      const response = await fetch('/api/anfitrionas/disponibles');
      const data = await response.json();
      if (data.success) {
        setAnfitrionasDisponibles(data.data);
      }
    } catch (error) {
      logger.captureException(error, {
        context: 'CategoryProductsModal:fetchAnfitrionasDisponibles'
      });
    } finally {
      setLoadingAnfitrionas(false);
    }
  }, [roomSelections]);

  useEffect(() => {
    void refreshAvailableHostesses();
  }, [refreshAvailableHostesses]);

  useRefreshOnFocus(refreshAvailableHostesses, { enabled: open });

  const totalPages = Math.ceil((productosCategoria?.length || 0) / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentProductos = productosCategoria?.slice(startIndex, endIndex) || [];

  const requiresRoom = (producto: any) => {
    const precio = Number(producto.precio || producto.price || 0);
    const tieneComision = hasCommission(producto);
    const hayHabitacionesDisponibles = habitaciones && habitaciones.length > 0;
    return precio >= 30000 && tieneComision && hayHabitacionesDisponibles;
  };

  const availableHostesses = useMemo(
    () => getActiveHostesses(anfitrionas || []),
    [anfitrionas]
  );

  const getAllAssignedHostesses = useMemo(() => {
    return getAssignedHostessIds({
      champagneSelections: champagneHostessSelections,
      otherSelections: otherProductHostessSelections,
      cartProducts: productosEnCarrito
    });
  }, [champagneHostessSelections, otherProductHostessSelections, productosEnCarrito]);

  const getAvailableHostessesForChampagne = (currentProductId: string) => {
    const currentSelection = champagneHostessSelections[currentProductId] || [];
    const hasRoomSelected =
      roomSelections[currentProductId] && roomSelections[currentProductId] !== '';
    if (!hasRoomSelected) {
      return availableHostesses;
    }

    const filtered = availableHostesses.filter(h => {
      const hostessId = String(h.id || h.id_usuario);

      if (currentSelection.includes(hostessId)) {
        return true;
      }

      if (getAllAssignedHostesses.includes(hostessId)) {
        return false;
      }

      return true;
    });

    return filtered;
  };

  const getAvailableHostessesForOtherProducts = (currentProductId: string) => {
    const currentSelection = otherProductHostessSelections[currentProductId] || [];
    const hasRoomSelected =
      roomSelections[currentProductId] && roomSelections[currentProductId] !== '';

    logger.info(`[CategoryProductsModal] Producto ${currentProductId}:`, {
      hasRoomSelected,
      totalAnfitrionas: availableHostesses.length,
      anfitrionasEstados: availableHostesses.map(h => ({
        id: h.id || h.id_usuario,
        nick: h.nick,
        estado: h.estado || h.status
      }))
    });

    if (!hasRoomSelected) {
      logger.info(
        `[CategoryProductsModal] Sin habitacion - mostrando todas: ${availableHostesses.length}`
      );
      return availableHostesses;
    }

    const filtered = availableHostesses.filter(h => {
      const hostessId = String(h.id || h.id_usuario);

      if (currentSelection.includes(hostessId)) {
        return true;
      }

      if (getAllAssignedHostesses.includes(hostessId)) {
        return false;
      }

      return true;
    });

    logger.info(
      `[CategoryProductsModal] Con habitacion - anfitrionas filtradas: ${filtered.length}`
    );
    return filtered;
  };

  const hasProductsWithCommission = useMemo(
    () => !loading && productosCategoria?.some(p => hasCommission(p)),
    [loading, productosCategoria]
  );

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className='max-w-7xl max-h-[95vh] flex flex-col p-0'>
        <DialogHeader className='flex-shrink-0 px-6 pt-6 pb-4 border-b'>
          <DialogTitle>
            {modalCategoria
              ? `Productos de ${modalCategoria.nombre || modalCategoria.name}`
              : 'Productos'}
          </DialogTitle>
          {!loading && hasProductsWithCommission && (
            <div className='text-xs text-gray-700 dark:text-gray-200 mt-2 p-2 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded'>
              <strong className='text-gray-900 dark:text-gray-100'>Reglas de asignaciÃ³n:</strong>
              <br />â€¢{' '}
              <span className='text-purple-600 dark:text-purple-400 font-medium'>ChampaÃ±as</span>:
              Selecciona mÃºltiples anfitrionas (lÃ­mite segÃºn precio)
              <br />â€¢{' '}
              <span className='text-green-600 dark:text-green-400 font-medium'>
                Bebidas â‰¥ $30,000
              </span>
              : Hasta el mismo nÃºmero de anfitrionas que la cantidad de tragos y se puede asignar
              habitaciÃ³n para liberar anfitrionas adicionales
              <br />â€¢{' '}
              <span className='text-blue-600 dark:text-blue-400 font-medium'>
                Bebidas &lt; $30,000
              </span>
              : Una anfitriona por bebida, sin opciÃ³n de habitaciÃ³n
            </div>
          )}
        </DialogHeader>
        <div className='flex-1 overflow-y-auto px-6 py-4 pb-8'>
          {loading ? (
            <div className='text-center text-gray-400 py-8 flex justify-center items-center'>
              Cargando productos...
            </div>
          ) : (
            <div className='w-full'>
              {!Array.isArray(productosCategoria) || productosCategoria.length === 0 ? (
                <div className='text-center text-gray-400 py-8 w-full'>
                  No hay productos en esta categorÃ­a.
                </div>
              ) : (
                <>
                  <div className='overflow-x-auto'>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>PRODUCTO</TableHead>
                          <TableHead className='text-center'>PRECIO</TableHead>
                          <TableHead className='text-center'>COMISIÃ“N</TableHead>
                          <TableHead className='text-center'>CANTIDAD</TableHead>
                          <TableHead className='text-center'>HABITACIÃ“N</TableHead>
                          <TableHead className='text-center'>ANFITRIONA</TableHead>
                          <TableHead className='text-center'>AGREGAR</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {currentProductos.map(p => {
                          const id = String(p.id_producto || p.id);
                          const isChampagne = isChampagneProduct(p);
                          const hasComm = hasCommission(p);
                          const needsRoom = requiresRoom(p);

                          return (
                            <TableRow key={id}>
                              <TableCell>{p.nombre || p.name}</TableCell>
                              <TableCell className='text-center'>
                                {formatCurrencyNoDecimals(p.price || p.precio)}
                              </TableCell>
                              <TableCell className='text-center'>
                                {formatCurrencyNoDecimals(p.commission || p.comision || 0)}
                              </TableCell>
                              <TableCell className='text-center'>
                                <div className='flex items-center justify-center gap-2'>
                                  <Button
                                    size='sm'
                                    variant='outline'
                                    onClick={() => {
                                      const currentCantidad = cantidades[id] || 1;
                                      if (currentCantidad > 1) {
                                        handleCantidadChange(id, (currentCantidad - 1).toString());
                                      }
                                    }}
                                    className='w-6 h-6 p-0 rounded-full hover:scale-105 transition-all duration-200'
                                    disabled={(cantidades[id] || 1) <= 1}
                                  >
                                    <Minus className='h-3 w-3' />
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
                                    <Plus className='h-3 w-3' />
                                  </Button>
                                </div>
                              </TableCell>
                              <TableCell className='text-center'>
                                {needsRoom ? (
                                  <div className='space-y-2'>
                                    <RoomSelect
                                      habitaciones={
                                        habitaciones?.filter(
                                          h =>
                                            (h.estado === 1 || h.status === 1) &&
                                            (h.comision_anfitriona === 0 || !h.comision_anfitriona)
                                        ) || []
                                      }
                                      value={roomSelections[id] || ''}
                                      onChange={roomId => onRoomChange(id, roomId)}
                                      placeholder='Seleccionar habitaciÃ³n'
                                      className='w-full'
                                    />
                                    {roomSelections[id] && (
                                      <div className='text-xs text-green-600 font-medium'>
                                        âœ“ HabitaciÃ³n asignada
                                      </div>
                                    )}
                                  </div>
                                ) : (
                                  <div className='text-xs text-gray-400'>-</div>
                                )}
                              </TableCell>
                              <TableCell className='text-center'>
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
                                          searchValue={debouncedSearchValues[id] || ''}
                                          onSearchChange={searchValue => {
                                            setHostessSearchValues(prev => ({
                                              ...prev,
                                              [id]: searchValue
                                            }));
                                          }}
                                          maxSelection={(() => {
                                            const currentProduct = productosCategoria.find(
                                              p => String(p.id_producto || p.id) === id
                                            );
                                            const precio = Number(
                                              currentProduct?.precio || currentProduct?.price || 0
                                            );
                                            if (precio >= 240000) return 5;
                                            else if (precio >= 200000) return 4;
                                            else if (precio >= 140000) return 3;
                                            else if (precio >= 120000) return 2;
                                            return 1;
                                          })()}
                                        />
                                      </div>

                                      <div className='text-xs text-gray-500'>
                                        {(() => {
                                          const currentProduct = productosCategoria.find(
                                            p => String(p.id_producto || p.id) === id
                                          );
                                          const precio = Number(
                                            currentProduct?.precio || currentProduct?.price || 0
                                          );
                                          let champagneLimit = 1;
                                          if (precio >= 240000) champagneLimit = 5;
                                          else if (precio >= 200000) champagneLimit = 4;
                                          else if (precio >= 140000) champagneLimit = 3;
                                          else if (precio >= 120000) champagneLimit = 2;

                                          const currentCount =
                                            champagneHostessSelections[id]?.length || 0;
                                          return `${currentCount} de ${champagneLimit} seleccionadas`;
                                        })()}
                                      </div>
                                    </div>
                                  ) : (
                                    <div className='space-y-2'>
                                      {(() => {
                                        const currentProduct = productosCategoria.find(
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
                                                searchValue={debouncedSearchValues[id] || ''}
                                                onSearchChange={searchValue => {
                                                  setHostessSearchValues(prev => ({
                                                    ...prev,
                                                    [id]: searchValue
                                                  }));
                                                }}
                                                maxSelection={cantidad}
                                              />
                                              <div className='text-xs text-gray-500'>
                                                {otherProductHostessSelections[id]?.length || 0} de{' '}
                                                {cantidad} seleccionadas
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
                                                getAvailableHostessesForOtherProducts(id).length ===
                                                0
                                                  ? 'No hay anfitrionas disponibles'
                                                  : 'Seleccionar anfitriona'
                                              }
                                              className='w-full'
                                            />
                                            {otherProductHostessSelections[id]?.length > 0 ? (
                                              <div className='text-xs text-green-600 font-medium'>
                                                âœ“ Asignada:{' '}
                                                {(() => {
                                                  const hostessId =
                                                    otherProductHostessSelections[id][0];
                                                  const hostess = availableHostesses.find(
                                                    h => String(h.id || h.id_usuario) === hostessId
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
                                                  ? 'Todas las anfitrionas estÃ¡n asignadas'
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
                              <TableCell className='text-center'>
                                <Button
                                  size='icon'
                                  variant='outline'
                                  className='rounded-full bg-black text-white hover:scale-110 transition-all duration-200'
                                  onClick={() => {
                                    const productWithExtras = {
                                      ...p,
                                      selectedHostesses: isChampagne
                                        ? champagneHostessSelections[id] || []
                                        : otherProductHostessSelections[id] || [],
                                      isChampagne: isChampagne,
                                      selectedRoom: roomSelections[id] || null,
                                      requiresRoom: needsRoom
                                    };
                                    handleAgregarProducto(productWithExtras);
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
                                  <Plus className='h-4 w-4' />
                                </Button>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
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
              size='sm'
              className='rounded-full px-4 bg-black text-white hover:scale-110 transition-all duration-200'
            >
              Aceptar
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CategoryProductsModal;




