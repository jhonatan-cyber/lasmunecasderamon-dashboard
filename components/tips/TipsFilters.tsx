'use client';
import { SortSelect } from '@/components/shared/selects/SortSelect';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Trash2 } from 'lucide-react';
import SearchInput from '@/components/shared/SearchInput';
import { FilterSelect } from '@/components/shared/selects';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface TipsFiltersProps {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  sortBy: string;
  setSortBy: (sort: string) => void;
  sortOrder: 'asc' | 'desc';
  setSortOrder: (order: 'asc' | 'desc') => void;
  rowsPerPage: number;
  setRowsPerPage: (size: number) => void;
  setPage: (page: number) => void;
  onClearFilters: () => void;
}

export default function TipsFilters({
  searchTerm,
  setSearchTerm,
  sortBy,
  setSortBy,
  sortOrder,
  setSortOrder,
  rowsPerPage,
  setRowsPerPage,
  setPage,
  onClearFilters
}: TipsFiltersProps) {
  const handleRowsPerPageChange = (value: number) => {
    setRowsPerPage(value);
    setPage(1);
  };

  return (
    <Card className='shadow-md border-none bg-white dark:bg-slate-900/40 backdrop-blur-xs rounded-3xl overflow-hidden mb-6'>
      <CardContent className='p-4 sm:p-6'>
        <div
          role='group'
          aria-label='Filtros'
          className='flex flex-col sm:flex-row w-full flex-wrap sm:flex-nowrap items-end gap-4 sm:[&>div]:flex-[1_0_160px]'
        >
          <div className='w-full sm:flex-[2_0_200px]'>
            <Label className='mb-2 block text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1'>
              Buscar
            </Label>
            <SearchInput
              value={searchTerm}
              onChange={setSearchTerm}
              placeholder='Buscar por nombre, nick...'
              className='w-full rounded-full bg-gray-100 dark:bg-slate-900/50 border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-100'
            />
          </div>

          <div className='w-full'>
            <SortSelect
              field={sortBy}
              direction={sortOrder}
              options={[
                { value: 'nombre_completo', label: 'Nombre' },
                { value: 'nick', label: 'Nick' },
                { value: 'total_propinas', label: 'Total propinas' },
                { value: 'fecha_crea', label: 'Última propina' }
              ]}
              onChange={(field, direction) => {
                setSortBy(field as typeof sortBy);
                setSortOrder(direction);
              }}
              className='w-full'
            />
          </div>

          <div className='flex items-end gap-2 w-full sm:flex-none'>
            <div className='flex-1 sm:flex-none'>
              <FilterSelect
                value={rowsPerPage.toString()}
                onChange={v => {
                  handleRowsPerPageChange(parseInt(v));
                }}
                label='Mostrar'
                placeholder='10'
                options={[
                  { value: '5', label: '5 Datos' },
                  { value: '10', label: '10 Datos' },
                  { value: '20', label: '20 Datos' },
                  { value: '40', label: '40 Datos' }
                ]}
              />
            </div>

            <TooltipProvider>
              <Tooltip delayDuration={300}>
                <TooltipTrigger asChild>
                  <Button
                    onClick={onClearFilters}
                    variant='outline'
                    size='icon'
                    aria-label='Limpiar filtros'
                    className='w-10 h-10 flex items-center justify-center rounded-full border border-gray-300 dark:border-gray-700 shadow-xs bg-gray-100 dark:bg-slate-900/50 text-gray-900 dark:text-gray-100 transition-all duration-200 hover:scale-110 hover:bg-red-500! hover:text-white! hover:border-red-500!'
                  >
                    <Trash2 className='w-4 h-4' />
                  </Button>
                </TooltipTrigger>
                <TooltipContent className='bg-black text-white dark:bg-white dark:text-black rounded-xl border-none text-xs font-bold px-3 py-1.5 shadow-xl'>
                  <p>Limpiar filtros</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
