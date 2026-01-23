import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Minus, Search, ShoppingCart, X, Package, DollarSign, Coins } from "lucide-react";
import { useState, useEffect, useMemo } from "react";
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
import ProductSummaryCard from "./ProductSummaryCard";
import ProductStatsBar from "./ProductStatsBar";

interface SaleProductModalProps {
  open: boolean;
  onClose: () => void;
  loading: boolean;
  productos: any[];
  cantidades: { [key: string]: number };
  handleCantidadChange: (id: string, value: string) => void;
  handleAgregarProducto: (producto: any) => void;
  categoria: any;
}

type ViewMode = 'grid' | 'table';

export default function SaleProductModal({
  open,
  onClose,
  loading,
  productos,
  cantidades,
  handleCantidadChange,
  handleAgregarProducto,
  categoria,
}: SaleProductModalProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [selectedProducts, setSelectedProducts] = useState<{[key: string]: number}>({});
  const itemsPerPage = viewMode === 'grid' ? 8 : 5;

  // Resetear estados cuando se abre el modal
  useEffect(() => {
    if (open) {
      setCurrentPage(1);
      setSearchTerm("");
      setSelectedProducts({});
    }
  }, [open]);

  // Filtrar productos por búsqueda
  const filteredProductos = useMemo(() => {
    if (!searchTerm) return productos || [];
    
    return productos?.filter(p => 
      (p.nombre || p.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.codigo || p.code || '').toLowerCase().includes(searchTerm.toLowerCase())
    ) || [];
  }, [productos, searchTerm]);

  // Calcular productos para la página actual
  const totalPages = Math.ceil(filteredProductos.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentProductos = filteredProductos.slice(startIndex, endIndex);

  // Resetear página cuando cambia la búsqueda
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const handleAddToSelection = (producto: any) => {
    const id = producto.id_producto || producto.id;
    const cantidad = cantidades[id] || 1;
    setSelectedProducts(prev => ({
      ...prev,
      [id]: cantidad
    }));
  };

  const handleRemoveFromSelection = (id: string) => {
    setSelectedProducts(prev => {
      const newSelection = { ...prev };
      delete newSelection[id];
      return newSelection;
    });
  };

  const handleAddAllSelected = () => {
    Object.entries(selectedProducts).forEach(([id, cantidad]) => {
      const producto = productos?.find(p => (p.id_producto || p.id).toString() === id);
      if (producto) {
        // Actualizar cantidad antes de agregar
        handleCantidadChange(id, cantidad.toString());
        handleAgregarProducto(producto);
      }
    });
    setSelectedProducts({});
  };

  const getTotalSelected = () => {
    return Object.values(selectedProducts).reduce((sum, cantidad) => sum + cantidad, 0);
  };

  const getTotalValue = () => {
    return Object.entries(selectedProducts).reduce((sum, [id, cantidad]) => {
      const producto = productos?.find(p => (p.id_producto || p.id).toString() === id);
      if (producto) {
        return sum + (producto.precio || producto.price || 0) * cantidad;
      }
      return sum;
    }, 0);
  };

  // Atajos de teclado
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Escape para cerrar
      if (e.key === 'Escape') {
        onClose();
        return;
      }

      // Ctrl/Cmd + A para agregar todos los seleccionados
      if ((e.ctrlKey || e.metaKey) && e.key === 'a' && Object.keys(selectedProducts).length > 0) {
        e.preventDefault();
        handleAddAllSelected();
        return;
      }

      // Ctrl/Cmd + D para limpiar selección
      if ((e.ctrlKey || e.metaKey) && e.key === 'd' && Object.keys(selectedProducts).length > 0) {
        e.preventDefault();
        setSelectedProducts({});
        return;
      }

      // G para cambiar a vista de cuadrícula
      if (e.key === 'g' || e.key === 'G') {
        setViewMode('grid');
        return;
      }

      // T para cambiar a vista de tabla
      if (e.key === 't' || e.key === 'T') {
        setViewMode('table');
        return;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, selectedProducts, onClose, handleAddAllSelected]);

  const renderGridView = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {currentProductos.map((producto) => {
        const id = (producto.id_producto || producto.id).toString();
        const isSelected = selectedProducts[id];
        const cantidad = cantidades[id] || 1;
        
        return (
          <Card 
            key={id} 
            className={`transition-all duration-200 hover:shadow-lg ${
              isSelected ? 'ring-2 ring-blue-500 bg-blue-50' : 'hover:shadow-md'
            }`}
          >
            <CardContent className="p-4">
              <div className="space-y-3">
                {/* Header del producto */}
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-semibold text-sm line-clamp-2">
                      {producto.nombre || producto.name}
                    </h3>
                    {(producto.codigo || producto.code) && (
                      <p className="text-xs text-gray-500 mt-1">
                        {producto.codigo || producto.code}
                      </p>
                    )}
                  </div>
                  {isSelected && (
                    <Badge variant="secondary" className="ml-2 text-xs">
                      {selectedProducts[id]}
                    </Badge>
                  )}
                </div>

                {/* Precios */}
                <div className="space-y-1">
                  <div className="flex items-center gap-1">
                    <DollarSign className="w-3 h-3 text-green-600" />
                    <span className="text-sm font-medium text-green-600">
                      {formatCurrencyNoDecimals(producto.precio || producto.price)}
                    </span>
                  </div>
                  {(producto.comision || producto.commission) > 0 && (
                    <div className="flex items-center gap-1">
                      <Coins className="w-3 h-3 text-orange-600" />
                      <span className="text-xs text-orange-600">
                        Comisión: {formatCurrencyNoDecimals(producto.comision || producto.commission)}
                      </span>
                    </div>
                  )}
                </div>

                {/* Controles de cantidad */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        if (cantidad > 1) {
                          handleCantidadChange(id, (cantidad - 1).toString());
                        }
                      }}
                      className="w-6 h-6 p-0 rounded-full"
                      disabled={cantidad <= 1}
                    >
                      <Minus className="w-3 h-3" />
                    </Button>
                    <span className="w-8 text-center text-sm font-medium">
                      {cantidad}
                    </span>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        handleCantidadChange(id, (cantidad + 1).toString());
                      }}
                      className="w-6 h-6 p-0 rounded-full"
                    >
                      <Plus className="w-3 h-3" />
                    </Button>
                  </div>

                  {/* Botones de acción */}
                  <div className="flex gap-1">
                    {isSelected ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleRemoveFromSelection(id)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleAddToSelection(producto)}
                        className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                      >
                        <Plus className="w-3 h-3" />
                      </Button>
                    )}
                    <Button
                      size="sm"
                      onClick={() => handleAgregarProducto(producto)}
                      className="bg-black text-white hover:bg-gray-800"
                    >
                      <ShoppingCart className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );

  const renderTableView = () => (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>PRODUCTO</TableHead>
            <TableHead className="text-center">PRECIO</TableHead>
            <TableHead className="text-center">COMISIÓN</TableHead>
            <TableHead className="text-center">CANTIDAD</TableHead>
            <TableHead className="text-center">ACCIONES</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {currentProductos.map((producto) => {
            const id = (producto.id_producto || producto.id).toString();
            const isSelected = selectedProducts[id];
            const cantidad = cantidades[id] || 1;
            
            return (
              <TableRow 
                key={id} 
                className={isSelected ? 'bg-blue-50' : ''}
              >
                <TableCell>
                  <div className="flex items-center gap-2">
                    {isSelected && (
                      <Badge variant="secondary" className="text-xs">
                        {selectedProducts[id]}
                      </Badge>
                    )}
                    <div>
                      <div className="font-medium">{producto.nombre || producto.name}</div>
                      {(producto.codigo || producto.code) && (
                        <div className="text-xs text-gray-500">
                          {producto.codigo || producto.code}
                        </div>
                      )}
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-center">
                  <span className="text-green-600 font-medium">
                    {formatCurrencyNoDecimals(producto.precio || producto.price)}
                  </span>
                </TableCell>
                <TableCell className="text-center">
                  <span className="text-orange-600">
                    {formatCurrencyNoDecimals(producto.comision || producto.commission || 0)}
                  </span>
                </TableCell>
                <TableCell className="text-center">
                  <div className="flex items-center justify-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        if (cantidad > 1) {
                          handleCantidadChange(id, (cantidad - 1).toString());
                        }
                      }}
                      className="w-6 h-6 p-0 rounded-full"
                      disabled={cantidad <= 1}
                    >
                      <Minus className="w-3 h-3" />
                    </Button>
                    <span className="w-8 text-center font-medium">
                      {cantidad}
                    </span>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        handleCantidadChange(id, (cantidad + 1).toString());
                      }}
                      className="w-6 h-6 p-0 rounded-full"
                    >
                      <Plus className="w-3 h-3" />
                    </Button>
                  </div>
                </TableCell>
                <TableCell className="text-center">
                  <div className="flex items-center justify-center gap-1">
                    {isSelected ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleRemoveFromSelection(id)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleAddToSelection(producto)}
                        className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                      >
                        <Plus className="w-3 h-3" />
                      </Button>
                    )}
                    <Button
                      size="sm"
                      onClick={() => handleAgregarProducto(producto)}
                      className="bg-black text-white hover:bg-gray-800"
                    >
                      <ShoppingCart className="w-3 h-3" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[95vh] flex flex-col p-0">
        <DialogHeader className="flex-shrink-0 px-6 pt-6 pb-4 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Package className="w-5 h-5 text-blue-600" />
              <DialogTitle className="text-lg">
                {categoria
                  ? `Productos de ${categoria.nombre || categoria.name}`
                  : "Productos"}
              </DialogTitle>
              {filteredProductos.length > 0 && (
                <Badge variant="outline" className="ml-2">
                  {filteredProductos.length} productos
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant={viewMode === 'grid' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('grid')}
                className="text-xs"
              >
                Cuadrícula
              </Button>
              <Button
                variant={viewMode === 'table' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('table')}
                className="text-xs"
              >
                Tabla
              </Button>
            </div>
          </div>
        </DialogHeader>

        {/* Barra de búsqueda y filtros */}
        <div className="flex-shrink-0 px-6 py-4 border-b bg-gray-50 space-y-3">
          <div className="flex items-center gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Buscar productos por nombre o código..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            {Object.keys(selectedProducts).length > 0 && (
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="px-3 py-1">
                  {getTotalSelected()} seleccionados
                </Badge>
                <Button
                  onClick={handleAddAllSelected}
                  size="sm"
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <ShoppingCart className="w-4 h-4 mr-1" />
                  Agregar Todos ({formatCurrencyNoDecimals(getTotalValue())})
                </Button>
              </div>
            )}
          </div>
          
          {/* Barra de estadísticas */}
          <ProductStatsBar 
            productos={productos || []}
            filteredCount={filteredProductos.length}
            searchTerm={searchTerm}
          />
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="flex gap-4 h-full">
            {/* Panel principal de productos */}
            <div className="flex-1 px-6 py-4">
              {loading ? (
                <div className="text-center text-gray-400 py-12 flex flex-col items-center gap-3">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-400"></div>
                  <p>Cargando productos...</p>
                </div>
              ) : filteredProductos.length === 0 ? (
                <div className="text-center text-gray-400 py-12 flex flex-col items-center gap-3">
                  <Package className="w-12 h-12 text-gray-300" />
                  <div>
                    <p className="text-lg font-medium">No hay productos disponibles</p>
                    {searchTerm && (
                      <p className="text-sm mt-1">
                        No se encontraron productos que coincidan con "{searchTerm}"
                      </p>
                    )}
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {viewMode === 'grid' ? renderGridView() : renderTableView()}

                  {/* Paginador */}
                  {totalPages > 1 && (
                    <div className="flex justify-center pt-4">
                      <Paginate
                        page={currentPage}
                        totalPages={totalPages}
                        setPage={setCurrentPage}
                      />
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Panel lateral de resumen */}
            {Object.keys(selectedProducts).length > 0 && (
              <div className="w-80 border-l bg-gray-50 p-4">
                <ProductSummaryCard
                  selectedProducts={selectedProducts}
                  productos={productos}
                  onRemoveProduct={handleRemoveFromSelection}
                  onAddAllSelected={handleAddAllSelected}
                  onClearSelection={() => setSelectedProducts({})}
                />
              </div>
            )}
          </div>
        </div>

        {/* Footer con estadísticas y botones */}
        <div className="flex-shrink-0 border-t px-6 py-4 bg-gray-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4 text-sm text-gray-600">
              <span>
                Mostrando {Math.min(startIndex + 1, filteredProductos.length)} - {Math.min(endIndex, filteredProductos.length)} de {filteredProductos.length}
              </span>
              {Object.keys(selectedProducts).length > 0 && (
                <span className="text-blue-600 font-medium">
                  {getTotalSelected()} productos seleccionados
                </span>
              )}
              <div className="hidden md:flex items-center gap-2 text-xs text-gray-400">
                <kbd className="px-1 py-0.5 bg-gray-200 rounded text-xs">G</kbd>
                <span>Cuadrícula</span>
                <kbd className="px-1 py-0.5 bg-gray-200 rounded text-xs">T</kbd>
                <span>Tabla</span>
                {Object.keys(selectedProducts).length > 0 && (
                  <>
                    <kbd className="px-1 py-0.5 bg-gray-200 rounded text-xs">Ctrl+A</kbd>
                    <span>Agregar todos</span>
                  </>
                )}
              </div>
            </div>
            <div className="flex gap-2">
              {Object.keys(selectedProducts).length > 0 && (
                <Button
                  onClick={() => setSelectedProducts({})}
                  variant="outline"
                  size="sm"
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  title="Ctrl+D para limpiar"
                >
                  Limpiar Selección
                </Button>
              )}
              <Button
                onClick={onClose}
                variant="outline"
                size="sm"
                className="px-6"
                title="Escape para cerrar"
              >
                Cerrar
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}