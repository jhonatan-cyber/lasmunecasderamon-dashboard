"use client";

import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, X, Plus } from "lucide-react";
import { formatCurrencyNoDecimals } from "@/lib/formatters";
import Paginate from "@/components/ui/paginate";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface ProductSearchProps {
  onAddProduct: (producto: any) => void;
  placeholder?: string;
  className?: string;
  searchOnly?: boolean;
  searchTerm?: string;
  onSearchTermChange?: (term: string) => void;
}

interface SearchResult {
  id_producto: number;
  nombre: string;
  precio: number;
  comision: number;
  categoria: string;
}

export default function ProductSearch({
  onAddProduct,
  placeholder = "Buscar Producto",
  className = "",
  searchOnly = false,
  searchTerm: externalSearchTerm,
  onSearchTermChange,
}: ProductSearchProps) {
  const [internalSearchTerm, setInternalSearchTerm] = useState("");
  const searchTerm =
    externalSearchTerm !== undefined ? externalSearchTerm : internalSearchTerm;
  const setSearchTerm = onSearchTermChange || setInternalSearchTerm;
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const searchTimeout = useRef<NodeJS.Timeout | undefined>(undefined);

  // Búsqueda en tiempo real de productos
  useEffect(() => {
    if (!searchTerm) {
      setSearchResults([]);
      setSearchLoading(false);
      return;
    }

    setSearchLoading(true);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);

    searchTimeout.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/products/search?name=${encodeURIComponent(searchTerm)}`
        );
        const data = await res.json();
        if (data.success) setSearchResults(data.data);
        else setSearchResults([]);
      } catch {
        setSearchResults([]);
      } finally {
        setSearchLoading(false);
      }
    }, 300);
  }, [searchTerm]);

  const handleClearSearch = () => {
    setSearchTerm("");
    setSearchResults([]);
    setCurrentPage(1);
  };

  const handleAddProduct = (producto: SearchResult) => {
    onAddProduct(producto);
    // Opcional: limpiar búsqueda después de agregar
    // handleClearSearch();
  };

  return (
    <>
      <div className={`${className}`}>
        {/* Barra de búsqueda */}
        <div className="flex justify-center mb-6">
          <div className="w-full max-w-md">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder={placeholder}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-20 py-2 text-sm rounded-full"
                  style={{ minWidth: 0 }}
                />
                <Button
                  variant="outline"
                  className="absolute bg-black text-white right-0 top-1/2 -translate-y-1/2 text-sm rounded-full"
                  style={{ zIndex: 2 }}
                >
                  Buscar
                </Button>
              </div>
              {searchTerm && (
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-full px-4 bg-black text-white hover:scale-105 transition-all duration-200"
                  onClick={handleClearSearch}
                >
                  <X className="w-4 h-4 mr-1" />
                  Limpiar
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Tabla de resultados de búsqueda en tiempo real - Solo si no es searchOnly */}
        {!searchOnly && searchTerm && (
          <div className="w-full p-5">
            <div className="rounded-lg overflow-hidden ">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>PRODUCTO</TableHead>
                    <TableHead>PRECIO</TableHead>
                    <TableHead>COMISIÓN</TableHead>
                    <TableHead>CATEGORÍA</TableHead>
                    <TableHead className="text-center">AGREGAR</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {searchLoading ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-4">
                        Buscando...
                      </TableCell>
                    </TableRow>
                  ) : searchResults.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={5}
                        className="text-center py-4 text-gray-400"
                      >
                        No hay resultados
                      </TableCell>
                    </TableRow>
                  ) : (
                    searchResults
                      .slice((currentPage - 1) * 5, currentPage * 5)
                      .map((producto, idx) => (
                        <TableRow
                          key={producto.id_producto || `search-prod-${idx}`}
                          className="hover:bg-gray-50"
                        >
                          <TableCell>{producto.nombre}</TableCell>
                          <TableCell>
                            {formatCurrencyNoDecimals(producto.precio)}
                          </TableCell>
                          <TableCell>
                            {formatCurrencyNoDecimals(producto.comision || 0)}
                          </TableCell>
                          <TableCell>{producto.categoria}</TableCell>
                          <TableCell className="text-center">
                            <Button
                              size="icon"
                              variant="ghost"
                              className="bg-black text-white rounded-full hover:scale-105 transition-all duration-200"
                              onClick={() => handleAddProduct(producto)}
                            >
                              <Plus className="w-4 h-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                  )}
                </TableBody>
              </Table>

              {/* Paginación */}
              {searchResults.length > 5 && (
                <Paginate
                  page={currentPage}
                  totalPages={Math.ceil(searchResults.length / 5)}
                  setPage={setCurrentPage}
                />
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
