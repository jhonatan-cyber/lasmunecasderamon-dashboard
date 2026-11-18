'use client';
import { SortSelect } from '@/components/shared/selects/SortSelect';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Trash2 } from 'lucide-react';
import SearchInput from '@/components/shared/SearchInput';
import { FilterSelect } from '@/components/shared/selects';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface AdvancesFiltersProps {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  statusFilter: string;
  setStatusFilter: (status: string) => void;
  sortBy: string;
  setSortBy: (sort: string) => void;
  sortOrder: 'asc' | 'desc';
  setSortOrder: (order: 'asc' | 'desc') => void;
  pageSize: number;
  setPageSize: (size: number) => void;
  onClearFilters: () => void;
  loading: boolean;
  isAdmin?: boolean;
}

export default function AdvancesFilters({
  searchTerm,
  setSearchTerm,
  statusFilter,
  setStatusFilter,
  sortBy,
  setSortBy,
  sortOrder,
  setSortOrder,
  pageSize,
  setPageSize,
  onClearFilters,
  loading,
  isAdmin = false
}: AdvancesFiltersProps) {
  return (
    <Card className='shadow-sm border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-slate-900/40 backdrop-blur-xs rounded-2xl overflow-hidden mb-6'>
      <CardContent className='p-4 sm:p-6'>
        {}
        <div className='block lg:hidden space-y-3'>
          <div>
            <Label className='mb-1 block text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1'>
              {isAdmin ? 'Filtrar por Usuario' : 'Filtrar por Detalle'}
            </Label>
            <SearchInput
              value={searchTerm}
              onChange={setSearchTerm}
              placeholder={isAdmin ? 'Nombre o monto...' : 'Buscar...'}
              className='w-full rounded-full bg-gray-100 dark:bg-slate-900/50 border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-100'
            />
          </div>
          <div className='w-full min-w-0'>
            <FilterSelect
              value={statusFilter}
              onChange={setStatusFilter}
              label='Estado'
              placeholder='Todos'
              options={[
                { value: 'all', label: 'Todos' },
                { value: 'por_cobrar', label: 'Por cobrar' },
                { value: 'pagado', label: 'Pagado' }
              ]}
            />
          </div>
          <SortSelect
            className='w-full min-w-0'
            field={sortBy}
            direction={sortOrder}
            options={[
              { value: 'fecha_crea', label: 'Creación' },
              { value: 'monto', label: 'Monto' },
              { value: 'usuario', label: 'Usuario' }
            ]}
            onChange={(field, direction) => {
              setSortBy(field as typeof sortBy);
              setSortOrder(direction);
            }}
          />
          <div className='flex w-full min-w-0 items-end gap-2'>
            <div className='min-w-0 flex-1'>
              <FilterSelect
                value={pageSize.toString()}
                onChange={v => setPageSize(parseInt(v))}
                label='Mostrar'
                placeholder='10'
                options={[
                  { value: '5', label: '5 Datos' },
                  { value: '10', label: '10 Datos' },
                  { value: '20', label: '20 Datos' },
                  { value: '50', label: '50 Datos' }
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
                      onClick={onClearFilters}
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
        <div className='hidden lg:grid grid-cols-1 md:grid-cols-2 lg:grid-cols-[1fr_auto_auto_auto_auto] gap-4 items-end w-full'>
          <div>
            <Label className='mb-2 block text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1'>
              {isAdmin ? 'Filtrar por Usuario' : 'Filtrar por Detalle'}
            </Label>
            <SearchInput
              value={searchTerm}
              onChange={setSearchTerm}
              placeholder={isAdmin ? 'Nombre o monto...' : 'Buscar...'}
              className='w-full rounded-full bg-gray-100 dark:bg-slate-900/50 border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-100'
            />
          </div>

          <div>
            <FilterSelect
              value={statusFilter}
              onChange={setStatusFilter}
              label='Estado'
              placeholder='Todos'
              options={[
                { value: 'all', label: 'Todos' },
                { value: 'por_cobrar', label: 'Por cobrar' },
                { value: 'pagado', label: 'Pagado' }
              ]}
            />
          </div>

          <SortSelect
            className='w-full'
            field={sortBy}
            direction={sortOrder}
            options={[
              { value: 'fecha_crea', label: 'Creación' },
              { value: 'monto', label: 'Monto' },
              { value: 'usuario', label: 'Usuario' }
            ]}
            onChange={(field, direction) => {
              setSortBy(field as typeof sortBy);
              setSortOrder(direction);
            }}
          />

          <div>
            <FilterSelect
              value={pageSize.toString()}
              onChange={v => setPageSize(parseInt(v))}
              label='Mostrar'
              placeholder='10'
              options={[
                { value: '5', label: '5 Datos' },
                { value: '10', label: '10 Datos' },
                { value: '20', label: '20 Datos' },
                { value: '50', label: '50 Datos' }
              ]}
            />
          </div>

          <div className='flex justify-end'>
            <TooltipProvider>
              <Tooltip delayDuration={300}>
                <TooltipTrigger asChild>
                  <Button
                    onClick={onClearFilters}
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
        </div>
      </CardContent>
    </Card>
  );
}
