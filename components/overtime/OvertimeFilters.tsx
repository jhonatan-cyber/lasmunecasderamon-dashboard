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
import SearchInput from "@/components/shared/SearchInput";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface OvertimeFiltersProps {
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

export default function OvertimeFilters({
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
}: OvertimeFiltersProps) {
  return (
    <Card className='shadow-md border-none bg-white dark:bg-slate-900/40 backdrop-blur-sm rounded-3xl overflow-hidden mb-6'>
      <CardContent className='p-6'>
        <div className='flex flex-col lg:flex-row gap-4 items-end'>
          {/* Búsqueda */}
          <div className='w-full lg:flex-1'>
            <Label className='mb-2 block text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1'>
              {isAdmin ? "Filtrar por Usuario" : "Filtrar por Detalle"}
            </Label>
            <SearchInput
              value={searchTerm}
              onChange={setSearchTerm}
              placeholder={isAdmin ? "Nombre..." : "Motivo..."}
              className='w-full rounded-full bg-gray-100 dark:bg-slate-900/50 border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-100'
            />
          </div>

          {/* Estado */}
          <div className='w-full sm:w-auto min-w-[140px]'>
            <Label className='mb-2 block text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1'>
              Estado
            </Label>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className='w-full text-xs rounded-full bg-gray-100 dark:bg-slate-900/50 border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-100 h-10 font-bold'>
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent className='rounded-xl border-gray-200 dark:border-gray-800'>
                <SelectItem value='all'>Todos</SelectItem>
                <SelectItem value='por_cobrar'>Por pagar</SelectItem>
                <SelectItem value='cobrado'>Pagado</SelectItem>
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
                <SelectTrigger className='w-full text-xs rounded-full rounded-r-none border border-gray-300 dark:border-gray-700 bg-gray-100 dark:bg-slate-900/50 text-gray-900 dark:text-gray-100 h-10'>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className='rounded-xl border-gray-200 dark:border-gray-800'>
                  <SelectItem value='fecha_crea'>Creación</SelectItem>
                  <SelectItem value='fecha_mod'>Pago</SelectItem>
                  <SelectItem value='total'>Monto</SelectItem>
                  <SelectItem value='hora'>Horas</SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                className="h-10 w-10 rounded-full border border-gray-300 dark:border-gray-700 bg-gray-100 dark:bg-slate-900/50 text-gray-900 dark:text-gray-100 hover:bg-gray-200 dark:hover:bg-gray-700"
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
              <SelectTrigger className='w-full text-xs rounded-full bg-gray-100 dark:bg-slate-900/50 border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-100 h-10 font-bold'>
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
            className='w-10 h-10 flex items-center justify-center rounded-full border border-gray-300 dark:border-gray-700 shadow-sm bg-gray-100 dark:bg-slate-900/50 text-gray-900 dark:text-gray-100 transition-all duration-200 hover:scale-110 hover:!bg-red-500 hover:!text-white hover:!border-red-500'
            
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
