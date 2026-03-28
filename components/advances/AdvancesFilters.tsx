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
import { Trash2, SortAsc, SortDesc } from "lucide-react";
import SearchInput from "@/components/ui/SearchInput";

interface AdvancesFiltersProps {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  statusFilter: string;
  setStatusFilter: (status: string) => void;
  sortBy: string;
  setSortBy: (sort: string) => void;
  sortOrder: "asc" | "desc";
  setSortOrder: (order: "asc" | "desc") => void;
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
  isAdmin = false,
}: AdvancesFiltersProps) {
  return (
    <Card className='shadow-md border-none bg-white dark:bg-slate-900/40 backdrop-blur-sm rounded-3xl overflow-hidden mb-6'>
      <CardContent className='p-6'>
        <div className='flex flex-col lg:flex-row gap-4 items-end'>
          {/* Búsqueda */}
          <div className='w-full lg:flex-1'>
            <Label className='mb-2 block text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1'>
              {isAdmin ? "Filtrar por Usuario" : "Buscar en anticipos"}
            </Label>
            <SearchInput
              value={searchTerm}
              onChange={setSearchTerm}
              placeholder={isAdmin ? "Nombre o monto..." : "Buscar..."}
              className='w-full rounded-2xl bg-gray-50/50 dark:bg-slate-900/50 border-gray-200 dark:border-gray-800 h-10'
            />
          </div>

          {/* Estado */}
          <div className='w-full sm:w-auto min-w-[140px]'>
            <Label className='mb-2 block text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1'>
              Estado
            </Label>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className='w-full text-xs rounded-2xl bg-gray-50/50 dark:bg-slate-900/50 border-gray-200 dark:border-gray-800 h-10'>
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent className='rounded-xl border-gray-200 dark:border-gray-800'>
                <SelectItem value='all'>Todos</SelectItem>
                <SelectItem value='por_cobrar'>Por cobrar</SelectItem>
                <SelectItem value='pagado'>Pagado</SelectItem>
              </SelectContent>
            </Select>
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
                  <SelectItem value='fecha_crea'>Fecha Creación</SelectItem>
                  <SelectItem value='monto'>Monto</SelectItem>
                  <SelectItem value='usuario'>Usuario</SelectItem>
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
            <Select value={pageSize.toString()} onValueChange={(v) => setPageSize(parseInt(v))}>
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
      </CardContent>
    </Card>
  );
}