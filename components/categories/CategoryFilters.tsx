import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import SearchInput from '@/components/shared/SearchInput';
import { Trash2 } from 'lucide-react';
import SelectElements from '@/components/shared/SelectElements';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';

interface CategoryFiltersProps {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  filterStatus: string;
  setFilterStatus: (status: string) => void;
  onClearFilters: () => void;
  pageSize: number;
  setPageSize: (value: number) => void;
  setPage: (value: number) => void;
}

export function CategoryFilters({
  searchTerm,
  setSearchTerm,
  filterStatus,
  setFilterStatus,
  onClearFilters,
  pageSize,
  setPageSize,
  setPage
}: CategoryFiltersProps) {
  const handlePageSizeChange = (value: number) => {
    setPageSize(value);
    setPage(1);
  };

  return (
    <Card className='shadow-md border-none bg-white dark:bg-slate-900/40 backdrop-blur-sm rounded-3xl overflow-hidden'>
      <CardContent className='p-6'>
        <div className='flex flex-col lg:flex-row gap-6 items-end'>
          {}
          <div className='w-full lg:flex-1'>
            <Label
              htmlFor='search'
              className='mb-2 block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 ml-1'
            >
              Buscar Categoría
            </Label>
            <SearchInput
              id='search'
              value={searchTerm}
              onChange={setSearchTerm}
              placeholder='Nombre de la categoría...'
              className='w-full rounded-full bg-gray-100 dark:bg-slate-900/50 border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-100'
            />
          </div>

          <div className='flex flex-wrap sm:flex-nowrap gap-4 w-full lg:w-auto items-end'>
            {}
            <div className='w-full sm:w-auto min-w-[160px]'>
              <Label
                htmlFor='status'
                className='mb-2 block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 ml-1'
              >
                Estado
              </Label>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger id='status'>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='all'>Todos los estados</SelectItem>
                  <SelectItem value='1'>Activas</SelectItem>
                  <SelectItem value='0'>Inactivas</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {}
            <div className='w-full sm:w-auto'>
              <SelectElements
                value={pageSize}
                onChange={handlePageSizeChange}
                options={[12, 24, 36, 48]}
                label='LISTAR'
              />
            </div>

            {}
            <div className='w-full sm:w-auto'>
              <TooltipProvider>
                <Tooltip delayDuration={300}>
                  <TooltipTrigger asChild>
                    <div>
                      <Button
                        onClick={onClearFilters}
                        size='icon'
                        className='w-10 h-10 flex items-center justify-center rounded-full border border-gray-300 dark:border-gray-700 shadow-sm bg-gray-100 dark:bg-slate-900/50 text-gray-900 dark:text-gray-100 transition-all duration-200 hover:scale-110 hover:!bg-red-500 hover:!text-white hover:!border-red-500'
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
