'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Trash2, SortAsc, SortDesc } from 'lucide-react';
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
  { value: 'codigo', label: 'CÃ³digo' }
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
    <Card className='shadow-md border-none bg-white dark:bg-slate-900/40 backdrop-blur-sm rounded-3xl overflow-hidden mb-6 mx-4 sm:mx-8'>
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
                  ? 'Buscar cliente, cÃ³digo, garzÃ³n...'
                  : 'Buscar cliente, habitaciÃ³n...'
              }
              className='w-full rounded-2xl bg-gray-50/50 dark:bg-slate-900/50 border-gray-200 dark:border-gray-800 h-10'
            />
          </div>

          {}
          <div className='w-full lg:w-[180px]'>
            <Label className='mb-2 block text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1'>
              Ordenar por
            </Label>
            <div className='flex gap-1'>
              <FilterSelect
                value={sortBy}
                onChange={setSortBy}
                label=''
                placeholder='Ordenar'
                options={sortOptions}
                className='flex-1'
              />
              <Button
                variant='outline'
                size='icon'
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                className='h-11 w-11 rounded-full border-gray-200 dark:border-gray-800 bg-gray-100 dark:bg-slate-900/50'
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
      </CardContent>
    </Card>
  );
}
