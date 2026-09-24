'use client';

import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PermissionGuard } from '@/components/auth/PermissionGuard';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface OrdersHeaderProps {
  hasOpenCaja: boolean | null;
  cajaLoading: boolean;
  onCreateOrder: () => void;
}

export const OrdersHeader = ({ hasOpenCaja, cajaLoading, onCreateOrder }: OrdersHeaderProps) => {
  const disabled = cajaLoading || !hasOpenCaja;

  return (
    <div className='flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 sm:gap-2 mb-6'>
      <div>
        <h1 className='text-xl sm:text-2xl font-bold text-gray-900 dark:text-zinc-100'>
          Gestión de Órdenes
        </h1>
        <p className='text-gray-600 dark:text-zinc-400'>Administra todas las órdenes del sistema</p>
      </div>
      <div className='w-full sm:w-auto'>
        <PermissionGuard module='orders' action='create' fallback={null}>
          <TooltipProvider>
            <Tooltip open={disabled && !cajaLoading ? undefined : false}>
              <TooltipTrigger asChild>
                <span className='block'>
                  <Button
                    onClick={onCreateOrder}
                    disabled={disabled}
                    className='w-full sm:w-auto rounded-full px-6 py-2 transition-all duration-200 bg-black text-white hover:bg-white/90 hover:text-black hover:scale-105 shadow-md shadow-gray-200 dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-white dark:shadow-black/20 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-black disabled:hover:text-white disabled:dark:hover:bg-black disabled:dark:hover:text-white disabled:hover:scale-100'
                  >
                    {cajaLoading ? (
                      <>
                        <div className='animate-spin rounded-full h-4 w-4 border-b-2 border-gray-500 mr-2' />
                        Verificando...
                      </>
                    ) : (
                      <>
                        <Plus className='h-4 w-4 mr-2' />
                        Nuevo Pedido
                      </>
                    )}
                  </Button>
                </span>
              </TooltipTrigger>
              {disabled && !cajaLoading && (
                <TooltipContent>
                  <p>Caja cerrada</p>
                </TooltipContent>
              )}
            </Tooltip>
          </TooltipProvider>
        </PermissionGuard>
      </div>
    </div>
  );
};
