'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { useCashRegisterStatus } from '@/hooks/caja/useCashRegisterStatus';
import { PermissionGuard } from '@/components/auth/PermissionGuard';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface CuentaHeaderProps {
  loading?: boolean;
  onRefresh?: () => void;
}

export function CuentaHeader({}: CuentaHeaderProps = {}) {
  const router = useRouter();
  const { hasOpenCaja, loading: cajaLoading } = useCashRegisterStatus();
  const disabled = cajaLoading || !hasOpenCaja;

  return (
    <div className='flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 sm:gap-6'>
      <div>
        <h1 className='text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900'>Cuentas</h1>
        <p className='text-sm sm:text-base text-gray-600'>
          Gestiona las cuentas de clientes y sus consumos
        </p>
      </div>
      <div className='flex flex-col sm:flex-row gap-2 w-full sm:w-auto'>
        <PermissionGuard module='accounts' action='create' fallback={null}>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span>
                  <Button
                    onClick={() => router.push('/accounts/new')}
                    disabled={disabled}
                    size='sm'
                    variant='outline'
                    className='w-full sm:w-auto rounded-full px-4 sm:px-6 py-2 transition-all duration-200 text-sm sm:text-base border-2 bg-black text-white hover:bg-white hover:text-black hover:scale-105 dark:bg-black dark:text-white dark:border-white dark:hover:bg-white dark:hover:text-black dark:hover:border-white disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-black disabled:hover:text-white disabled:dark:hover:bg-black disabled:dark:hover:text-white disabled:hover:scale-100'
                  >
                    {cajaLoading ? (
                      <>
                        <div className='animate-spin rounded-full h-4 w-4 border-b-2 border-gray-500 mr-2' />
                        Verificando...
                      </>
                    ) : (
                      <>
                        <Plus className='mr-2 h-4 w-4' />
                        Nuevo
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
}
