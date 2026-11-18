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
import { type Role } from '@/hooks/staff';

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
  /** Roles reales de la DB (via /api/roles). Mientras cargan, sólo "Todos". */
  roles?: Role[];
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
  setPage,
  roles
}: UserFiltersProps) {
  // Si dos roles compartieran nombre, el value repetido rompería el Select.
  const uniqueRoles = (roles ?? []).filter(
    (role, i, all) => all.findIndex(r => r.name.toLowerCase() === role.name.toLowerCase()) === i
  );

  const handlePageSizeChange = (value: number) => {
    setPageSize(value);
    setPage(1);
  };

  return (
    <Card className='shadow-sm border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-slate-900/40 backdrop-blur-xs rounded-2xl overflow-hidden'>
      <CardContent className='p-4 sm:p-6'>
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

          <div className='grid w-full grid-cols-[minmax(0,1fr)_2.5rem] items-end gap-3 sm:flex sm:flex-nowrap sm:gap-4 lg:w-auto'>
            {}
            <div className='order-2 col-span-2 w-full min-w-0 sm:order-2 sm:col-span-1 sm:w-auto'>
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
            <div className='order-1 col-span-2 w-full min-w-0 sm:order-1 sm:col-span-1 sm:w-auto sm:min-w-[160px]'>
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
                  {/* Nombres desde la DB: el filtro del server compara
                      LOWER(r.nombre) = LOWER(rol), así que el value debe ser el
                      nombre real del rol y no una etiqueta hardcodeada. */}
                  {uniqueRoles.map(role => (
                    <SelectItem key={role.id} value={role.name}>
                      {role.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {}
            <div className='order-3 col-span-1 min-w-0 sm:col-auto sm:w-auto'>
              <SelectElements
                value={pageSize}
                onChange={handlePageSizeChange}
                options={[5, 10, 20, 40]}
                label='LISTAR'
              />
            </div>

            {}
            <div className='order-4 col-span-1 flex justify-center sm:col-auto sm:w-auto'>
              <TooltipProvider>
                <Tooltip delayDuration={300}>
                  <TooltipTrigger asChild>
                    <div className='w-10 sm:w-auto'>
                      <Button
                        onClick={onClearFilters}
                        size='icon'
                        aria-label='Limpiar filtros'
                        className='h-10 w-10 flex items-center justify-center rounded-full border border-gray-300 dark:border-gray-700 shadow-xs bg-gray-100 dark:bg-slate-900/50 text-gray-900 dark:text-gray-100 transition-all duration-200 hover:scale-110 hover:bg-red-500! hover:text-white! hover:border-red-500!'
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
