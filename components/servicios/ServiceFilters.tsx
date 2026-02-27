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
  const hasActiveFilters = searchTerm.trim() !== '';

  return (
    <div className='mb-6'>
      <div className='flex flex-col md:flex-row gap-4 items-stretch md:items-center'>
        {/* Búsqueda */}
        <div className='flex-1 group'>
          <SearchInput
            value={searchTerm}
            onChange={setSearchTerm}
            placeholder='Buscar servicios por código, cliente o anfitriona...'
            className='w-full'
          />
        </div>

        {/* Controles de Vista de Página */}
        <div className='flex flex-wrap items-center gap-3'>
          <div className='flex items-center gap-2 bg-gray-100/80 dark:bg-zinc-800/80 p-1 rounded-xl border border-gray-200 dark:border-zinc-700 shadow-sm'>
            <span className='pl-2 text-[10px] font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-widest'>
              Mostrar
            </span>
            <SelectElements
              value={itemsPerPage}
              onChange={handleItemsPerPageChange}
              options={[8, 16, 24, 48]}
              label=''
            />
          </div>

          {/* Botón limpiar filtros */}
          {hasActiveFilters && (
            <Button
              onClick={() => setSearchTerm('')}
              variant='outline'
              className='h-10 px-4 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 dark:hover:text-red-400 gap-2 border-red-100 dark:border-red-900/30'
            >
              <div className='w-1.5 h-1.5 rounded-full bg-red-500' />
              Limpiar
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
