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

interface CuentaFiltersProps {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  rowsPerPage: number;
  setRowsPerPage: (rows: number) => void;
  setPage: (page: number) => void;
  loading: boolean;
  onRefresh: () => void;
}

export default function CuentaFilters({
  searchTerm,
  setSearchTerm,
  rowsPerPage,
  setRowsPerPage,
  setPage,
  loading,
  onRefresh
}: CuentaFiltersProps) {
  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    setPage(1);
  };

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
            <Label
              htmlFor='search'
              className='mb-2 block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 ml-1'
            >
              Buscar Cuentas
            </Label>
            <SearchInput
              id='search'
              value={searchTerm}
              onChange={handleSearchChange}
              placeholder='Cliente o código...'
              className='w-full rounded-full bg-gray-100 dark:bg-slate-900/50 border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-100'
            />
          </div>

          <div className='flex flex-wrap sm:flex-nowrap gap-4 w-full lg:w-auto items-end'>
            {/* Listado por página */}
            <div className='w-full sm:w-auto min-w-[160px]'>
              <Label
                htmlFor='rowsPerPage'
                className='mb-2 block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 ml-1'
              >
                Listar
              </Label>
              <Select
                value={rowsPerPage.toString()}
                onValueChange={(v: string) => handleRowsPerPageChange(Number(v))}
              >
                <SelectTrigger id='rowsPerPage'>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='5'>5</SelectItem>
                  <SelectItem value='10'>10</SelectItem>
                  <SelectItem value='20'>20</SelectItem>
                  <SelectItem value='50'>50</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Botón limpiar filtros */}
            <div className='w-full sm:w-auto'>
              <TooltipProvider>
                <Tooltip delayDuration={300}>
                  <TooltipTrigger asChild>
                    <Button
                      onClick={onRefresh}
                      size='icon'
                      className='w-10 h-10 flex items-center justify-center rounded-full border border-gray-300 dark:border-gray-700 shadow-sm bg-gray-100 dark:bg-slate-900/50 text-gray-900 dark:text-gray-100 transition-all duration-200 hover:scale-110 hover:!bg-red-500 hover:!text-white hover:!border-red-500'
                      disabled={loading}
                    >
                      <Trash2 className='w-4 h-4' />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent className='bg-black text-white dark:bg-white dark:text-black rounded-xl border-none text-xs font-bold px-3 py-1.5 shadow-xl'>
                    <p>Limpiar / Actualizar</p>
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
