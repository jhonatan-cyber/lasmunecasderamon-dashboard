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
  return (
    <Card className="mb-4 sm:mb-6 shadow-sm">
      <CardContent className="p-4 sm:p-6">
        <div className="flex flex-col gap-4 sm:gap-6">
          {/* Búsqueda - Ocupa todo el ancho en móviles */}
          <div className="w-full">
            <SearchInput
              value={searchTerm}
              onChange={setSearchTerm}
              placeholder='Buscar servicios...'
              className='w-full text-sm sm:text-base'
            />
          </div>

          {/* Controles - Responsive layout */}
          <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 items-stretch sm:items-end">
            {/* Botón de filtro */}
            <div className="flex-1 sm:flex-none">
              <Button
                onClick={showAllServices ? onShowActiveServices : onShowAllServices}
                variant='outline'
                className='w-full sm:w-auto whitespace-nowrap inline-flex items-center bg-black text-white rounded-full hover:scale-105 transition-all duration-200 text-sm sm:text-base px-4 sm:px-6 py-2'
              >
                {showAllServices ? 'Mostrar Activos' : 'Mostrar Terminados'}
              </Button>
            </div>

            {/* Elementos por página */}
            <div className="flex-1 sm:flex-none">
              <SelectElements
                rowsPerPage={itemsPerPage}
                setRowsPerPage={setItemsPerPage}
                setPage={setCurrentPage}
                options={[8, 16, 24, 48]}
                label='Elementos por página'
              />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
