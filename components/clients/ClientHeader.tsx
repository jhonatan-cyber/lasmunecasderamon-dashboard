'use client';

import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ExportButtons } from '@/components/clients/ExportButtons';
import { PermissionGuard } from '@/components/auth/PermissionGuard';
import { Client } from '@/types/client';

interface ClientHeaderProps {
  allClients: Client[];
  onCreateClick: () => void;
}

export function ClientHeader({ allClients, onCreateClick }: ClientHeaderProps) {
  return (
    <div className='flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 sm:gap-6 mb-4 sm:mb-6'>
      <div className='flex flex-col'>
        <h1 className='text-xl sm:text-2xl lg:text-3xl font-bold'>Clientes</h1>
        <p className='text-sm sm:text-base text-gray-600'>
          Gestiona todos los clientes de la plataforma.
        </p>
      </div>
      <div className='flex flex-col sm:flex-row gap-2 w-full sm:w-auto'>
        <ExportButtons clients={allClients || []} />
        <PermissionGuard module='clients' action='create' fallback={null}>
          <Button
            onClick={onCreateClick}
            size='sm'
            variant='outline'
            className='whitespace-nowrap inline-flex items-center bg-black text-white rounded-full px-6 py-2 hover:bg-white hover:text-black dark:bg-black dark:text-white dark:border-white dark:hover:bg-white dark:hover:text-black dark:hover:border-white hover:scale-105 transition-all duration-200 text-sm sm:text-base w-full sm:w-auto border-2'
          >
            <Plus className='w-4 h-4 mr-1' />
            Nuevo Cliente
          </Button>
        </PermissionGuard>
      </div>
    </div>
  );
}