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
    <Card className='shadow-md border-none bg-white dark:bg-slate-900/40 backdrop-blur-xs rounded-3xl overflow-hidden mb-6'>
      <CardContent className='p-4 sm:p-6'>
        {}
        <div className='block lg:hidden space-y-3'>
          <div>
            <Label className='mb-1 block text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1'>
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
          <div className='flex gap-2 items-end'>
            <div className='flex-1 min-w-0'>
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
            <div className='flex items-end'>
              <Label className='mb-1 block text-[10px] font-black uppercase tracking-widest text-gray-400 invisible'>
                Ord
              </Label>
              <Button
                variant='outline'
                size='icon'
                aria-label={sortOrder === 'asc' ? 'Ordenar descendente' : 'Ordenar ascendente'}
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                className='h-10 w-10 shrink-0 rounded-full border border-gray-300 dark:border-gray-700 bg-gray-100 dark:bg-slate-900/50 text-gray-900 dark:text-gray-100 hover:bg-gray-200 dark:hover:bg-gray-700'
              >
                {sortOrder === 'asc' ? (
                  <SortAsc className='h-4 w-4' />
                ) : (
                  <SortDesc className='h-4 w-4' />
                )}
              </Button>
            </div>
          </div>
          <div className='flex gap-2 items-end'>
            <div className='flex-1 min-w-0'>
              <FilterSelect
                value={rowsPerPage.toString()}
                onChange={v => handleRowsPerPageChange(parseInt(v))}
                label='Mostrar'
                placeholder='5'
                options={[
                  { value: '5', label: '5' },
                  { value: '10', label: '10' },
                  { value: '20', label: '20' },
                  { value: '40', label: '40' }
                ]}
              />
            </div>
            <div className='flex items-end'>
              <Label className='mb-1 block text-[10px] font-black uppercase tracking-widest text-gray-400 invisible'>
                Limp
              </Label>
              <TooltipProvider>
                <Tooltip delayDuration={300}>
                  <TooltipTrigger asChild>
                    <Button
                      onClick={onClear}
                      variant='outline'
                      size='icon'
                      aria-label='Limpiar filtros'
                      className='w-10 h-10 shrink-0 rounded-full border border-gray-300 dark:border-gray-700 shadow-xs bg-gray-100 dark:bg-slate-900/50 text-gray-900 dark:text-gray-100 transition-all duration-200 hover:scale-110 hover:bg-red-500! hover:text-white! hover:border-red-500!'
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

        {}
        <div className='hidden lg:flex flex-row gap-4 items-end w-full'>
          <div className='flex-1'>
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

          <div className='min-w-[180px]'>
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

          <div className='flex items-end'>
            <Label className='mb-2 block text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1 invisible'>
              Orden
            </Label>
            <Button
              variant='outline'
              size='icon'
              aria-label={sortOrder === 'asc' ? 'Ordenar descendente' : 'Ordenar ascendente'}
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

          <div className='min-w-[100px]'>
            <FilterSelect
              value={rowsPerPage.toString()}
              onChange={v => handleRowsPerPageChange(parseInt(v))}
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
                  onClick={onClear}
                  variant='outline'
                  size='icon'
                  aria-label='Limpiar filtros'
                  className='w-10 h-10 rounded-full border border-gray-300 dark:border-gray-700 shadow-xs bg-gray-100 dark:bg-slate-900/50 text-gray-900 dark:text-gray-100 transition-all duration-200 hover:scale-110 hover:bg-red-500! hover:text-white! hover:border-red-500!'
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
