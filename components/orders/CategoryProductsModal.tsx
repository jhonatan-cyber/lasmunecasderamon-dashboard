import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Plus, Minus } from "lucide-react";
import React, { useState, useEffect } from "react";
import { formatCurrencyNoDecimals } from "@/lib/formatters";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import HostessMultiSelect from "@/components/orders/HostessMultiSelect";
import IndividualHostessSelect from "@/components/ui/IndividualHostessSelect";
import Paginate from "@/components/ui/paginate";

interface CategoryProductsModalProps {
  open: boolean;
  onClose: () => void;
  loading: boolean;
  productosCategoria: any[];
  cantidades: { [key: string]: number };
  handleCantidadChange: (id: string, value: string) => void;
  handleAgregarProducto: (producto: any) => void;
  modalCategoria: any;
  anfitrionas: any[]; // Todas las anfitrionas disponibles
  champagneHostessSelections: { [key: string]: string[] };
  onChampagneHostessChange: (productId: string, hostessIds: string[]) => void;
  otherProductHostessSelections: { [key: string]: string[] }; // Cambiado a array para bebidas múltiples
  onOtherProductHostessChange: (productId: string, hostessIds: string[]) => void; // Cambiado a array
  productosEnCarrito: any[]; // NUEVO: Productos ya agregados al pedido
  habitaciones: any[]; // Habitaciones disponibles para asignar a productos
  roomSelections: { [key: string]: string }; // Selección actual de habitaciones por producto
  onRoomChange: (productId: string, roomId: string) => void; // Callback cuando cambia la habitación de un producto
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
}) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [hostessSearchValues, setHostessSearchValues] = useState<{ [key: string]: string }>({});
  const itemsPerPage = 5;

  // Resetear página cuando se abre el modal o cambian los productos
  useEffect(() => {
    setCurrentPage(1);
  }, [open, productosCategoria]);

  // Calcular productos para la página actual
  const totalPages = Math.ceil((productosCategoria?.length || 0) / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentProductos = productosCategoria?.slice(startIndex, endIndex) || [];

  // Función para verificar si un producto es champaña
  const isChampagneProduct = (producto: any) => {
    const categoria = (producto.categoria || producto.category_name || "").toLowerCase();
    return categoria.includes("champaña") || categoria.includes("shampaña") || categoria.includes("champagne");
  };

  // Función para verificar si un producto tiene comisión
  const hasCommission = (producto: any) => {
    return (producto.comision || producto.commission || 0) > 0;
  };

  // Obtener anfitrionas disponibles (todas las anfitrionas que llegan)
  const availableHostesses = anfitrionas || [];

  // Obtener todas las anfitrionas ya asignadas a cualquier producto (incluyendo las del carrito)
  const getAllAssignedHostesses = () => {
    // Anfitrionas del modal actual
    const champagneAssigned = Object.values(champagneHostessSelections).flat();
    const otherProductsAssigned = Object.values(otherProductHostessSelections).flat();

    // Anfitrionas de productos ya en el carrito/tabla
    const carritoAssigned = productosEnCarrito.flatMap(producto => {
      if (producto.selectedHostesses && Array.isArray(producto.selectedHostesses)) {
        return producto.selectedHostesses;
      }
      return [];
    });

    const allAssigned = [...champagneAssigned, ...otherProductsAssigned, ...carritoAssigned];
    return allAssigned;
  };

  // Función para obtener anfitrionas disponibles para champañas (excluyendo las ya asignadas a cualquier producto)
  const getAvailableHostessesForChampagne = (currentProductId: string) => {
    const allAssignedHostesses = getAllAssignedHostesses();
    const currentSelection = champagneHostessSelections[currentProductId] || [];

    const filtered = availableHostesses.filter(h => {
      const hostessId = String(h.id || h.id_usuario);

      // Incluir si está en la selección actual del producto
      if (currentSelection.includes(hostessId)) {
        return true;
      }

      // Excluir si está asignada a cualquier otro producto
      if (allAssignedHostesses.includes(hostessId)) {
        return false;
      }

      return true;
    });

    return filtered;
  };

  // Función para obtener anfitrionas disponibles para bebidas (excluyendo las ya asignadas a cualquier producto)
  const getAvailableHostessesForOtherProducts = (currentProductId: string) => {
    const allAssignedHostesses = getAllAssignedHostesses();
    const currentSelection = otherProductHostessSelections[currentProductId] || [];

    const filtered = availableHostesses.filter(h => {
      const hostessId = String(h.id || h.id_usuario);

      // Incluir si está en la selección actual del producto
      if (currentSelection.includes(hostessId)) {
        return true;
      }

      // Excluir si está asignada a cualquier otro producto
      if (allAssignedHostesses.includes(hostessId)) {
        return false;
      }

      return true;
    });

    return filtered;
  };

  // Verificar si hay productos con comisión en la categoría actual
  // Solo después de que los productos estén cargados
  const hasProductsWithCommission = !loading && productosCategoria?.some(p => {
    return (p.comision || p.commission || 0) > 0;
  });

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[95vh] flex flex-col p-0">
        <DialogHeader className="flex-shrink-0 px-6 pt-6 pb-4 border-b">
          <DialogTitle>
            {modalCategoria
              ? `Productos de ${modalCategoria.nombre || modalCategoria.name}`
              : "Productos"}
          </DialogTitle>
          {!loading && hasProductsWithCommission && (
            <div className="text-xs text-gray-700 dark:text-gray-200 mt-2 p-2 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded">
              <strong className="text-gray-900 dark:text-gray-100">Reglas de asignación:</strong>
              <br />• <span className="text-purple-600 dark:text-purple-400 font-medium">Champañas</span>: Selecciona múltiples anfitrionas (límite según precio)
              <br />• <span className="text-green-600 dark:text-green-400 font-medium">Bebidas</span>: Una anfitriona por bebida
            </div>
          )}
        </DialogHeader>
        <div className="flex-1 overflow-y-auto px-6 py-4 pb-8">
          {loading ? (
            <div className="text-center text-gray-400 py-8 flex justify-center items-center">
              Cargando productos...
            </div>
          ) : (
            <div className="w-full">
              {!Array.isArray(productosCategoria) || productosCategoria.length === 0 ? (
                <div className="text-center text-gray-400 py-8 w-full">
                  No hay productos en esta categoría.
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>PRODUCTO</TableHead>
                          <TableHead className="text-center">PRECIO</TableHead>
                          <TableHead className="text-center">COMISIÓN</TableHead>
                          <TableHead className="text-center">CANTIDAD</TableHead>
                          <TableHead className="text-center">ANFITRIONA</TableHead>
                          <TableHead className="text-center">AGREGAR</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {currentProductos.map((p) => {
                          const id = String(p.id_producto || p.id);
                          const isChampagne = isChampagneProduct(p);
                          const hasComm = hasCommission(p);

                          return (
                            <TableRow key={id}>
                              <TableCell>{p.nombre || p.name}</TableCell>
                              <TableCell className="text-center">
                                {formatCurrencyNoDecimals(p.price || p.precio)}
                              </TableCell>
                              <TableCell className="text-center">
                                {formatCurrencyNoDecimals(
                                  p.commission || p.comision || 0
                                )}
                              </TableCell>
                              <TableCell className="text-center">
                                <div className="flex items-center justify-center gap-2">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                      const currentCantidad = cantidades[id] || 1;
                                      if (currentCantidad > 1) {
                                        handleCantidadChange(
                                          id,
                                          (currentCantidad - 1).toString()
                                        );
                                      }
                                    }}
                                    className="w-6 h-6 p-0 rounded-full hover:scale-105 transition-all duration-200"
                                    disabled={(cantidades[id] || 1) <= 1}
                                  >
                                    <Minus className="h-3 w-3" />
                                  </Button>
                                  <span className="w-8 text-center">
                                    {cantidades[id] || 1}
                                  </span>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                      const currentCantidad = cantidades[id] || 1;
                                      handleCantidadChange(
                                        id,
                                        (currentCantidad + 1).toString()
                                      );
                                    }}
                                    className="w-6 h-6 p-0 rounded-full hover:scale-105 transition-all duration-200"
                                  >
                                    <Plus className="h-3 w-3" />
                                  </Button>
                                </div>
                              </TableCell>
                              <TableCell className="text-center">
                                {hasComm ? (
                                  isChampagne ? (
                                    // Para champañas: usar HostessMultiSelect de shadcn/ui
                                    <div className="space-y-2">
                                      <div className="w-full">
                                        <HostessMultiSelect
                                          anfitrionas={getAvailableHostessesForChampagne(id)}
                                          value={champagneHostessSelections[id] || []}
                                          onChange={(selectedIds) => {
                                            // El componente ya maneja el límite internamente
                                            onChampagneHostessChange(id, selectedIds);
                                          }}
                                          searchValue={hostessSearchValues[id] || ''}
                                          onSearchChange={(searchValue) => {
                                            setHostessSearchValues(prev => ({
                                              ...prev,
                                              [id]: searchValue
                                            }));
                                          }}
                                          maxSelection={(() => {
                                            const currentProduct = productosCategoria.find(p => String(p.id_producto || p.id) === id);
                                            const precio = Number(currentProduct?.precio || currentProduct?.price || 0);
                                            if (precio >= 240000) return 5;
                                            else if (precio >= 200000) return 4;
                                            else if (precio >= 140000) return 3;
                                            else if (precio >= 120000) return 2;
                                            return 1;
                                          })()}
                                        />
                                      </div>

                                      <div className="text-xs text-gray-500">
                                        {(() => {
                                          const currentProduct = productosCategoria.find(p => String(p.id_producto || p.id) === id);
                                          const precio = Number(currentProduct?.precio || currentProduct?.price || 0);
                                          let champagneLimit = 1;
                                          if (precio >= 240000) champagneLimit = 5;
                                          else if (precio >= 200000) champagneLimit = 4;
                                          else if (precio >= 140000) champagneLimit = 3;
                                          else if (precio >= 120000) champagneLimit = 2;

                                          const currentCount = champagneHostessSelections[id]?.length || 0;
                                          return `${currentCount} de ${champagneLimit} seleccionadas`;
                                        })()}
                                      </div>
                                    </div>
                                  ) : (
                                    // Para otras bebidas con comisión: usar IndividualHostessSelect
                                    <div className="space-y-2">
                                      <IndividualHostessSelect
                                        anfitrionas={getAvailableHostessesForOtherProducts(id)}
                                        value={otherProductHostessSelections[id]?.[0] || ''}
                                        onChange={(selectedValue) => {
                                          onOtherProductHostessChange(id, selectedValue ? [selectedValue] : []);
                                        }}
                                        placeholder={
                                          getAvailableHostessesForOtherProducts(id).length === 0
                                            ? "No hay anfitrionas disponibles"
                                            : "Seleccionar anfitriona"
                                        }
                                        className="w-full"
                                      />
                                      {otherProductHostessSelections[id]?.length > 0 ? (
                                        <div className="text-xs text-green-600 font-medium">
                                          ✓ Asignada: {(() => {
                                            const hostessId = otherProductHostessSelections[id][0];
                                            const hostess = availableHostesses.find(h => String(h.id || h.id_usuario) === hostessId);
                                            return hostess?.nick || hostess?.name || hostess?.nombre || hostessId;
                                          })()}
                                        </div>
                                      ) : (
                                        <div className="text-xs text-gray-500">
                                          {getAvailableHostessesForOtherProducts(id).length === 0
                                            ? "Todas las anfitrionas están asignadas"
                                            : "Una anfitriona por bebida"
                                          }
                                        </div>
                                      )}
                                    </div>
                                  )
                                ) : (
                                  <div className="text-xs text-gray-400">Sin comisión</div>
                                )}
                              </TableCell>
                              <TableCell className="text-center">
                                <Button
                                  size="icon"
                                  variant="outline"
                                  className="rounded-full bg-black text-white hover:scale-110 transition-all duration-200"
                                  onClick={() => {
                                    // Agregar información de anfitriona al producto
                                    const productWithExtras = {
                                      ...p,
                                      selectedHostesses: isChampagne
                                        ? champagneHostessSelections[id] || []
                                        : otherProductHostessSelections[id] || [],
                                      isChampagne: isChampagne
                                    };
                                    handleAgregarProducto(productWithExtras);
                                  }}
                                  disabled={
                                    // Validar anfitrionas si tiene comisión
                                    (hasComm && (
                                      (isChampagne && (!champagneHostessSelections[id] || champagneHostessSelections[id].length === 0)) ||
                                      (!isChampagne && (!otherProductHostessSelections[id] || otherProductHostessSelections[id].length === 0))
                                    ))
                                  }
                                >
                                  <Plus className="h-4 w-4" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Paginador */}
                  {totalPages > 1 && (
                    <div className="flex justify-center mt-4">
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
        <DialogFooter className="flex-shrink-0 border-t px-6 py-4">
          <div className="w-full flex justify-center">
            <Button
              onClick={onClose}
              variant="outline"
              size="sm"
              className="rounded-full px-4 bg-black text-white hover:scale-110 transition-all duration-200"
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
