'use client';

import { Button } from '@/components/ui/button';

import SelectElements from '@/components/ui/select-elements';
import SearchInput from '@/components/ui/SearchInput';
import { Card, CardContent } from '@/components/ui/card';

interface ServiceFiltersProps {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  showAllServices: boolean;
  onShowActiveServices: () => void;
  onShowAllServices: () => void;
  itemsPerPage: number;
  setItemsPerPage: (items: number) => void;
  setCurrentPage: (page: number) => void;
}

export default function ServiceFilters({
  searchTerm,
  setSearchTerm,
  showAllServices,
  onShowActiveServices,
  onShowAllServices,
  itemsPerPage,
  setItemsPerPage,
  setCurrentPage
}: ServiceFiltersProps) {
  const handleItemsPerPageChange = (value: number) => {
    setItemsPerPage(value);
    setCurrentPage(1);
  };

  // Verificar si hay filtros activos
  const hasActiveFilters = searchTerm.trim() !== "";

  return (
    <Card className="mb-4 sm:mb-6 shadow-sm">
      <CardContent className="p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 items-stretch sm:items-center">
          {/* Búsqueda */}
          <div className="flex-1">
            <SearchInput
              value={searchTerm}
              onChange={setSearchTerm}
              placeholder='Buscar servicios...'
              className='w-full text-sm sm:text-base'
            />
          </div>

          {/* Botón de filtro */}
          <div className="flex-shrink-0">
            <Button
              onClick={showAllServices ? onShowActiveServices : onShowAllServices}
              variant='outline'
              className='w-full sm:w-auto whitespace-nowrap inline-flex items-center bg-black text-white rounded-full hover:scale-105 transition-all duration-200 text-sm sm:text-base px-4 sm:px-6 py-2'
            >
              {showAllServices ? 'Mostrar Activos' : 'Mostrar Terminados'}
            </Button>
          </div>

          {/* Elementos por página */}
          <div className="flex-shrink-0">
            <SelectElements
              value={itemsPerPage}
              onChange={handleItemsPerPageChange}
              options={[8, 16, 24, 48]}
              label=""
            />
          </div>

          {/* Botón limpiar filtros - Solo aparece cuando hay filtros activos */}
          {hasActiveFilters && (
            <div className="flex-shrink-0">
              <Button
                onClick={() => setSearchTerm("")}
                size="sm"
                variant="outline"
                className="w-full sm:w-auto rounded-full px-4 sm:px-6 hover:scale-105 transition-all duration-200 text-sm sm:text-base"
              >
                Limpiar
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
