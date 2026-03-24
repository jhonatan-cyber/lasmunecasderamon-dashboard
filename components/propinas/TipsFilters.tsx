/* eslint-disable */
'use client';

import SearchInput from '@/components/ui/SearchInput';
import SelectElements from '@/components/ui/select-elements';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { RotateCcw } from 'lucide-react';

interface TipsFiltersProps {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  rowsPerPage: number;
  setRowsPerPage: (size: number) => void;
  setPage: (page: number) => void;
  loading: boolean;
  onRefresh: () => void;
}

export default function TipsFilters({
  searchTerm,
  setSearchTerm,
  rowsPerPage,
  setRowsPerPage,
  setPage,
  loading,
  onRefresh
}: TipsFiltersProps) {
  const handleRowsPerPageChange = (value: number) => {
    setRowsPerPage(value);
    setPage(1);
  };

  const hasActiveFilters = searchTerm.trim() !== "" || rowsPerPage !== 5;

  return (
    <Card className='mb-4 sm:mb-6 shadow-sm'>
      <CardContent className='mt-3 p-4 sm:p-6'>
        <div className="flex flex-col sm:flex-row gap-4 items-end">
          {/* Búsqueda */}
          <div className="flex-1">
            <SearchInput
              placeholder='Buscar por nombre de usuario...'
              value={searchTerm}
              onChange={setSearchTerm}
              className='w-full text-sm sm:text-base'
            />
          </div>

          {/* Elementos por página */}
          <div className="w-full sm:w-auto">
            <SelectElements
              value={rowsPerPage}
              onChange={handleRowsPerPageChange}
              options={[5, 10, 20, 40]}
            />
          </div>

          {/* Botón actualizar */}
          <Button
            onClick={onRefresh}
            disabled={loading}
            size='sm'
            variant='outline'
            className='w-full sm:w-auto rounded-full px-4 sm:px-6 hover:scale-105 transition-all duration-200 text-sm sm:text-base'
          >
            <RotateCcw className={`w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2 ${loading ? 'animate-spin' : ''}`} />
            Actualizar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
