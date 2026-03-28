'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Table, Grid3X3, Plus } from 'lucide-react';

interface RoomsHeaderProps {
  showTableView: boolean;
  setShowTableView: (show: boolean) => void;
  canCreate: boolean;
  onNew: () => void;
}

export function RoomsHeader({
  showTableView,
  setShowTableView,
  canCreate,
  onNew
}: RoomsHeaderProps) {
  return (
    <div className='flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 sm:gap-6'>
      <h1 className='text-xl sm:text-2xl lg:text-3xl font-bold'>Habitaciones</h1>
      <div className='flex flex-col sm:flex-row gap-2 items-center'>
        <div className='flex gap-2 items-center'>
          <Button
            variant={showTableView ? 'default' : 'outline'}
            size='sm'
            onClick={() => setShowTableView(true)}
            className='rounded-full hover:scale-105 transition-all duration-200 text-xs sm:text-sm'
          >
            <Table className='w-3 h-3 sm:w-4 sm:h-4 mr-1' />
            Tabla
          </Button>
          <Button
            variant={!showTableView ? 'default' : 'outline'}
            size='sm'
            onClick={() => setShowTableView(false)}
            className='rounded-full hover:scale-105 transition-all duration-200 text-xs sm:text-sm'
          >
            <Grid3X3 className='w-3 h-3 sm:w-4 sm:h-4 mr-1' />
            Cards
          </Button>
        </div>
        {canCreate && (
          <Button
            variant='outline'
            size='sm'
            onClick={onNew}
            className='whitespace-nowrap inline-flex items-center bg-black text-white rounded-full hover:scale-105 transition-all duration-200 text-sm sm:text-base w-full sm:w-auto px-4 sm:px-6 py-2'
          >
            <Plus className='w-3 h-3 sm:w-4 sm:h-4 mr-1' />
            Nueva Habitacion
          </Button>
        )}
      </div>
    </div>
  );
}
