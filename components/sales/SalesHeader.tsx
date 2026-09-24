'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { PermissionGuard } from '@/components/auth/PermissionGuard';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface SalesHeaderProps {
  loading: boolean;
  onRefresh: () => void;
  cajaDisabled?: boolean;
}

export function SalesHeader({ loading, onRefresh, cajaDisabled }: SalesHeaderProps) {
  const router = useRouter();

  return (
    <div className='flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 sm:gap-6'>
      <div>
        <h1 className='text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 dark:text-zinc-100'>
          Ventas
        </h1>
        <p className='text-sm sm:text-base text-gray-600'>
          Panel de control de ventas y transacciones
        </p>
      </div>
      <PermissionGuard module='sales' action='create' fallback={null}>
        <div className='flex flex-col sm:flex-row gap-2 w-full sm:w-auto'>
          <TooltipProvider>
            <Tooltip open={cajaDisabled ? undefined : false}>
              <TooltipTrigger asChild>
                <span>
                  <Button
                    onClick={() => router.push('/sales/new')}
                    size='sm'
                    variant='outline'
                    disabled={cajaDisabled}
                    className='w-full sm:w-auto rounded-full px-4 sm:px-6 py-2 bg-black text-white hover:bg-white hover:text-black hover:scale-105 transition-all duration-200 text-sm sm:text-base border-2 dark:bg-black dark:text-white dark:border-white dark:hover:bg-white dark:hover:text-black dark:hover:border-white disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-black disabled:hover:text-white disabled:dark:hover:bg-black disabled:dark:hover:text-white disabled:hover:scale-100'
                  >
                    <Plus className='w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2' />
                    Nuevo
                  </Button>
                </span>
              </TooltipTrigger>
              {cajaDisabled && (
                <TooltipContent>
                  <p>Caja cerrada</p>
                </TooltipContent>
              )}
            </Tooltip>
          </TooltipProvider>
        </div>
      </PermissionGuard>
    </div>
  );
}
