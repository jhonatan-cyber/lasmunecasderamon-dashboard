'use client';

import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface AdvancesHeaderProps {
  canCreate: boolean;
  hasOpenCaja: boolean | null;
  cajaLoading: boolean;
  onOpenDialog: () => void;
}

export function AdvancesHeader({
  canCreate,
  hasOpenCaja,
  cajaLoading,
  onOpenDialog
}: AdvancesHeaderProps) {
  const disabled = cajaLoading || !hasOpenCaja;

  return (
    <div className='flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 sm:gap-6 pt-4 sm:pt-8 px-4 sm:px-8'>
      <div className='flex items-center gap-4'>
        <div>
          <h1 className='text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white'>
            Anticipos
          </h1>
          <p className='text-sm sm:text-base text-gray-600 mt-2'>
            Gestiona los anticipos de sueldo del personal
          </p>
        </div>
      </div>
      {canCreate && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <span className='w-full sm:w-auto'>
                <Button
                  onClick={onOpenDialog}
                  disabled={disabled}
                  className='w-full rounded-full px-4 sm:px-6 py-2 shadow transition-all duration-200 text-sm sm:text-base border-2 bg-black text-white hover:bg-white hover:text-black hover:scale-105 dark:bg-black dark:text-white dark:border-white dark:hover:bg-white dark:hover:text-black dark:hover:border-white disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-black disabled:hover:text-white disabled:dark:hover:bg-black disabled:dark:hover:text-white disabled:hover:scale-100'
                >
                  {cajaLoading ? (
                    <>
                      <div className='animate-spin rounded-full h-4 w-4 border-b-2 border-gray-500 mr-2' />
                      Verificando...
                    </>
                  ) : (
                    <>
                      <Plus className='mr-2' />
                      Nuevo Anticipo
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
      )}
    </div>
  );
}
