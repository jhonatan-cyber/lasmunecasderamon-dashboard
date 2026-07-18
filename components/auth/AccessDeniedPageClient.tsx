'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Shield, ArrowLeft, Home, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function AccessDeniedPageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const requestedModule = searchParams?.get('module') || 'desconocido';
  const action = searchParams?.get('action') || 'desconocido';

  return (
    <div className='min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4'>
      <Card className='w-full max-w-md'>
        <CardHeader className='text-center'>
          <div className='mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/20'>
            <Shield className='h-6 w-6 text-red-600 dark:text-red-400' />
          </div>
          <CardTitle className='text-2xl font-bold text-red-600 dark:text-red-400'>
            Acceso Denegado
          </CardTitle>
        </CardHeader>
        <CardContent className='space-y-4'>
          <div className='text-center space-y-2'>
            <p className='text-gray-600 dark:text-gray-400'>
              No tienes permisos para acceder a esta funcionalidad.
            </p>

            <div className='bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3'>
              <div className='flex items-start space-x-2'>
                <AlertTriangle className='h-5 w-5 text-yellow-600 dark:text-yellow-400 mt-0.5 shrink-0' />
                <div className='text-sm text-yellow-800 dark:text-yellow-300'>
                  <p className='font-medium'>Permisos requeridos:</p>
                  <div className='mt-1 space-y-1'>
                    <p>
                      <span className='font-mono text-xs'>Modulo:</span>{' '}
                      <span className='font-semibold'>{requestedModule}</span>
                    </p>
                    <p>
                      <span className='font-mono text-xs'>Accion:</span>{' '}
                      <span className='font-semibold'>{action}</span>
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className='text-sm text-gray-500 dark:text-gray-500'>
              Si crees que esto es un error, contacta al administrador del sistema.
            </div>
          </div>

          <div className='space-y-2'>
            <Button onClick={() => router.back()} variant='outline' className='w-full'>
              <ArrowLeft className='h-4 w-4 mr-2' />
              Volver Atras
            </Button>

            <Button onClick={() => router.push('/dashboard')} className='w-full'>
              <Home className='h-4 w-4 mr-2' />
              Ir al Dashboard
            </Button>

            <Button onClick={() => router.push('/login')} variant='secondary' className='w-full'>
              Iniciar Sesion con Otro Usuario
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
