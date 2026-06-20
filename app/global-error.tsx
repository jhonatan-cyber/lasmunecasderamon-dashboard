'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { AlertCircle, Home, RefreshCw } from 'lucide-react';
import Link from 'next/link';

export default function GlobalError({
  error,
  reset
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Global error:', error);
  }, [error]);

  return (
    <html lang='es'>
      <body className='bg-gray-50 dark:bg-gray-950'>
        <div className='min-h-screen flex items-center justify-center p-4'>
          <div className='max-w-md w-full text-center space-y-6'>
            {}
            <div className='mx-auto w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center'>
              <AlertCircle className='w-8 h-8 text-red-600 dark:text-red-400' />
            </div>

            {}
            <h1 className='text-2xl font-bold text-gray-900 dark:text-gray-100'>Algo salió mal</h1>

            {}
            <p className='text-gray-600 dark:text-gray-400'>
              Ha ocurrido un error inesperado. Por favor, intentá de nuevo o contactá al
              administrador si el problema persiste.
            </p>

            {}
            {process.env.NODE_ENV === 'development' && (
              <div className='text-left p-4 bg-gray-100 dark:bg-gray-900 rounded-lg text-sm font-mono text-red-500 overflow-auto max-h-32'>
                {error.message || 'Error desconocido'}
              </div>
            )}

            {}
            <div className='flex gap-3 justify-center'>
              <Button onClick={() => reset()} variant='outline' className='gap-2'>
                <RefreshCw className='w-4 h-4' />
                Reintentar
              </Button>

              <Link href='/'>
                <Button variant='default' className='gap-2'>
                  <Home className='w-4 h-4' />
                  Ir al inicio
                </Button>
              </Link>
            </div>

            {}
            <p className='text-sm text-gray-500 dark:text-gray-500'>
              ¿Necesitás ayuda? Contactanos al{' '}
              <a
                href='mailto:soporte@lasmunecasderamon.com'
                className='text-blue-600 hover:underline'
              >
                soporte@lasmunecasderamon.com
              </a>
            </p>
          </div>
        </div>
      </body>
    </html>
  );
}
