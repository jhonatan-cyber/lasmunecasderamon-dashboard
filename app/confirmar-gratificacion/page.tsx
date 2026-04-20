'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { toast, Toaster } from 'sonner';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatLongDateEs } from '@/lib/utils/calendarUtils';
import { formatCurrencyCLP } from '@/lib/utils/formatters';
import { CheckCircle, Gift, Loader2, MessageSquare, User, XCircle } from 'lucide-react';

interface SolicitudGratificacion {
  id: string;
  usuario: string;
  nick: string;
  monto: number;
  descripcion: string;
  fecha: string;
}

function ConfirmarGratificacionContent() {
  const searchParams = useSearchParams();
  const token = searchParams?.get('token');

  const [solicitud, setSolicitud] = useState<SolicitudGratificacion | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setError('Token de solicitud no válido');
      setLoading(false);
      return;
    }

    const load = async () => {
      try {
        const response = await fetch(`/api/gratificaciones/solicitud-detalles?token=${token}`);
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.message || 'Solicitud no encontrada o ya procesada');
        }

        const data = await response.json();
        setSolicitud(data.solicitud);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error al cargar la solicitud');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [token]);

  const procesar = async (accion: 'aprobar' | 'rechazar') => {
    if (!token) return;

    setProcessing(true);
    try {
      const response = await fetch('/api/gratificaciones/aprobar', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, accion })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Error al procesar la solicitud');
      }

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.message || 'Error al procesar la solicitud');
      }

      toast.success(
        accion === 'aprobar'
          ? '✅ Gratificación aprobada exitosamente'
          : '❌ Gratificación rechazada exitosamente'
      );

      setTimeout(() => {
        window.close();
      }, 2000);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error desconocido';
      toast.error(message);
      setError(message);
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className='min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950'>
        <div className='text-center'>
          <Loader2 className='h-8 w-8 animate-spin mx-auto mb-4 text-primary' />
          <p className='text-gray-600 dark:text-gray-400'>Cargando solicitud de gratificación...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className='min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 p-4'>
        <Card className='w-full max-w-md border-red-200 dark:border-red-900'>
          <CardHeader>
            <CardTitle className='text-red-600 dark:text-red-400 flex items-center gap-2'>
              <XCircle className='h-5 w-5' /> Error
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Alert variant='destructive'>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
            <Button onClick={() => window.close()} className='w-full mt-4'>
              Cerrar Ventana
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
        <Card className='w-full max-w-lg shadow-xl border-t-4 border-t-primary'>
          <CardHeader className='text-center pb-2'>
            <CardTitle className='text-2xl font-black text-gray-900 dark:text-gray-100'>
              Confirmar Gratificación
            </CardTitle>
            <p className='text-gray-500 text-sm'>Solicitud enviada por cajero</p>
          </CardHeader>

          <CardContent className='space-y-6 pt-4'>
            <div className='grid grid-cols-1 gap-4 bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm'>
              <div className='flex items-center gap-4'>
                <div className='p-3 bg-blue-100 dark:bg-blue-900/40 rounded-xl'>
                  <User className='h-6 w-6 text-blue-600 dark:text-blue-400' />
                </div>
                <div>
                  <p className='text-xs text-gray-400 font-bold uppercase tracking-wider'>
                    Empleado
                  </p>
                  <p className='text-lg font-bold text-gray-900 dark:text-gray-100'>
                    {solicitud.usuario}
                  </p>
                  <p className='text-sm text-gray-400'>@{solicitud.nick}</p>
                </div>
              </div>

              <div className='h-px bg-gray-100 dark:bg-gray-800' />

              <div className='flex items-center gap-4'>
                <div className='p-3 bg-green-100 dark:bg-green-900/40 rounded-xl'>
                  <Gift className='h-6 w-6 text-green-600 dark:text-green-400' />
                </div>
                <div>
                  <p className='text-xs text-gray-400 font-bold uppercase tracking-wider'>
                    Monto solicitado
                  </p>
                  <p className='text-3xl font-black text-green-600 dark:text-green-400'>
                    {formatCurrencyCLP(solicitud.monto)}
                  </p>
                </div>
              </div>

              <div className='h-px bg-gray-100 dark:bg-gray-800' />

              <div className='flex items-start gap-4'>
                <div className='p-3 bg-purple-100 dark:bg-purple-900/40 rounded-xl'>
                  <MessageSquare className='h-6 w-6 text-purple-600 dark:text-purple-400' />
                </div>
                <div className='flex-1'>
                  <p className='text-xs text-gray-400 font-bold uppercase tracking-wider'>
                    Descripción
                  </p>
                  <p className='text-sm text-gray-700 dark:text-gray-300 mt-1 leading-relaxed'>
                    {solicitud.descripcion || 'Sin descripción'}
                  </p>
                </div>
              </div>

              <div className='pt-2 border-t border-gray-50 dark:border-gray-800'>
                <Badge variant='outline'>Fecha: {formatLongDateEs(solicitud.fecha)}</Badge>
              </div>
            </div>

            <div className='grid grid-cols-2 gap-4 pt-4'>
              <Button
                onClick={() => procesar('rechazar')}
                disabled={processing}
                variant='outline'
                className='h-12 border-red-200 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 dark:border-red-900/50 rounded-xl font-bold'
              >
                {processing ? (
                  <Loader2 className='animate-spin' />
                ) : (
                  <XCircle className='mr-2 h-5 w-5' />
                )}
                Rechazar
              </Button>

              <Button
                onClick={() => procesar('aprobar')}
                disabled={processing}
                className='h-12 bg-black dark:bg-white text-white dark:text-black hover:scale-[1.02] transition-transform rounded-xl font-bold shadow-lg'
              >
                {processing ? (
                  <Loader2 className='animate-spin' />
                ) : (
                  <CheckCircle className='mr-2 h-5 w-5' />
                )}
                Aprobar
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
      <Toaster richColors position='top-center' />
    </>
  );
}

export default function ConfirmarGratificacionPage() {
  return (
    <Suspense
      fallback={
        <div className='min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950'>
          <Loader2 className='animate-spin text-primary h-12 w-12' />
        </div>
      }
    >
      <ConfirmarGratificacionContent />
    </Suspense>
  );
}
