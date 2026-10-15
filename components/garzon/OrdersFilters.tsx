'use client';
import { FilterBar } from '@/components/shared/FilterBar';
import { SortSelect } from '@/components/shared/selects/SortSelect';

import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Trash2 } from 'lucide-react';
import SearchInput from '@/components/shared/SearchInput';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { FilterSelect } from '@/components/shared/selects';

interface OrdersFiltersProps {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  statusFilter: string;
  setStatusFilter: (status: string) => void;
  sortBy: string;
  setSortBy: (sort: string) => void;
  sortOrder: 'asc' | 'desc';
  setSortOrder: (order: 'asc' | 'desc') => void;
  onClearFilters: () => void;
  rowsPerPage: number;
  setRowsPerPage: (value: number) => void;
  setPage: (value: number) => void;
}

const statusOptions = [
  { value: 'all', label: 'Todos' },
  { value: '1', label: 'Pendiente' },
  { value: '0', label: 'Aprobado' },
  { value: '2', label: 'Rechazado' },
  { value: '3', label: 'Cancelado' }
];

const sortOptions = [
  { value: 'total', label: 'Total' },
  { value: 'subtotal', label: 'Subtotal' },
  { value: 'cliente_nombre', label: 'Cliente' },
  { value: 'codigo', label: 'Código' }
];

const rowsPerPageOptions = [
  { value: '5', label: '5' },
  { value: '10', label: '10' },
  { value: '20', label: '20' },
  { value: '50', label: '50' }
];

export function OrdersFilters({
  searchTerm,
  setSearchTerm,
  statusFilter,
  setStatusFilter,
  sortBy,
  setSortBy,
  sortOrder,
  setSortOrder,
  onClearFilters,
  rowsPerPage,
  setRowsPerPage,
  setPage
}: OrdersFiltersProps) {
  return (
    <Card className='shadow-md border-none bg-white dark:bg-slate-900/40 backdrop-blur-xs rounded-3xl overflow-hidden mb-6 mx-4 sm:mx-8'>
      <CardContent className='p-6'>
        <FilterBar>
          {}
          <div className='w-full lg:flex-1'>
            <Label className='mb-2 block text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1'>
              Buscar
            </Label>
            <SearchInput
              value={searchTerm}
              onChange={setSearchTerm}
              placeholder='Buscar por cliente, código, nicks...'
              className='w-full rounded-full bg-gray-50/50 dark:bg-slate-900/50 border-gray-200 dark:border-gray-800 h-11'
            />
          </div>

          {}
          <div className='w-full lg:w-[130px]'>
            <FilterSelect
              value={statusFilter}
              onChange={setStatusFilter}
              label='Estado'
              placeholder='Estado'
              options={statusOptions}
            />
          </div>

          {}
          <SortSelect
            className='w-full lg:w-[180px]'
            field={sortBy}
            direction={sortOrder}
            options={sortOptions}
            onChange={(field, direction) => {
              setSortBy(field as typeof sortBy);
              setSortOrder(direction);
            }}
          />

          {}
          <div className='w-full lg:w-[100px]'>
            <FilterSelect
              value={String(rowsPerPage)}
              onChange={(v: string) => {
                setRowsPerPage(Number(v));
                setPage(1);
              }}
              label='Listado'
              placeholder='Listado'
              options={rowsPerPageOptions}
            />
          </div>

          {}
          <TooltipProvider>
            <Tooltip delayDuration={300}>
              <TooltipTrigger asChild>
                <Button
                  onClick={onClearFilters}
                  variant='outline'
                  size='icon'
                  aria-label='Limpiar filtros'
                  className='flex-none! w-11 h-11 flex items-center justify-center rounded-full border-gray-200 dark:border-gray-800 hover:scale-110 transition-all duration-200 hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black shadow-xs'
                >
                  <Trash2 className='w-4 h-4' />
                </Button>
              </TooltipTrigger>
              <TooltipContent className='bg-black text-white dark:bg-white dark:text-black rounded-xl border-none text-xs font-bold px-3 py-1.5 shadow-xl'>
                <p>Limpiar filtros</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </FilterBar>
      </CardContent>
    </Card>
  );
}
