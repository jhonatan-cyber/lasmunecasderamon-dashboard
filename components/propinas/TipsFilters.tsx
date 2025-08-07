'use client';

import SearchInput from '@/components/ui/SearchInput';
import SelectElements from '@/components/ui/select-elements';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faRefresh } from '@fortawesome/free-solid-svg-icons';

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
  return (
    <Card className='mb-4 sm:mb-6 shadow-sm'>
      <CardContent className='mt-3 p-4 sm:p-6'>
        <div className='flex flex-col gap-4 sm:gap-6'>
          {/* Búsqueda - Ocupa todo el ancho en móviles */}
          <div className='w-full'>
            <Label htmlFor='search' className='mb-2 text-sm sm:text-base'>
              Buscar
            </Label>
            <SearchInput
              id='search'
              placeholder='Buscar por nombre de usuario...'
              value={searchTerm}
              onChange={setSearchTerm}
              className='w-full text-sm sm:text-base'
            />
          </div>
          {/* Controles - Responsive layout */}
          <div className='flex flex-col sm:flex-row gap-4 sm:gap-6 items-stretch sm:items-end'>
            <div className='flex-1 sm:flex-none'>
              <SelectElements
                rowsPerPage={rowsPerPage}
                setRowsPerPage={setRowsPerPage}
                setPage={setPage}
                options={[5, 10, 20, 40]}
                label='Comisiones por página'
              />
            </div>
            <div className='flex-1 sm:flex-none'>
              <Button
                onClick={onRefresh}
                disabled={loading}
                size='sm'
                variant='outline'
                className='w-full sm:w-auto rounded-full px-4 sm:px-6 hover:scale-105 transition-all duration-200 text-sm sm:text-base'
              >
                <FontAwesomeIcon icon={faRefresh} className={`w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2 ${loading ? 'animate-spin' : ''}`} />
                Actualizar
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
