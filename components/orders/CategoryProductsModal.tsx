import {
  Dialog,
  DialogContent,
  DialogDescription,
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
}) => {
  const [currentPage, setCurrentPage] = useState(1);
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

  return (
    <Dialog open={open} onOpenChange={onClose}>
<<<<<<< HEAD
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogDescription className="sr-only">
          Selecciona productos de la categoría para agregarlos al pedido.
        </DialogDescription>
        <DialogHeader>
=======
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="flex-shrink-0 px-6 pt-6 pb-4 border-b">
>>>>>>> 1e378ec (oficina)
          <DialogTitle>
            {modalCategoria
              ? `Productos de ${modalCategoria.nombre || modalCategoria.name}`
              : "Productos"}
          </DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto px-6 py-4">
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
                          <TableHead className="text-center">AGREGAR</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {currentProductos.map((p) => {
                          const id = p.id_producto || p.id;
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
                                <Button
                                  size="icon"
                                  variant="outline"
                                  className="rounded-full bg-black text-white hover:scale-110 transition-all duration-200"
                                  onClick={() => {
                                    console.log(
                                      "Producto desde CategoryProductsModal:",
                                      p
                                    );
                                    handleAgregarProducto(p);
                                  }}
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
