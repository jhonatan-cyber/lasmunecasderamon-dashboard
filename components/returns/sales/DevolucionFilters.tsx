 
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { Search, Trash2 } from 'lucide-react';
import { DevolucionFilters } from '@/hooks/servicios/useDevolucionFilters';

interface DevolucionFiltersProps {
  filters: DevolucionFilters;
  updateFilter: (key: keyof DevolucionFilters, value: any) => void;
  clearFilters: () => void;
}

export const DevolucionFiltersComponent = ({ 
  filters, 
  updateFilter, 
  clearFilters 
}: DevolucionFiltersProps) => (
  <Card className='mb-4 sm:mb-6 shadow-sm'>
    <CardContent className='pt-6 p-4 sm:p-6'>
      <div className='flex flex-col gap-4 sm:gap-6'>
        {/* Búsqueda - Ocupa todo el ancho en móviles */}
        <div className='w-full'>
          <Label htmlFor='search' className='mb-2 text-sm sm:text-base'>
            Buscar
          </Label>
          <div className='relative'>
            <Search className='absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-3 h-3 sm:w-4 sm:h-4' />
            <Input
              id='search'
              placeholder='Buscar por código, cliente o habitación...'
              value={filters.searchTerm}
              onChange={e => updateFilter('searchTerm', e.target.value)}
              className='pl-10 text-sm sm:text-base'
            />
          </div>
        </div>

        {/* Controles - Responsive layout */}
        <div className='flex flex-col sm:flex-row gap-4 sm:gap-6 items-stretch sm:items-end justify-center'>
          {/* Método de pago */}
          <div className='flex-1 sm:flex-none'>
            <Label htmlFor='payment' className='mb-2 text-sm sm:text-base'>
              Método de pago
            </Label>
            <Select value={filters.paymentFilter} onValueChange={value => updateFilter('paymentFilter', value)}>
              <SelectTrigger id='payment' className='w-full sm:w-[180px] rounded-full text-sm sm:text-base'>
                <SelectValue placeholder='Seleccionar método' />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='all'>Todos los métodos</SelectItem>
                <SelectItem value='efectivo'>Efectivo</SelectItem>
                <SelectItem value='tarjeta'>Tarjeta</SelectItem>
                <SelectItem value='transferencia'>Transferencia</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Listado */}
          <div className='flex-1 sm:flex-none'>
            <Label htmlFor='list' className='mb-2 text-sm sm:text-base'>
              Listado
            </Label>
            <Select
              value={String(filters.rowsPerPage)}
              onValueChange={v => updateFilter('rowsPerPage', Number(v))}
            >
              <SelectTrigger id='rowsPerPage' className='w-full sm:w-[180px] rounded-full text-sm sm:text-base'>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='5'>Listar 5 elementos</SelectItem>
                <SelectItem value='10'>Listar 10 elementos</SelectItem>
                <SelectItem value='20'>Listar 20 elementos</SelectItem>
                <SelectItem value='40'>Listar 40 elementos</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Botón limpiar filtros */}
          <div className='flex-1 sm:flex-none'>
            <Button
              onClick={clearFilters}
              variant='outline'
              size="icon"
              className='w-10 h-10 flex items-center justify-center rounded-2xl border-gray-200 dark:border-gray-800 hover:scale-110 transition-all duration-200 hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black shadow-sm'
              title="Limpiar filtros"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </CardContent>
  </Card>
); 
