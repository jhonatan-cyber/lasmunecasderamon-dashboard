'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { toast, Toaster } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  CheckCircle,
  XCircle,
  Loader2,
  DollarSign,
  User,
  MessageSquare,
  Calendar
} from 'lucide-react';
import { formatCurrencyCLP } from '@/lib/utils/formatters';
import { formatLongDateEs } from '@/lib/utils/calendarUtils';

interface SolicitudAnticipo {
  id: number;
  usuario: string;
  nick: string;
  monto: number;
  motivo: string;
  fecha: string;
}

function ConfirmarAnticipoContent() {
  const searchParams = useSearchParams();
  const token = searchParams?.get('token');

  const [solicitud, setSolicitud] = useState<SolicitudAnticipo | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setError('Token de solicitud no válido');
      setLoading(false);
      return;
    }

    const cargarSolicitud = async () => {
      try {
        const response = await fetch(`/api/anticipos/solicitud-detalles?token=${token}`);
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.message || 'Solicitud no encontrada o ya procesada');
        }
        const data = await response.json();
        setSolicitud(data.solicitud);
      } catch (err) {
        console.error('🔍 Error cargando solicitud:', err);
        setError(err instanceof Error ? err.message : 'Error al cargar la solicitud');
      } finally {
        setLoading(false);
      }
    };

    cargarSolicitud();
  }, [token]);

  const procesarSolicitud = async (accion: 'aprobar' | 'rechazar') => {
    if (!token) return;

    setProcessing(true);
    try {
      const response = await fetch(`/api/anticipos/aprobar`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          token,
          accion
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Error al procesar la solicitud');
      }

      const result = await response.json();

      if (result.success) {
        toast.success(
          accion === 'aprobar'
            ? '✅ Anticipo aprobado exitosamente'
            : '❌ Anticipo rechazado exitosamente'
        );

        toast.info('La ventana se cerrará automáticamente en 2 segundos');

        setTimeout(() => {
          window.close();
        }, 2000);
      } else {
        throw new Error(result.message || 'Error al procesar la solicitud');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
      toast.error(errorMessage);
      setError(errorMessage);
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className='min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950'>
        <div className='text-center'>
          <Loader2 className='h-8 w-8 animate-spin mx-auto mb-4 text-primary' />
          <p className='text-gray-600 dark:text-gray-400'>Cargando solicitud de anticipo...</p>
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
              Confirmar Solicitud
            </CardTitle>
            <p className='text-gray-500 text-sm'>Administración de Anticipos</p>
          </CardHeader>

          <CardContent className='space-y-6 pt-4'>
            {/* Detalles principales */}
            <div className='grid grid-cols-1 gap-4 bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm'>
              <div className='flex items-center gap-4'>
                <div className='p-3 bg-blue-100 dark:bg-blue-900/40 rounded-xl'>
                  <User className='h-6 w-6 text-blue-600 dark:text-blue-400' />
                </div>
                <div>
                  <p className='text-xs text-gray-400 font-bold uppercase tracking-wider'>
                    Solicitante
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
                  <DollarSign className='h-6 w-6 text-green-600 dark:text-green-400' />
                </div>
                <div>
                  <p className='text-xs text-gray-400 font-bold uppercase tracking-wider'>
                    Monto Solicitado
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
                  <p className='text-xs text-gray-400 font-bold uppercase tracking-wider'>Motivo</p>
                  <p className='text-sm text-gray-700 dark:text-gray-300 mt-1 leading-relaxed'>
                    {solicitud.motivo || 'No especificado'}
                  </p>
                </div>
              </div>

              <div className='flex items-center gap-2 mt-2 pt-2 border-t border-gray-50 dark:border-gray-800'>
                <Calendar className='h-3 w-3 text-gray-400' />
                <p className='text-[10px] text-gray-400 font-medium'>
                  Fecha: {formatLongDateEs(solicitud.fecha)}
                </p>
              </div>
            </div>

            {/* Botones de acción */}
            <div className='grid grid-cols-2 gap-4 pt-4'>
              <Button
                onClick={() => procesarSolicitud('rechazar')}
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
                onClick={() => procesarSolicitud('aprobar')}
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

            <p className='text-[11px] text-center text-gray-400 mt-4'>
              Esta acción es irreversible y notificará automáticamente al solicitante.
            </p>
          </CardContent>
        </Card>
      </div>

      <Toaster richColors position='top-center' />
    </>
  );
}

export default function ConfirmarAnticipoPage() {
  return (
    <Suspense
      fallback={
        <div className='min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950'>
          <Loader2 className='animate-spin text-primary h-12 w-12' />
        </div>
      }
    >
      <ConfirmarAnticipoContent />
    </Suspense>
  );
}
