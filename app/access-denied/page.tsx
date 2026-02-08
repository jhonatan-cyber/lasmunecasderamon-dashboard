'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Shield, ArrowLeft, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle } from 'lucide-react';

export default function AccessDeniedPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [mounted, setMounted] = useState(false);

  const module = searchParams?.get('module') || 'desconocido';
  const action = searchParams?.get('action') || 'desconocido';

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  const handleGoBack = () => {
    router.back();
  };

  const handleGoHome = () => {
    router.push('/dashboard');
  };

  const handleGoToLogin = () => {
    router.push('/login');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/20">
            <Shield className="h-6 w-6 text-red-600 dark:text-red-400" />
          </div>
          <CardTitle className="text-2xl font-bold text-red-600 dark:text-red-400">
            Acceso Denegado
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center space-y-2">
            <p className="text-gray-600 dark:text-gray-400">
              No tienes permisos para acceder a esta funcionalidad.
            </p>
            
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
              <div className="flex items-start space-x-2">
                <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-yellow-800 dark:text-yellow-300">
                  <p className="font-medium">Permisos requeridos:</p>
                  <div className="mt-1 space-y-1">
                    <p>
                      <span className="font-mono text-xs">Módulo:</span>{' '}
                      <span className="font-semibold">{module}</span>
                    </p>
                    <p>
                      <span className="font-mono text-xs">Acción:</span>{' '}
                      <span className="font-semibold">{action}</span>
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="text-sm text-gray-500 dark:text-gray-500">
              Si crees que esto es un error, contacta al administrador del sistema.
            </div>
          </div>

          <div className="space-y-2">
            <Button
              onClick={handleGoBack}
              variant="outline"
              className="w-full"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Volver Atrás
            </Button>
            
            <Button
              onClick={handleGoHome}
              className="w-full"
            >
              <Home className="h-4 w-4 mr-2" />
              Ir al Dashboard
            </Button>
            
            <Button
              onClick={handleGoToLogin}
              variant="secondary"
              className="w-full"
            >
              Iniciar Sesión con Otro Usuario
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
