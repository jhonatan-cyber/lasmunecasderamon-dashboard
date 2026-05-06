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
import { Trash2 } from 'lucide-react';
import SearchInput from '@/components/shared/SearchInput';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface CajaFiltersProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  filterStatus: string;
  onStatusChange: (value: string) => void;
  onClearFilters: () => void;
}

export const CajaFilters = ({
  searchTerm,
  onSearchChange,
  filterStatus,
  onStatusChange,
  onClearFilters
}: CajaFiltersProps) => {
  return (
    <Card className='shadow-md border-none bg-white dark:bg-slate-900/40 backdrop-blur-sm rounded-3xl overflow-hidden mb-6'>
      <CardContent className='p-6'>
        <div className='flex flex-col lg:flex-row gap-6 items-end'>
          {/* Búsqueda */}
          <div className='w-full lg:flex-1'>
            <Label
              htmlFor='search-caja'
              className='mb-2 block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 ml-1'
            >
              Buscar Cajero o ID
            </Label>
            <SearchInput
              id='search-caja'
              value={searchTerm}
              onChange={onSearchChange}
              placeholder='Nombre del cajero o ID de caja...'
              className='w-full rounded-2xl bg-gray-50/50 dark:bg-slate-900/50 border-gray-200 dark:border-gray-800'
            />
          </div>

          <div className='flex flex-wrap sm:flex-nowrap gap-4 w-full lg:w-auto items-end'>
            {/* Filtro de estado */}
            <div className='w-full sm:w-auto min-w-[200px]'>
              <Label
                htmlFor='status-caja'
                className='mb-2 block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 ml-1'
              >
                Estado de Caja
              </Label>
              <Select value={filterStatus} onValueChange={onStatusChange}>
                <SelectTrigger id='status-caja'>
                  <SelectValue placeholder='Seleccionar estado' />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='all'>Todos los estados</SelectItem>
                  <SelectItem value='1'>Cajas Abiertas</SelectItem>
                  <SelectItem value='0'>Cajas Cerradas</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Botón limpiar filtros */}
            <div className='w-full sm:w-auto'>
              <TooltipProvider>
                <Tooltip delayDuration={300}>
                  <TooltipTrigger asChild>
                    <Button
                      onClick={onClearFilters}
                      variant='outline'
                      size='icon'
                      className='w-10 h-10 flex items-center justify-center rounded-2xl border-gray-200 dark:border-gray-800 hover:scale-110 transition-all duration-200 hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black shadow-sm'
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
};
