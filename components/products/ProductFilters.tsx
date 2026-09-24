'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import SearchInput from '@/components/shared/SearchInput';
import { Trash2, Table, Grid3X3 } from 'lucide-react';
import SelectElements from '@/components/shared/SelectElements';
import { cn } from '@/lib/utils/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';

interface ProductFiltersProps {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  filterStatus: number | null;
  setFilterStatus: (status: number | null) => void;
  onClearFilters: () => void;
  pageSize: number;
  setPageSize: (value: number) => void;
  setPage: (value: number) => void;
  viewMode: 'table' | 'cards';
  showStatusFilter?: boolean;
  showTableView: boolean;
  onToggleView: () => void;
}

export function ProductFilters({
  searchTerm,
  setSearchTerm,
  filterStatus,
  setFilterStatus,
  onClearFilters,
  pageSize,
  setPageSize,
  setPage,
  viewMode,
  showStatusFilter = true,
  showTableView,
  onToggleView
}: ProductFiltersProps) {
  const tablePageSizes = [5, 10, 20, 40];
  const cardPageSizes = [8, 12, 24, 48];

  const handlePageSizeChange = (value: number) => {
    setPageSize(value);
    setPage(1);
  };

  return (
    <Card className='shadow-md border-none bg-white dark:bg-slate-900/40 backdrop-blur-xs rounded-3xl overflow-hidden'>
      <CardContent className='p-6'>
        <div className='flex flex-col lg:flex-row gap-6 items-end'>
          {}
          <div className='w-full lg:flex-1'>
            <Label
              htmlFor='search'
              className='mb-2 block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 ml-1'
            >
              Buscar Productos
            </Label>
            <SearchInput
              id='search'
              value={searchTerm}
              onChange={setSearchTerm}
              placeholder='Nombre o código...'
              className='w-full rounded-full bg-gray-100 dark:bg-slate-900/50 border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-100'
            />
          </div>

          <div className='w-full lg:w-auto grid grid-cols-2 gap-4 lg:flex lg:gap-4 lg:items-end'>
            {}
            <div>
              <Label className='mb-2 block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 ml-1'>
                Vista
              </Label>
              <Button
                variant='outline'
                onClick={onToggleView}
                className={cn(
                  'flex h-10 items-center gap-2 rounded-full hover:scale-105 transition-all duration-200 text-xs sm:text-sm w-full sm:w-auto',
                  showTableView ? 'bg-blue-50 text-blue-700 border-blue-300' : ''
                )}
              >
                {showTableView ? (
                  <>
                    <Table className='w-4 h-4' />
                    Tabla
                  </>
                ) : (
                  <>
                    <Grid3X3 className='w-4 h-4' />
                    Cards
                  </>
                )}
              </Button>
            </div>

            {}
            {showStatusFilter && (
              <div className='min-w-[160px]'>
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
            )}

            {}
            <div className='flex items-end gap-2'>
              <div>
                <SelectElements
                  value={pageSize}
                  onChange={handlePageSizeChange}
                  options={viewMode === 'table' ? tablePageSizes : cardPageSizes}
                  label='Mostrar'
                />
              </div>

              <TooltipProvider>
                <Tooltip delayDuration={300}>
                  <TooltipTrigger asChild>
                    <div>
                      <Button
                        onClick={onClearFilters}
                        size='icon'
                        aria-label='Limpiar filtros'
                        className='w-10 h-10 flex items-center justify-center rounded-full border border-gray-300 dark:border-gray-700 shadow-xs bg-gray-100 dark:bg-slate-900/50 text-gray-900 dark:text-gray-100 transition-all duration-200 hover:scale-110 hover:bg-red-500! hover:text-white! hover:border-red-500!'
                      >
                        <Trash2 className='w-4 h-4' />
                      </Button>
                    </div>
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
