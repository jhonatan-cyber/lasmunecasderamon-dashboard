'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import SelectElements from '@/components/shared/SelectElements';
import SearchInput from '@/components/shared/SearchInput';
import { Trash2, SortAsc, SortDesc } from 'lucide-react';
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
  onClear,
}: PayrollFiltersProps) {
  const handleRowsPerPageChange = (value: number) => {
    setRowsPerPage(value);
    setPage(1);
  };

  return (
    <Card className='shadow-md border-none bg-white dark:bg-slate-900/40 backdrop-blur-sm rounded-3xl overflow-hidden'>
      <CardContent className='p-6'>
        <div className='flex flex-col lg:flex-row gap-6 items-end'>
          {/* Búsqueda */}
          <div className='w-full lg:flex-1'>
            <Label className='mb-2 block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 ml-1'>
              Buscar
            </Label>
            <SearchInput
              value={searchTerm}
              onChange={(v) => {
                setSearchTerm(v);
                setPage(1);
              }}
              placeholder='Buscar por nombre...'
              className='w-full rounded-full bg-gray-100 dark:bg-slate-900/50 border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-100'
            />
          </div>

          <div className='flex flex-wrap sm:flex-nowrap gap-4 w-full lg:w-auto items-end'>
            {/* Ordenar por */}
            <div className='w-full sm:w-auto min-w-[180px]'>
              <Label className='mb-2 block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 ml-1'>
                Ordenar por
              </Label>
              <div className='flex gap-1'>
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className='w-full text-sm rounded-full rounded-r-none border border-gray-300 dark:border-gray-700 bg-gray-100 dark:bg-slate-900/50 text-gray-900 dark:text-gray-100 h-10'>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className='rounded-xl border-gray-200 dark:border-gray-800'>
                    <SelectItem value='usuario'>Nombre</SelectItem>
                    <SelectItem value='rol'>Rol</SelectItem>
                    <SelectItem value='sueldos'>Sueldo</SelectItem>
                    <SelectItem value='ventas'>Ventas</SelectItem>
                    <SelectItem value='servicios'>Servicios</SelectItem>
                    <SelectItem value='propinas'>Propinas</SelectItem>
                    <SelectItem value='total'>Total</SelectItem>
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

            {/* Elementos por página */}
            <div className='w-full sm:w-auto'>
              <SelectElements
                value={rowsPerPage}
                onChange={handleRowsPerPageChange}
                options={[5, 10, 20, 40]}
                label='LISTAR'
              />
            </div>

            {/* Botón limpiar filtros */}
            <div className='w-full sm:w-auto'>
              <TooltipProvider>
                <Tooltip delayDuration={300}>
                  <TooltipTrigger asChild>
                    <Button
                      onClick={onClear}
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
