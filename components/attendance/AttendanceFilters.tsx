import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import SelectElements from "@/components/ui/select-elements";
import SearchInput from "@/components/ui/SearchInput";
import { Trash2, SortAsc, SortDesc } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface AttendanceFiltersProps {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  sortBy: string;
  setSortBy: (sort: string) => void;
  sortOrder: "asc" | "desc";
  setSortOrder: (order: "asc" | "desc") => void;
  pageSize: number;
  setPageSize: (size: number) => void;
  setPage: (page: number) => void;
  onClearFilters: () => void;
}

export default function AttendanceFilters({
  searchTerm,
  setSearchTerm,
  sortBy,
  setSortBy,
  sortOrder,
  setSortOrder,
  pageSize,
  setPageSize,
  setPage,
  onClearFilters,
}: AttendanceFiltersProps) {
  const handlePageSizeChange = (value: number) => {
    setPageSize(value);
    setPage(1);
  };

  return (
    <Card className='shadow-md border-none bg-white dark:bg-slate-900/40 backdrop-blur-sm rounded-3xl overflow-hidden mb-6'>
      <CardContent className='p-6'>
        <div className='flex flex-col lg:flex-row gap-4 items-end'>
          {/* Búsqueda */}
          <div className='w-full lg:flex-1'>
            <Label className='mb-2 block text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1'>
              Buscar
            </Label>
            <SearchInput
              value={searchTerm}
              onChange={setSearchTerm}
              placeholder='Buscar por nombre, nick...'
              className='w-full rounded-2xl bg-gray-50/50 dark:bg-slate-900/50 border-gray-200 dark:border-gray-800 h-10'
            />
          </div>

          {/* Ordenar */}
          <div className='w-full sm:w-auto min-w-[180px]'>
            <Label className='mb-2 block text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1'>
              Ordenar por
            </Label>
            <div className="flex gap-1">
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className='w-full text-xs rounded-l-2xl rounded-r-none bg-gray-50/50 dark:bg-slate-900/50 border-gray-200 dark:border-gray-800 h-10'>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className='rounded-xl border-gray-200 dark:border-gray-800'>
                  <SelectItem value='nombre_completo'>Nombre</SelectItem>
                  <SelectItem value='nick'>Nick</SelectItem>
                  <SelectItem value='total_asistencias'>Asistencias</SelectItem>
                  <SelectItem value='sueldo_total'>Sueldo</SelectItem>
                  <SelectItem value='aporte_total'>Aporte</SelectItem>
                  <SelectItem value='descuento_total'>Descuento</SelectItem>
                  <SelectItem value='total_final'>Total</SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                className="h-10 w-10 rounded-r-2xl border-l-0 border-gray-200 dark:border-gray-800 bg-gray-50/50 rounded-l-none"
              >
                {sortOrder === 'asc' ? <SortAsc className="h-4 w-4" /> : <SortDesc className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          {/* Mostrar (PageSize) */}
          <div className='w-full sm:w-auto min-w-[100px]'>
            <Label className='mb-2 block text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1'>
              Mostrar
            </Label>
            <Select value={pageSize.toString()} onValueChange={(v) => handlePageSizeChange(parseInt(v))}>
              <SelectTrigger className='w-full text-xs rounded-2xl bg-gray-50/50 dark:bg-slate-900/50 border-gray-200 dark:border-gray-800 h-10 font-bold'>
                <SelectValue />
              </SelectTrigger>
              <SelectContent className='rounded-xl border-gray-200 dark:border-gray-800'>
                <SelectItem value='5'>5</SelectItem>
                <SelectItem value='10'>10</SelectItem>
                <SelectItem value='20'>20</SelectItem>
                <SelectItem value='50'>50</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Botón Limpiar con ícono trash */}
          <TooltipProvider>
            <Tooltip delayDuration={300}>
              <TooltipTrigger asChild>
                <Button
            onClick={onClearFilters}
            variant='outline'
            size="icon"
            className='w-10 h-10 flex items-center justify-center rounded-2xl border-gray-200 dark:border-gray-800 hover:scale-110 transition-all duration-200 hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black shadow-sm'
            
          >
            <Trash2 className='w-4 h-4' />
          </Button>
              </TooltipTrigger>
              <TooltipContent className="bg-black text-white dark:bg-white dark:text-black rounded-xl border-none text-xs font-bold px-3 py-1.5 shadow-xl">
                <p>Limpiar filtros</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </CardContent>
    </Card>
  );
}
