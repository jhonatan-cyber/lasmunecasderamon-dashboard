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
import { Eraser } from 'lucide-react';
import SearchInput from '@/components/ui/SearchInput';
import SelectElements from '@/components/ui/select-elements';

interface UserFiltersProps {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  filterStatus: string;
  setFilterStatus: (status: string) => void;
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
    <Card className='shadow-sm'>
      <CardContent className='mt-3 p-4 sm:p-6'>
                 <div className='flex flex-col lg:flex-row gap-4 items-end'>
           {/* Buscador */}
           <div className='w-full lg:w-1/3'>
             <Label htmlFor='search' className='mb-2 text-sm'>
               Buscar
             </Label>
             <SearchInput
               id='search'
               value={searchTerm}
               onChange={setSearchTerm}
               placeholder='Buscar usuarios...'
               className='w-full text-sm'
             />
           </div>

           {/* Filtro de estado */}
           <div className='w-full lg:w-auto'>
             <Label htmlFor='status' className='mb-2 text-sm'>
               Estado
             </Label>
             <Select value={filterStatus} onValueChange={setFilterStatus}>
               <SelectTrigger id='status' className='w-full lg:w-[140px] text-sm rounded-full'>
                 <SelectValue />
               </SelectTrigger>
               <SelectContent>
                 <SelectItem value='all'>Todos</SelectItem>
                 <SelectItem value='active'>Activos</SelectItem>
                 <SelectItem value='inactive'>Inactivos</SelectItem>
               </SelectContent>
             </Select>
           </div>

           {/* Elementos por página */}
           <div className='w-full lg:w-auto'>
             <SelectElements
               value={pageSize}
               onChange={handlePageSizeChange}
               options={[5, 10, 20, 40]}
               label='Usuarios por página'
             />
           </div>

           {/* Botón limpiar filtros */}
           <div className='w-full lg:w-auto'>
             <Button
               onClick={onClearFilters}
               size='sm'
               variant='outline'
               className='w-full lg:w-auto rounded-full px-4 text-sm'
             >
               <Eraser className='w-3 h-3 mr-1' />
               Limpiar
             </Button>
           </div>
         </div>
      </CardContent>
    </Card>
  );
}
