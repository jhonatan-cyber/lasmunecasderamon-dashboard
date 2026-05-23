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
import SelectElements from '@/components/shared/SelectElements';
import SearchInput from '@/components/shared/SearchInput';
import FilterSelect from '@/components/shared/selects/FilterSelect';
import { Trash2, SortAsc, SortDesc } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface AttendanceFiltersProps {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  filterRole: string;
  setFilterRole: (role: string) => void;
  sortBy: string;
  setSortBy: (sort: string) => void;
  sortOrder: 'asc' | 'desc';
  setSortOrder: (order: 'asc' | 'desc') => void;
  pageSize: number;
  setPageSize: (size: number) => void;
  setPage: (page: number) => void;
  onClearFilters: () => void;
}

export default function AttendanceFilters({
  searchTerm,
  setSearchTerm,
  filterRole,
  setFilterRole,
  sortBy,
  setSortBy,
  sortOrder,
  setSortOrder,
  pageSize,
  setPageSize,
  setPage,
  onClearFilters
}: AttendanceFiltersProps) {
  const handlePageSizeChange = (value: number) => {
    setPageSize(value);
    setPage(1);
  };

  return (
    <Card className='shadow-md border-none bg-white dark:bg-slate-900/40 backdrop-blur-sm rounded-3xl overflow-hidden'>
      <CardContent className='p-6'>
        <div className='flex flex-col lg:flex-row gap-6 items-end w-full'>
          {/* Búsqueda */}
          <div className='w-full lg:flex-1'>
            <Label className='mb-2 block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 ml-1'>
              Buscar
            </Label>
            <SearchInput
              value={searchTerm}
              onChange={setSearchTerm}
              placeholder='Buscar por nombre, nick...'
              className='w-full rounded-full bg-gray-100 dark:bg-slate-900/50 border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-100'
            />
          </div>

          <div className='grid grid-cols-5 gap-2 sm:flex sm:flex-nowrap sm:gap-4 w-full lg:w-auto items-end'>
            {/* Filtro de rol */}
            <div className='col-span-3 sm:col-auto min-w-0 sm:min-w-[160px] order-1 sm:order-none'>
              <FilterSelect
                value={filterRole}
                onChange={setFilterRole}
                label='Rol'
                placeholder='Todos los roles'
                options={[
                  { value: 'all', label: 'Todos los roles' },
                  { value: 'administrador', label: 'Administrador' },
                  { value: 'cajero', label: 'Cajero' },
                  { value: 'garzon', label: 'Garzón' },
                  { value: 'anfitriona', label: 'Anfitriona' }
                ]}
              />
            </div>

            {/* Ordenar */}
            <div className='col-span-3 sm:col-auto min-w-0 sm:min-w-[180px] order-4 sm:order-none'>
              <FilterSelect
                value={sortBy}
                onChange={setSortBy}
                label='Ordenar por'
                placeholder='Nombre'
                options={[
                  { value: 'nombre_completo', label: 'Nombre' },
                  { value: 'nick', label: 'Nick' },
                  { value: 'total_asistencias', label: 'Asistencias' },
                  { value: 'sueldo_total', label: 'Sueldo' },
                  { value: 'aporte_total', label: 'Aporte' },
                  { value: 'descuento_total', label: 'Descuento' },
                  { value: 'total_final', label: 'Total' }
                ]}
              />
            </div>

            {/* Botón de ordenamiento */}
            <div className='col-span-1 sm:col-auto flex items-end justify-center order-2 sm:order-none'>
              <Label className='mb-2 block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 ml-1'>
                &nbsp;
              </Label>
              <Button
                variant='outline'
                size='icon'
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

            {/* Elementos por página */}
            <div className='col-span-2 sm:col-auto min-w-0 sm:min-w-[140px] order-5 sm:order-none'>
              <FilterSelect
                value={pageSize.toString()}
                onChange={value => handlePageSizeChange(parseInt(value))}
                label='Elementos'
                placeholder='10'
                options={[
                  { value: '5', label: '5 Datos' },
                  { value: '10', label: '10 Datos' },
                  { value: '20', label: '20 Datos' },
                  { value: '40', label: '40 Datos' }
                ]}
              />
            </div>

            {/* Botón limpiar filtros */}
            <div className='col-span-1 sm:col-auto flex justify-center sm:justify-start order-3 sm:order-none'>
              <TooltipProvider>
                <Tooltip delayDuration={300}>
                  <TooltipTrigger asChild>
                    <Button
                      onClick={onClearFilters}
                      size='icon'
                      className='w-10 h-10 flex items-center justify-center rounded-full border border-gray-300 dark:border-gray-700 shadow-sm bg-gray-100 dark:bg-slate-900/50 text-gray-900 dark:text-gray-100 transition-all duration-200 hover:scale-110 hover:!bg-red-500 hover:!text-white hover:!border-red-500'
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
}
