'use client';

import { useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Trash2 } from 'lucide-react';
import Paginate from '@/components/shared/Paginate';
import { ProductSelectionTable } from '@/components/products/ProductSelectionTable';
import { useProductSearch } from '@/hooks/cuentas';

interface ProductSearchProps {
  onAddProduct: (producto: any) => void;
  placeholder?: string;
  className?: string;
  searchOnly?: boolean;
  searchTerm?: string;
  searchProducto?: string;
  onSearchTermChange?: (term: string) => void;
  onSearchChange?: (term: string) => void;
  onClearSearch?: () => void;
}

export default function ProductSearch({
  onAddProduct,
  placeholder = 'Buscar Producto',
  className = '',
  searchOnly = false,
  searchTerm: externalSearchTerm,
  searchProducto,
  onSearchTermChange,
  onSearchChange,
  onClearSearch
}: ProductSearchProps) {
  const {
    internalSearchTerm,
    searchResults,
    searchLoading,
    currentPage,
    totalPages,
    handleSearchChange,
    handleClearSearch: hookHandleClearSearch,
    goToPage
  } = useProductSearch(300);

  // Determinar si estamos en modo controlado (props externas) o no controlado
  const isControlled = externalSearchTerm !== undefined || searchProducto !== undefined;
  const searchTerm = externalSearchTerm ?? searchProducto ?? internalSearchTerm;
  const setSearchTerm = onSearchTermChange ?? onSearchChange ?? handleSearchChange;

  // Sincronizar props externas con el hook cuando estamos en modo controlado
  useEffect(() => {
    const termToSync = externalSearchTerm ?? searchProducto;
    if (isControlled && termToSync !== undefined) {
      handleSearchChange(termToSync);
    }
  }, [isControlled, externalSearchTerm, searchProducto, handleSearchChange]);

  const itemsPerPage = 5;
  const paginatedResults = searchResults.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );
  const totalPaginas = Math.ceil(searchResults.length / itemsPerPage);

  const handleClear = () => {
    hookHandleClearSearch();
    setSearchTerm('');
    if (onClearSearch) onClearSearch();
  };

  const handleAddProduct = (producto: any) => {
    onAddProduct(producto);
  };

  return (
    <>
      <div className={`${className}`}>
        {/* Barra de búsqueda */}
        <div className='flex justify-center mb-6'>
          <div className='w-full max-w-md'>
            <div className='flex items-center gap-2'>
              <div className='relative flex-1'>
                <Search className='absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4' />
                <Input
                  placeholder={placeholder}
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className='pl-10 pr-20 py-2 text-sm rounded-full'
                  style={{ minWidth: 0 }}
                />
                <Button
                  variant='outline'
                  className='absolute bg-black text-white right-0 top-1/2 -translate-y-1/2 text-sm rounded-full'
                  style={{ zIndex: 2 }}
                >
                  Buscar
                </Button>
              </div>
              {searchTerm && (
                <Button
                  variant='outline'
                  size='sm'
                  className='bg-black text-white dark:bg-black dark:text-white  dark:hover:!bg-white dark:hover:!text-black rounded-full hover:!bg-white hover:!text-black transition-all hover:scale-105 border-2'
                  onClick={handleClear}
                >
                  <Trash2 className='w-4 h-4' />
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Tabla de resultados de búsqueda en tiempo real - Solo si no es searchOnly */}
        {!searchOnly && searchTerm && (
          <>
            <ProductSelectionTable
              productos={paginatedResults}
              cantidades={{}}
              onCantidadChange={() => {}}
              onAddToCart={handleAddProduct}
              showSelection={false}
            />

            {/* Paginación */}
            {searchResults.length > itemsPerPage && (
              <Paginate page={currentPage} totalPages={totalPaginas} setPage={goToPage} />
            )}
          </>
        )}
      </div>
    </>
  );
}
