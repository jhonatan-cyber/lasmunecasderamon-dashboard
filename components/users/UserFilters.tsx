'use client';

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { Trash2 } from 'lucide-react';
import SearchInput from '@/components/shared/SearchInput';
import SelectElements from '@/components/shared/SelectElements';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface UserFiltersProps {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  filterStatus: string;
  setFilterStatus: (status: string) => void;
  filterRole: string;
  setFilterRole: (role: string) => void;
  onClearFilters: () => void;
  pageSize: number;
  setPageSize: (size: number) => void;
  setPage: (page: number) => void;
}

export function UserFilters({
  searchTerm,
  setSearchTerm,
  filterStatus,
  setFilterStatus,
  filterRole,
  setFilterRole,
  onClearFilters,
  pageSize,
  setPageSize,
  setPage
}: UserFiltersProps) {
  const handlePageSizeChange = (value: number) => {
    setPageSize(value);
    setPage(1);
  };

  return (
    <Card className='shadow-md border-none bg-white dark:bg-slate-900/40 backdrop-blur-xs rounded-3xl overflow-hidden'>
      <CardContent className='p-3 sm:p-6'>
        <div className='flex flex-col lg:flex-row gap-6 items-end'>
          {}
          <div className='w-full lg:flex-1'>
            <Label
              htmlFor='search'
              className='mb-2 block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 ml-1'
            >
              Buscar Usuarios
            </Label>
            <SearchInput
              id='search'
              value={searchTerm}
              onChange={setSearchTerm}
              placeholder='Nombre, RUT o Email...'
              className='w-full rounded-full bg-gray-100 dark:bg-slate-900/50 border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-100'
            />
          </div>

          <div className='flex flex-wrap sm:flex-nowrap gap-4 w-full lg:w-auto items-end'>
            {}
            <div className='w-[calc(50%-0.5rem)] sm:w-auto min-w-0 sm:min-w-[140px] order-1'>
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
                  <SelectItem value='all'>Todos</SelectItem>
                  <SelectItem value='active'>Activos</SelectItem>
                  <SelectItem value='inactive'>Inactivos</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {}
            <div className='w-[70%] sm:w-auto min-w-0 sm:min-w-[160px] order-3 sm:order-0'>
              <Label
                htmlFor='role'
                className='mb-2 block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 ml-1'
              >
                Rol
              </Label>
              <Select value={filterRole} onValueChange={setFilterRole}>
                <SelectTrigger id='role'>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='all'>Todos los roles</SelectItem>
                  <SelectItem value='administrador'>Administrador</SelectItem>
                  <SelectItem value='cajero'>Cajero</SelectItem>
                  <SelectItem value='garzon'>Garzón</SelectItem>
                  <SelectItem value='anfitriona'>Anfitriona</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {}
            <div className='w-[calc(50%-0.5rem)] sm:w-auto order-2 sm:order-0'>
              <SelectElements
                value={pageSize}
                onChange={handlePageSizeChange}
                options={[5, 10, 20, 40]}
                label='LISTAR'
              />
            </div>

            {}
            <div className='w-[20%] sm:w-auto order-4 sm:order-0'>
              <TooltipProvider>
                <Tooltip delayDuration={300}>
                  <TooltipTrigger asChild>
                    <div className='w-full sm:w-auto'>
                      <Button
                        onClick={onClearFilters}
                        size='icon'
                        className='w-full sm:w-10 h-10 flex items-center justify-center rounded-full border border-gray-300 dark:border-gray-700 shadow-xs bg-gray-100 dark:bg-slate-900/50 text-gray-900 dark:text-gray-100 transition-all duration-200 hover:scale-110 hover:bg-red-500! hover:text-white! hover:border-red-500!'
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
