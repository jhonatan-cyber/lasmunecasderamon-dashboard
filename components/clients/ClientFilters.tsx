'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { Trash2, SortAsc, SortDesc } from 'lucide-react';
import SearchInput from '@/components/shared/SearchInput';
import SelectElements from '@/components/shared/SelectElements';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface ClientFiltersProps {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  filterStatus: number | null;
  setFilterStatus: (status: number | null) => void;
  sortBy: string;
  setSortBy: (sort: string) => void;
  sortOrder: 'asc' | 'desc';
  setSortOrder: (order: 'asc' | 'desc') => void;
  onClearFilters: () => void;
  pageSize: number;
  setPageSize: (size: number) => void;
  setPage: (page: number) => void;
}

export function ClientFilters({
  searchTerm,
  setSearchTerm,
  filterStatus,
  setFilterStatus,
  sortBy,
  setSortBy,
  sortOrder,
  setSortOrder,
  onClearFilters,
  pageSize,
  setPageSize,
  setPage
}: ClientFiltersProps) {
  const handlePageSizeChange = (value: number) => {
    setPageSize(value);
    setPage(1);
  };

  return (
    <Card className='shadow-md border-none bg-white dark:bg-slate-900/40 backdrop-blur-sm rounded-3xl overflow-hidden'>
      <CardContent className='p-6'>
        <div className='flex flex-col lg:flex-row gap-6 items-end'>
          {}
          <div className='w-full lg:flex-1'>
            <Label
              htmlFor='search'
              className='mb-2 block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 ml-1'
            >
              Buscar Clientes
            </Label>
            <SearchInput
              id='search'
              value={searchTerm}
              onChange={setSearchTerm}
              placeholder='Nombre, RUT, Email o Teléfono...'
              className='w-full rounded-full bg-gray-100 dark:bg-slate-900/50 border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-100'
            />
          </div>

          <div className='flex flex-wrap sm:flex-nowrap gap-4 w-full lg:w-auto items-end'>
            {}
            <div className='w-full sm:w-auto min-w-[160px]'>
              <Label
                htmlFor='status'
                className='mb-2 block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 ml-1'
              >
                Estado
              </Label>
              <Select
                value={filterStatus === null ? 'all' : String(filterStatus)}
                onValueChange={(value: string) =>
                  setFilterStatus(value === 'all' ? null : Number(value))
                }
              >
                <SelectTrigger id='status'>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='all'>Todos los estados</SelectItem>
                  <SelectItem value='1'>Activos</SelectItem>
                  <SelectItem value='0'>Inactivos</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {}
            <div className='w-full sm:w-auto min-w-[180px]'>
              <Label className='mb-2 block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 ml-1'>
                Ordenar por
              </Label>
              <div className='flex gap-1'>
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className='rounded-r-none'>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='name'>Nombre</SelectItem>
                    <SelectItem value='lastName'>Apellido</SelectItem>
                    <SelectItem value='run'>RUT</SelectItem>
                    <SelectItem value='phone'>Teléfono</SelectItem>
                    <SelectItem value='saldo_prepago'>Saldo Prepago</SelectItem>
                    <SelectItem value='created_at'>Fecha Creación</SelectItem>
                  </SelectContent>
                </Select>
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
            </div>

            {}
            <div className='w-full sm:w-auto'>
              <SelectElements
                value={pageSize}
                onChange={handlePageSizeChange}
                options={[5, 10, 20, 40]}
                label='LISTAR'
              />
            </div>

            {}
            <div className='w-full sm:w-auto'>
              <TooltipProvider>
                <Tooltip delayDuration={300}>
                  <TooltipTrigger asChild>
                    <Button
                      onClick={onClearFilters}
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
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
