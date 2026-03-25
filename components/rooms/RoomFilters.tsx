 
'use client';

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { Sparkles } from 'lucide-react';
import SearchInput from '@/components/ui/SearchInput';
import SelectElements from '@/components/ui/select-elements';

interface RoomFiltersProps {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  filterStatus: number | null;
  setFilterStatus: (status: number | null) => void;
  onClearFilters: () => void;
  pageSize: number;
  setPageSize: (size: number) => void;
  setPage: (page: number) => void;
  showTableView: boolean;
}

export function RoomFilters({
  searchTerm,
  setSearchTerm,
  filterStatus,
  setFilterStatus,
  onClearFilters,
  pageSize,
  setPageSize,
  setPage,
  showTableView
}: RoomFiltersProps) {
  // Opciones diferentes según el modo de visualización
  const pageSizeOptions = React.useMemo(
    () => (showTableView ? [5, 10, 20, 40] : [8, 16, 24, 48]),
    [showTableView]
  );

  const handlePageSizeChange = (value: number) => {
    setPageSize(value);
    setPage(1);
  };

  // Verificar si hay filtros activos
  const hasActiveFilters = searchTerm.trim() !== '' || filterStatus !== null;

  return (
    <Card className='shadow-sm'>
      <CardContent className='mt-3 p-4 sm:p-6'>
        <div className='flex flex-col sm:flex-row gap-4 sm:gap-6 items-stretch sm:items-center'>
          {/* Búsqueda */}
          <div className='flex-1'>
            <SearchInput
              value={searchTerm}
              onChange={setSearchTerm}
              placeholder='Buscar por nombre de habitación...'
              className='w-full text-sm sm:text-base'
            />
          </div>

          {/* Filtro de estado */}
          <div className='flex-shrink-0'>
            <Select
              value={filterStatus === null ? 'all' : String(filterStatus)}
              onValueChange={value => setFilterStatus(value === 'all' ? null : Number(value))}
            >
              <SelectTrigger className='w-full sm:w-[180px] text-center rounded-full text-sm sm:text-base'>
                <SelectValue placeholder='Todos los estados' />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='all'>Todos los estados</SelectItem>
                <SelectItem value='1'>Disponible</SelectItem>
                <SelectItem value='2'>Ocupada</SelectItem>
                <SelectItem value='0'>Inactiva</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Elementos por página */}
          <div className='flex-shrink-0'>
            <SelectElements
              value={pageSize}
              onChange={handlePageSizeChange}
              options={pageSizeOptions}
              label=''
            />
          </div>

          {/* Botón limpiar filtros - Solo aparece cuando hay filtros activos */}
          {hasActiveFilters && (
            <div className='flex-shrink-0'>
              <Button
                onClick={onClearFilters}
                size='sm'
                variant='outline'
                className='w-full sm:w-auto rounded-full px-4 sm:px-6 hover:scale-105 transition-all duration-200 text-sm sm:text-base'
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
