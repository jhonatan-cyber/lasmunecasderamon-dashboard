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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

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
  <Card className='mb-4 sm:mb-6 shadow-xs'>
    <CardContent className='p-4 sm:p-6'>
      {}
      <div className='block lg:hidden space-y-3'>
        <div>
          <Label
            htmlFor='search-mobile'
            className='mb-1 block text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1'
          >
            Buscar
          </Label>
          <div className='relative'>
            <Search className='absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-3 h-3' />
            <Input
              id='search-mobile'
              placeholder='Buscar por código, cliente o habitación...'
              value={filters.searchTerm}
              onChange={e => updateFilter('searchTerm', e.target.value)}
              className='pl-8 text-sm rounded-full bg-gray-100 dark:bg-slate-900/50 border-gray-300 dark:border-gray-700'
            />
          </div>
        </div>
        <div className='flex gap-2 items-end'>
          <div className='flex-1 min-w-0'>
            <Label
              htmlFor='payment-mobile'
              className='mb-1 block text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1'
            >
              Método de pago
            </Label>
            <Select
              value={filters.paymentFilter}
              onValueChange={(value: string) => updateFilter('paymentFilter', value)}
            >
              <SelectTrigger id='payment-mobile'>
                <SelectValue placeholder='Seleccionar método' />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='all'>Todos</SelectItem>
                <SelectItem value='efectivo'>Efectivo</SelectItem>
                <SelectItem value='tarjeta'>Tarjeta</SelectItem>
                <SelectItem value='transferencia'>Transferencia</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className='flex-1 min-w-0'>
            <Label
              htmlFor='list-mobile'
              className='mb-1 block text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1'
            >
              Listado
            </Label>
            <Select
              value={String(filters.rowsPerPage)}
              onValueChange={(v: string) => updateFilter('rowsPerPage', Number(v))}
            >
              <SelectTrigger id='list-mobile'>
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
          <div className='flex items-end'>
            <Label className='mb-1 block text-[10px] font-black uppercase tracking-widest text-gray-400 invisible'>
              Limp
            </Label>
            <TooltipProvider>
              <Tooltip delayDuration={300}>
                <TooltipTrigger asChild>
                  <Button
                    onClick={clearFilters}
                    variant='outline'
                    size='icon'
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
      <div className='hidden lg:flex flex-row gap-4 items-end'>
        <div className='flex-1'>
          <Label
            htmlFor='search'
            className='mb-2 block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 ml-1'
          >
            Buscar
          </Label>
          <div className='relative'>
            <Search className='absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4' />
            <Input
              id='search'
              placeholder='Buscar por código, cliente o habitación...'
              value={filters.searchTerm}
              onChange={e => updateFilter('searchTerm', e.target.value)}
              className='pl-10 rounded-full bg-gray-100 dark:bg-slate-900/50 border-gray-300 dark:border-gray-700'
            />
          </div>
        </div>

        <div className='min-w-[180px]'>
          <Label
            htmlFor='payment'
            className='mb-2 block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 ml-1'
          >
            Método de pago
          </Label>
          <Select
            value={filters.paymentFilter}
            onValueChange={(value: string) => updateFilter('paymentFilter', value)}
          >
            <SelectTrigger id='payment'>
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

        <div className='min-w-[140px]'>
          <Label
            htmlFor='list'
            className='mb-2 block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 ml-1'
          >
            Listado
          </Label>
          <Select
            value={String(filters.rowsPerPage)}
            onValueChange={(v: string) => updateFilter('rowsPerPage', Number(v))}
          >
            <SelectTrigger id='list'>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='5'>Listar 5</SelectItem>
              <SelectItem value='10'>Listar 10</SelectItem>
              <SelectItem value='20'>Listar 20</SelectItem>
              <SelectItem value='40'>Listar 40</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className='flex items-end'>
          <Label className='mb-2 block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 invisible'>
            Limpiar
          </Label>
          <TooltipProvider>
            <Tooltip delayDuration={300}>
              <TooltipTrigger asChild>
                <Button
                  onClick={clearFilters}
                  variant='outline'
                  size='icon'
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
