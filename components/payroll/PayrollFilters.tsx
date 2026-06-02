'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Trash2, SortAsc, SortDesc } from 'lucide-react';
import SearchInput from '@/components/shared/SearchInput';
import { FilterSelect } from '@/components/shared/selects';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface PayrollFiltersProps {
  searchTerm: string;
  setSearchTerm: (s: string) => void;
  sortBy: string;
  setSortBy: (sort: string) => void;
  sortOrder: 'asc' | 'desc';
  setSortOrder: (order: 'asc' | 'desc') => void;
  rowsPerPage: number;
  setRowsPerPage: (n: number) => void;
  setPage: (n: number) => void;
  onClear?: () => void;
}

export default function PayrollFilters({
  searchTerm,
  setSearchTerm,
  sortBy,
  setSortBy,
  sortOrder,
  setSortOrder,
  rowsPerPage,
  setRowsPerPage,
  setPage,
  onClear
}: PayrollFiltersProps) {
  const handleRowsPerPageChange = (value: number) => {
    setRowsPerPage(value);
    setPage(1);
  };

  return (
    <Card className='shadow-md border-none bg-white dark:bg-slate-900/40 backdrop-blur-sm rounded-3xl overflow-hidden mb-6'>
      <CardContent className='p-6'>
        <div className='flex flex-col lg:flex-row gap-4 items-end w-full'>
          {/* BÃºsqueda */}
          <div className='w-full lg:flex-1'>
            <Label className='mb-2 block text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1'>
              Buscar
            </Label>
            <SearchInput
              value={searchTerm}
              onChange={v => {
                setSearchTerm(v);
                setPage(1);
              }}
              placeholder='Buscar por nombre...'
              className='w-full rounded-full bg-gray-100 dark:bg-slate-900/50 border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-100'
            />
          </div>

          {/* Ordenar */}
          <div className='w-full sm:w-auto min-w-[180px]'>
            <FilterSelect
              value={sortBy}
              onChange={setSortBy}
              label='Ordenar por'
              placeholder='Nombre'
              options={[
                { value: 'usuario', label: 'Nombre' },
                { value: 'rol', label: 'Rol' },
                { value: 'sueldos', label: 'Sueldo' },
                { value: 'ventas', label: 'Ventas' },
                { value: 'servicios', label: 'Servicios' },
                { value: 'propinas', label: 'Propinas' },
                { value: 'total', label: 'Total' }
              ]}
            />
          </div>

          {/* BotÃ³n de ordenamiento */}
          <div className='flex items-end'>
            <Label className='mb-2 block text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1'>
              &nbsp;
            </Label>
            <Button
              variant='outline'
              size='icon'
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              className='h-10 w-10 rounded-full border border-gray-300 dark:border-gray-700 bg-gray-100 dark:bg-slate-900/50 text-gray-900 dark:text-gray-100 hover:bg-gray-200 dark:hover:bg-gray-700'
            >
              {sortOrder === 'asc' ? (
                <SortAsc className='h-4 w-4' />
              ) : (
                <SortDesc className='h-4 w-4' />
              )}
            </Button>
          </div>

          {/* Mostrar (PageSize) */}
          <div className='w-full sm:w-auto min-w-[100px]'>
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

          {/* BotÃ³n Limpiar con Ã­cono trash */}
          <TooltipProvider>
            <Tooltip delayDuration={300}>
              <TooltipTrigger asChild>
                <Button
                  onClick={onClear}
                  variant='outline'
                  size='icon'
                  className='w-10 h-10 flex items-center justify-center rounded-full border border-gray-300 dark:border-gray-700 shadow-sm bg-gray-100 dark:bg-slate-900/50 text-gray-900 dark:text-gray-100 transition-all duration-200 hover:scale-110 hover:!bg-red-500 hover:!text-white hover:!border-red-500'
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
      </CardContent>
    </Card>
  );
}


