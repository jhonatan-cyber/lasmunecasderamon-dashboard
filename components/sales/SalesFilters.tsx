'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { Trash2, SortAsc, SortDesc } from 'lucide-react';
import SearchInput from '@/components/shared/SearchInput';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface SalesFiltersProps {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  filterStatus: string;
  setFilterStatus: (status: string) => void;
  filterMetodoPago: string;
  setFilterMetodoPago: (method: string) => void;
  sortBy: string;
  setSortBy: (sort: string) => void;
  sortOrder: 'asc' | 'desc';
  setSortOrder: (order: 'asc' | 'desc') => void;
  onClearFilters: () => void;
  rowsPerPage: number;
  setRowsPerPage: (value: number) => void;
  setPage: (value: number) => void;
}

export function SalesFilters({
  searchTerm,
  setSearchTerm,
  filterStatus,
  setFilterStatus,
  filterMetodoPago,
  setFilterMetodoPago,
  sortBy,
  setSortBy,
  sortOrder,
  setSortOrder,
  onClearFilters,
  rowsPerPage,
  setRowsPerPage,
  setPage
}: SalesFiltersProps) {
  return (
    <Card className='shadow-md border-none bg-white dark:bg-slate-900/40 backdrop-blur-xs rounded-3xl overflow-hidden mb-6 mx-4 sm:mx-8'>
      <CardContent className='p-6'>
        <div className='flex flex-col lg:flex-row gap-4 items-end'>
          {}
          <div className='w-full lg:flex-1'>
            <Label className='mb-2 block text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1'>
              Buscar
            </Label>
            <SearchInput
              value={searchTerm}
              onChange={setSearchTerm}
              placeholder='Buscar por código, cliente, habitación o anfitriona...'
              className='w-full rounded-2xl bg-gray-50/50 dark:bg-slate-900/50 border-gray-200 dark:border-gray-800 h-10'
            />
          </div>

          {}
          <div className='w-full lg:w-[130px]'>
            <Label className='mb-2 block text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1'>
              Estados
            </Label>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger>
                <SelectValue placeholder='Estado' />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='all'>Todos</SelectItem>
                <SelectItem value='1'>Completado</SelectItem>
                <SelectItem value='2'>En Proceso</SelectItem>
                <SelectItem value='3'>Pdte. Anulación</SelectItem>
                <SelectItem value='0'>Anulado</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {}
          <div className='w-full lg:w-[130px]'>
            <Label className='mb-2 block text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1'>
              Método
            </Label>
            <Select value={filterMetodoPago} onValueChange={setFilterMetodoPago}>
              <SelectTrigger>
                <SelectValue placeholder='Método' />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='all'>Todos</SelectItem>
                <SelectItem value='efectivo'>Efectivo</SelectItem>
                <SelectItem value='tarjeta'>Tarjeta</SelectItem>
                <SelectItem value='transferencia'>Transferencia</SelectItem>
                <SelectItem value='prepago'>Prepago</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {}
          <div className='w-full lg:w-[180px]'>
            <Label className='mb-2 block text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1'>
              Ordenar por
            </Label>
            <div className='flex gap-1'>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className='rounded-r-none'>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='fecha_crea'>Fecha</SelectItem>
                  <SelectItem value='total'>Monto</SelectItem>
                  <SelectItem value='cliente_nombre'>Cliente</SelectItem>
                  <SelectItem value='codigo'>Código</SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant='outline'
                size='icon'
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                className='h-10 w-10 rounded-r-2xl border-l-0 border-gray-200 dark:border-gray-800 bg-gray-50/50 rounded-l-none'
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
          <div className='w-full lg:w-[100px]'>
            <Label className='mb-2 block text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1'>
              Listado
            </Label>
            <Select
              value={String(rowsPerPage)}
              onValueChange={(v: string) => {
                setRowsPerPage(Number(v));
                setPage(1);
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='5'>5</SelectItem>
                <SelectItem value='10'>10</SelectItem>
                <SelectItem value='20'>20</SelectItem>
                <SelectItem value='40'>40</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {}
          <TooltipProvider>
            <Tooltip delayDuration={300}>
              <TooltipTrigger asChild>
                <Button
                  onClick={onClearFilters}
                  variant='outline'
                  size='icon'
                  className='w-10 h-10 flex items-center justify-center rounded-2xl border-gray-200 dark:border-gray-800 hover:scale-110 transition-all duration-200 hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black shadow-xs'
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
