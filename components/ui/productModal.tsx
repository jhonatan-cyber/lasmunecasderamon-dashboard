/* eslint-disable */
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, ShoppingCart, Package } from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { formatCurrencyNoDecimals } from "@/lib/formatters";
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import Paginate from "@/components/ui/paginate";
import ProductSummaryCard from "./ProductSummaryCard";
import ProductStatsBar from "./ProductStatsBar";
import { ProductGridCard } from "./ProductGridCard";
import { ProductTableRow } from "./ProductTableRow";
import { useProductSelection } from "@/hooks/shared/useProductSelection";

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
  const itemsPerPage = viewMode === 'grid' ? 8 : 5;

  // Hook de selección de productos
  const {
    selectedProducts,
    handleAddToSelection,
    handleRemoveFromSelection,
    handleAddAllSelected,
    clearSelection,
    totalSelected,
    totalValue
  } = useProductSelection({
    productos,
    cantidades,
    onCantidadChange: handleCantidadChange,
    onAgregarProducto: handleAgregarProducto
  });

  // Resetear estados cuando se abre el modal
  useEffect(() => {
    if (open) {
      setCurrentPage(1);
      setSearchTerm("");
      clearSelection();
    }
  }, [open, clearSelection]);

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

  // Atajos de teclado
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key === 'a' && Object.keys(selectedProducts).length > 0) {
        e.preventDefault();
        handleAddAllSelected();
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key === 'd' && Object.keys(selectedProducts).length > 0) {
        e.preventDefault();
        clearSelection();
        return;
      }

      if (e.key === 'g' || e.key === 'G') {
        setViewMode('grid');
        return;
      }

      if (e.key === 't' || e.key === 'T') {
        setViewMode('table');
        return;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, selectedProducts, onClose, handleAddAllSelected, clearSelection]);

  const renderGridView = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {currentProductos.map((producto) => {
        const id = (producto.id_producto || producto.id).toString();
        const isSelected = !!selectedProducts[id];
        const cantidad = cantidades[id] || 1;
        
        return (
          <ProductGridCard
            key={id}
            producto={producto}
            cantidad={cantidad}
            isSelected={isSelected}
            selectedQuantity={selectedProducts[id]}
            onCantidadChange={(newCantidad) => handleCantidadChange(id, newCantidad.toString())}
            onAddToSelection={() => handleAddToSelection(producto)}
            onRemoveFromSelection={() => handleRemoveFromSelection(id)}
            onAddToCart={() => handleAgregarProducto(producto)}
          />
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
            const isSelected = !!selectedProducts[id];
            const cantidad = cantidades[id] || 1;
            
            return (
              <ProductTableRow
                key={id}
                producto={producto}
                cantidad={cantidad}
                isSelected={isSelected}
                selectedQuantity={selectedProducts[id]}
                onCantidadChange={(newCantidad) => handleCantidadChange(id, newCantidad.toString())}
                onAddToSelection={() => handleAddToSelection(producto)}
                onRemoveFromSelection={() => handleRemoveFromSelection(id)}
                onAddToCart={() => handleAgregarProducto(producto)}
              />
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
                  {totalSelected} seleccionados
                </Badge>
                <Button
                  onClick={handleAddAllSelected}
                  size="sm"
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <ShoppingCart className="w-4 h-4 mr-1" />
                  Agregar Todos ({formatCurrencyNoDecimals(totalValue)})
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
                  onClearSelection={clearSelection}
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
                  {totalSelected} productos seleccionados
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
                  onClick={clearSelection}
                  variant="outline"
                  size="sm"
                  className="text-red-600 hover:text-red-700 hover:bg-red-50 rounded-full"
                  title="Ctrl+D para limpiar"
                >
                  Limpiar Selección
                </Button>
              )}
              <Button
                onClick={onClose}
                variant="outline"
                size="sm"
                className="px-6 rounded-full"
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
