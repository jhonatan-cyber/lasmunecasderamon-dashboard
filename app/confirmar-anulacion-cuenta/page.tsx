'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { toast, Toaster } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { formatCurrencyCLP } from '@/lib/utils/formatters';
import { formatLongDateEs } from '@/lib/utils/calendarUtils';

type SolicitudCuenta = {
  id: string;
  cuenta_id: string;
  codigo: string;
  cliente_nombre: string;
  total: number;
  monto: number;
  motivo: string;
  fecha_crea: string;
};

function ConfirmarAnulacionCuentaContent() {
  const searchParams = useSearchParams();
  const token = searchParams?.get('token');
  const [solicitud, setSolicitud] = useState<SolicitudCuenta | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setError('Token invalido');
      setLoading(false);
      return;
    }

    const cargar = async () => {
      try {
        const response = await fetch(`/api/cuentas/solicitud-anulacion?token=${token}`);
        const data = await response.json();

        if (!response.ok || !data.success) {
          throw new Error(data.message || 'Solicitud no encontrada o ya procesada');
        }

        setSolicitud(data.solicitud);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error al cargar la solicitud');
      } finally {
        setLoading(false);
      }
    };

    cargar();
  }, [token]);

  const procesar = async (action: 'confirmar' | 'rechazar') => {
    if (!token) return;

    setProcessing(true);
    try {
      const response = await fetch('/api/cuentas/procesar-anulacion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, action }),
      });
      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || 'No se pudo procesar la solicitud');
      }

      toast.success(action === 'confirmar' ? 'Solicitud aprobada' : 'Solicitud rechazada');
      toast.info('La ventana se cerrara automaticamente en 2 segundos');
      setTimeout(() => window.close(), 2000);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error desconocido';
      setError(message);
      toast.error(message);
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className='min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950'>
        <div className='text-center'>
          <Loader2 className='h-8 w-8 animate-spin mx-auto mb-4 text-gray-900 dark:text-gray-100' />
          <p className='text-gray-900 dark:text-gray-100'>Cargando solicitud...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className='min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 p-4'>
        <Card className='w-full max-w-md'>
          <CardHeader>
            <CardTitle className='text-red-600 dark:text-red-400'>Error</CardTitle>
          </CardHeader>
          <CardContent>
            <Alert>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
            <Button onClick={() => window.close()} className='w-full mt-4'>
              Cerrar
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!solicitud) return null;

  return (
    <>
      <div className='min-h-screen flex items-center justify-center p-4 bg-gray-50 dark:bg-gray-950'>
        <Card className='w-full max-w-lg'>
          <CardHeader className='text-center'>
            <CardTitle className='text-2xl font-bold text-gray-900 dark:text-gray-100'>
              Confirmar Anulacion de Cuenta
            </CardTitle>
            <p className='text-gray-600 dark:text-gray-400'>
              Revisa los detalles y elige una accion
            </p>
          </CardHeader>

          <CardContent className='space-y-6'>
            <div className='bg-blue-50 dark:bg-blue-950/30 p-4 rounded-lg border border-blue-200 dark:border-blue-800'>
              <h4 className='font-semibold text-blue-900 dark:text-blue-300 mb-3'>
                Detalles de la Cuenta
              </h4>
              <div className='space-y-2 text-sm'>
                <div className='flex justify-between'>
                  <span className='font-medium text-gray-700 dark:text-gray-300'>Codigo:</span>
                  <Badge variant='outline'>{solicitud.codigo}</Badge>
                </div>
                <div className='flex justify-between'>
                  <span className='font-medium text-gray-700 dark:text-gray-300'>Cliente:</span>
                  <span className='text-gray-900 dark:text-gray-100'>{solicitud.cliente_nombre}</span>
                </div>
                <div className='flex justify-between'>
                  <span className='font-medium text-gray-700 dark:text-gray-300'>Total referencia:</span>
                  <span className='font-bold text-green-600 dark:text-green-400'>
                    {formatCurrencyCLP(Number(solicitud.total || 0))}
                  </span>
                </div>
                <div className='flex justify-between'>
                  <span className='font-medium text-gray-700 dark:text-gray-300'>Monto solicitado:</span>
                  <span className='font-bold text-amber-600 dark:text-amber-400'>
                    {formatCurrencyCLP(Number(solicitud.monto || 0))}
                  </span>
                </div>
                <div className='flex justify-between'>
                  <span className='font-medium text-gray-700 dark:text-gray-300'>Fecha:</span>
                  <span className='text-gray-900 dark:text-gray-100'>
                    {formatLongDateEs(solicitud.fecha_crea)}
                  </span>
                </div>
              </div>
            </div>

            <div className='bg-yellow-50 dark:bg-yellow-950/30 p-4 rounded-lg border border-yellow-200 dark:border-yellow-800'>
              <h3 className='font-semibold text-yellow-900 dark:text-yellow-300 mb-2'>Motivo</h3>
              <p className='text-sm text-yellow-800 dark:text-yellow-200'>
                {solicitud.motivo || 'No especificado'}
              </p>
            </div>

            <div className='flex gap-4 pt-4'>
              <div className='flex justify-center gap-2 w-full'>
                <Button
                  onClick={() => procesar('rechazar')}
                  disabled={processing}
                  variant='outline'
                  size='sm'
                  className='rounded-full hover:scale-105 transition-all duration-200 hover:bg-red-600 hover:text-white dark:hover:bg-red-500'
                >
                  {processing ? <Loader2 className='animate-spin' /> : <XCircle />}
                  Rechazar
                </Button>
                <Button
                  onClick={() => procesar('confirmar')}
                  disabled={processing}
                  size='sm'
                  variant='outline'
                  className='bg-black dark:bg-white text-white dark:text-black rounded-full hover:scale-105 transition-all duration-200'
                >
                  {processing ? <Loader2 className='animate-spin' /> : <CheckCircle />}
                  Aceptar
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Toaster richColors position='top-right' expand closeButton duration={4000} />
    </>
  );
}

export default function ConfirmarAnulacionCuentaPage() {
  return (
    <Suspense
      fallback={
        <div className='min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950'>
          <Loader2 className='h-8 w-8 animate-spin text-gray-900 dark:text-gray-100' />
        </div>
      }
    >
      <ConfirmarAnulacionCuentaContent />
    </Suspense>
  );
}
