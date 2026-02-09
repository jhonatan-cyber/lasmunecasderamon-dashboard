'use client';

import { WifiOff } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function OfflinePage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-neutral-900">
      <div className="text-center space-y-6 p-8">
        <div className="flex justify-center">
          <div className="rounded-full bg-gray-100 dark:bg-neutral-800 p-6">
            <WifiOff className="h-16 w-16 text-gray-400 dark:text-neutral-500" />
          </div>
        </div>
        
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-neutral-100">
            Sin Conexión
          </h1>
          <p className="text-gray-600 dark:text-neutral-400 max-w-md">
            No hay conexión a internet. Algunas funciones pueden no estar disponibles.
          </p>
        </div>

        <div className="space-y-3">
          <Button
            onClick={() => window.location.reload()}
            className="w-full sm:w-auto"
          >
            Reintentar
          </Button>
          
          <p className="text-sm text-gray-500 dark:text-neutral-500">
            Las páginas visitadas recientemente están disponibles sin conexión
          </p>
        </div>
      </div>
    </div>
  );
}
