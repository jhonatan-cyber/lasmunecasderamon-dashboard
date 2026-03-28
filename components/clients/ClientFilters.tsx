"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Trash2 } from "lucide-react";
import SearchInput from "@/components/ui/SearchInput";
import SelectElements from "@/components/ui/select-elements";

interface ClientFiltersProps {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  filterStatus: number | null;
  setFilterStatus: (status: number | null) => void;
  onClearFilters: () => void;
  pageSize: number;
  setPageSize: (size: number) => void;
  setPage: (page: number) => void;
}

export function ClientFilters({
  searchTerm,
  setSearchTerm,
  filterStatus,
  setFilterStatus,
  onClearFilters,
  pageSize,
  setPageSize,
  setPage,
}: ClientFiltersProps) {
  const handlePageSizeChange = (value: number) => {
    setPageSize(value);
    setPage(1);
  };

  return (
    <Card className='shadow-md border-none bg-white dark:bg-slate-900/40 backdrop-blur-sm rounded-3xl overflow-hidden'>
      <CardContent className='p-6'>
        <div className='flex flex-col lg:flex-row gap-6 items-end'>
          {/* Búsqueda */}
          <div className='w-full lg:flex-1'>
            <Label htmlFor='search' className='mb-2 block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 ml-1'>
              Buscar Clientes
            </Label>
            <SearchInput
              id='search'
              value={searchTerm}
              onChange={setSearchTerm}
              placeholder='Nombre, RUT, Email o Teléfono...'
              className='w-full rounded-2xl bg-gray-50/50 dark:bg-slate-900/50 border-gray-200 dark:border-gray-800'
            />
          </div>

          <div className='flex flex-wrap sm:flex-nowrap gap-4 w-full lg:w-auto items-end'>
            {/* Filtro de estado */}
            <div className='w-full sm:w-auto min-w-[160px]'>
              <Label htmlFor='status' className='mb-2 block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 ml-1'>
                Estado
              </Label>
              <Select
                value={filterStatus === null ? 'all' : String(filterStatus)}
                onValueChange={value => setFilterStatus(value === 'all' ? null : Number(value))}
              >
                <SelectTrigger
                  id='status'
                  className='w-full text-sm rounded-2xl bg-gray-50/50 dark:bg-slate-900/50 border-gray-200 dark:border-gray-800 h-10'
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className='rounded-xl border-gray-200 dark:border-gray-800'>
                  <SelectItem value='all'>Todos los estados</SelectItem>
                  <SelectItem value='1'>Activos</SelectItem>
                  <SelectItem value='0'>Inactivos</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Elementos por página */}
            <div className='w-full sm:w-auto'>
              <SelectElements
                value={pageSize}
                onChange={handlePageSizeChange}
                options={[5, 10, 20, 40]}
                label='Mostrar'
              />
            </div>

            {/* Botón limpiar filtros */}
            <div className='w-full sm:w-auto'>
              <Button
                onClick={onClearFilters}
                variant='outline'
                size="icon"
                className='w-10 h-10 flex items-center justify-center rounded-2xl border-gray-200 dark:border-gray-800 hover:scale-110 transition-all duration-200 hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black shadow-sm'
                title="Limpiar filtros"
              >
                <Trash2 className='w-4 h-4' />
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
