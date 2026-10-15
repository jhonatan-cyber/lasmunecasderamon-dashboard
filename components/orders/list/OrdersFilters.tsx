'use client';
import { SortSelect } from '@/components/shared/selects/SortSelect';

import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Trash2 } from 'lucide-react';
import SearchInput from '@/components/shared/SearchInput';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { FilterSelect } from '@/components/shared/selects';

interface AdminOrdersFiltersProps {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  searchServiciosTerm: string;
  setSearchServiciosTerm: (term: string) => void;
  activeTab: string;
  sortBy: string;
  setSortBy: (sort: string) => void;
  sortOrder: 'asc' | 'desc';
  setSortOrder: (order: 'asc' | 'desc') => void;
  onClearFilters: () => void;
  rowsPerPage: number;
  setRowsPerPage: (value: number) => void;
  setPage: (value: number) => void;
}

const sortOptions = [
  { value: 'total', label: 'Total' },
  { value: 'subtotal', label: 'Subtotal' },
  { value: 'cliente', label: 'Cliente' },
  { value: 'codigo', label: 'Código' }
];

const rowsPerPageOptions = [
  { value: '5', label: '5' },
  { value: '10', label: '10' },
  { value: '20', label: '20' },
  { value: '40', label: '40' }
];

export function AdminOrdersFilters({
  searchTerm,
  setSearchTerm,
  searchServiciosTerm,
  setSearchServiciosTerm,
  activeTab,
  sortBy,
  setSortBy,
  sortOrder,
  setSortOrder,
  onClearFilters,
  rowsPerPage,
  setRowsPerPage,
  setPage
}: AdminOrdersFiltersProps) {
  const currentSearchTerm = activeTab === 'productos' ? searchTerm : searchServiciosTerm;
  const setCurrentSearchTerm = activeTab === 'productos' ? setSearchTerm : setSearchServiciosTerm;

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
              value={currentSearchTerm}
              onChange={setCurrentSearchTerm}
              placeholder={
                activeTab === 'productos'
                  ? 'Buscar cliente, código, garzón...'
                  : 'Buscar cliente, habitación...'
              }
              className='w-full rounded-2xl bg-gray-50/50 dark:bg-slate-900/50 border-gray-200 dark:border-gray-800 h-10'
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
          <div className='w-full lg:w-[140px] flex gap-1 items-end'>
            <div className='flex-1'>
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
            <TooltipProvider>
              <Tooltip delayDuration={300}>
                <TooltipTrigger asChild>
                  <Button
                    onClick={onClearFilters}
                    variant='outline'
                    size='icon'
                    aria-label='Limpiar filtros'
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
        </div>
      </CardContent>
    </Card>
  );
}
