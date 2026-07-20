'use client';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AlertTriangle, CreditCard } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCashRegister } from '@/hooks/caja/useCashRegister';
import { useEffect } from 'react';

interface CajaStatusCheckProps {
  onStatusChange?: (hasOpenCaja: boolean) => void;
}

export function CajaStatusCheck({ onStatusChange }: CajaStatusCheckProps) {
  const { hasOpenCaja, loading, error } = useCashRegister();
  const router = useRouter();

  useEffect(() => {
    if (hasOpenCaja !== null) {
      onStatusChange?.(hasOpenCaja);
    }
  }, [hasOpenCaja, onStatusChange]);

  if (loading || hasOpenCaja === null) {
    return null;
  }

  if (error) {
    return (
      <Alert className='mb-4 border-yellow-200 bg-yellow-50 dark:border-yellow-900 dark:bg-yellow-950/40'>
        <AlertTriangle className='h-4 w-4 text-yellow-600 dark:text-yellow-300' />
        <AlertDescription className='text-yellow-800 dark:text-yellow-100'>
          <div className='flex items-center justify-between'>
            <span>
              <strong>Error al verificar caja.</strong> {error}
            </span>
            <Button
              variant='outline'
              size='sm'
              onClick={() => window.location.reload()}
              className='ml-4 border-yellow-300 text-yellow-700 hover:bg-yellow-100 dark:border-yellow-700 dark:text-yellow-200 dark:hover:bg-yellow-900/50'
            >
              Reintentar
            </Button>
          </div>
        </AlertDescription>
      </Alert>
    );
  }

  if (!hasOpenCaja) {
    return (
      <Alert className='mb-4 border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/40'>
        <AlertTriangle className='h-4 w-4 text-red-600 dark:text-red-300' />
        <AlertDescription className='text-red-800 dark:text-red-100'>
          <div className='flex items-center justify-between'>
            <span>
              <strong>No hay caja abierta.</strong> No se pueden realizar ventas sin una caja
              abierta.
            </span>
            <Button
              variant='outline'
              size='sm'
              onClick={() => router.push('/cash-register')}
              className='ml-4 rounded-full border-red-300 text-red-700 hover:bg-red-100 dark:border-red-700 dark:text-red-200 dark:hover:bg-red-900/50'
            >
              Abrir Caja
            </Button>
          </div>
        </AlertDescription>
      </Alert>
    );
  }
}
