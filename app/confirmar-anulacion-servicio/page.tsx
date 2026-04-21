'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { toast, Toaster } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { formatCurrencyCLP } from '@/lib/utils/formatters';
import { formatLongDateEs } from '@/lib/utils/calendarUtils';

interface SolicitudAnulacionServicio {
  servicio_id: number;
  codigo: string;
  total: number;
  cliente_nombre: string;
  habitacion_numero: string;
  tiempo: number;
  motivo: string;
  solicitado_por: string;
  fecha_solicitud: string;
  anfitrionas?: string;
}

function ConfirmarAnulacionServicioContent() {
  const searchParams = useSearchParams();
  const token = searchParams?.get('token');

  const [solicitud, setSolicitud] = useState<SolicitudAnulacionServicio | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {

    if (!token) {
      setError('Token de anulación no válido');
      setLoading(false);
      return;
    }

    // Cargar datos de la solicitud
    const cargarSolicitud = async () => {
      try {
        const response = await fetch(`/api/servicios/solicitud-anulacion?token=${token}`);

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

  const procesarAnulacion = async (accion: 'confirmar' | 'rechazar') => {
    if (!token) return;

    setProcessing(true);
    try {
      const requestBody = {
        token,
        action: accion
      };

      const response = await fetch(`/api/servicios/procesar-anulacion`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        let errorMessage = 'Error al procesar la anulación';
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorData.error || errorMessage;
        } catch (jsonError) {
          try {
            const errorText = await response.text();
            errorMessage = `Error del servidor: ${response.status}`;
          } catch (textError) {
            errorMessage = `Error de conexión: ${response.status}`;
          }
        }
        throw new Error(errorMessage);
      }

      const result = await response.json();

      if (result.success) {
        toast.success(
          accion === 'confirmar'
            ? '✅ Anulación de servicio confirmada exitosamente'
            : '❌ Anulación de servicio rechazada exitosamente'
        );

        // Mostrar mensaje de que la ventana se cerrará
        toast.info('La ventana se cerrará automáticamente en 2 segundos');

        // Cerrar la ventana después de 2 segundos
        setTimeout(() => {
          window.close();
        }, 2000);
      } else {
        throw new Error(result.message || 'Error al procesar la anulación');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
      console.error(`🔍 Frontend: Error:`, errorMessage);
      toast.error(errorMessage);
      setError(errorMessage);
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className='min-h-screen flex items-center justify-center bg-gray-50'>
        <div className='text-center'>
          <Loader2 className='h-8 w-8 animate-spin mx-auto mb-4' />
          <p>Cargando solicitud de anulación de servicio...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className='min-h-screen flex items-center justify-center bg-gray-50'>
        <Card className='w-full max-w-md'>
          <CardHeader>
            <CardTitle className='text-red-600'>Error</CardTitle>
          </CardHeader>
          <CardContent>
            <Alert>
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

  if (!solicitud) {
    return (
      <div className='min-h-screen flex items-center justify-center bg-gray-50'>
        <Card className='w-full max-w-md'>
          <CardHeader>
            <CardTitle>Solicitud no encontrada</CardTitle>
          </CardHeader>
          <CardContent>
            <p>La solicitud de anulación de servicio no existe o ya fue procesada.</p>
            <Button onClick={() => window.close()} className='w-full mt-4'>
              Cerrar Ventana
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <>
      <div className='min-h-screen flex items-center justify-center p-4 bg-gray-50'>
        <Card className='w-full max-w-lg'>
          <CardHeader className='text-center'>
            <CardTitle className='text-2xl font-bold text-gray-900 mb-2'>
              Confirmar Anulación de Servicio
            </CardTitle>
            <p className='text-gray-600 text-md'>Revisa los detalles y confirma tu decisión</p>
          </CardHeader>

          <CardContent className='space-y-6'>
            {/* Detalles del servicio */}
            <div className='bg-blue-50 p-4 rounded-lg'>
              <h4 className='font-semibold text-blue-900 mb-3'>Detalles del Servicio</h4>
              <div className='space-y-4'>
                <div className='grid grid-cols-2 gap-4'>
                  <div>
                    <Label className='text-sm font-medium text-gray-600'>Código del Servicio</Label>
                    <p className='text-lg font-semibold'>{solicitud.codigo}</p>
                  </div>
                  <div>
                    <Label className='text-sm font-medium text-gray-600'>Total</Label>
                    <p className='text-lg font-semibold text-green-600'>
                      {formatCurrencyCLP(solicitud.total || 0)}
                    </p>
                  </div>
                </div>

                <div>
                  <Label className='text-sm font-medium text-gray-600'>Cliente</Label>
                  <p className='text-lg'>{solicitud.cliente_nombre || 'Sin cliente'}</p>
                </div>

                <div className='grid grid-cols-2 gap-4'>
                  <div>
                    <Label className='text-sm font-medium text-gray-600'>Habitación</Label>
                    <p className='text-lg'>{solicitud.habitacion_numero || 'No especificada'}</p>
                  </div>
                  <div>
                    <Label className='text-sm font-medium text-gray-600'>Tiempo</Label>
                    <p className='text-lg'>{solicitud.tiempo || 'No especificado'} minutos</p>
                  </div>
                </div>

                <div>
                  <Label className='text-sm font-medium text-gray-600'>Anfitriones</Label>
                  <p className='text-lg'>{solicitud.anfitrionas || 'Sin anfitriones'}</p>
                </div>

                <div>
                  <Label className='text-sm font-medium text-gray-600'>Motivo de Anulación</Label>
                  <p className='text-lg bg-gray-50 p-3 rounded-lg'>{solicitud.motivo}</p>
                </div>

                <div className='grid grid-cols-2 gap-4'>
                  <div>
                    <Label className='text-sm font-medium text-gray-600'>Solicitado por</Label>
                    <p className='text-lg'>{solicitud.solicitado_por}</p>
                  </div>
                  <div>
                    <Label className='text-sm font-medium text-gray-600'>Fecha de Solicitud</Label>
                    <p className='text-lg'>{formatLongDateEs(solicitud.fecha_solicitud)}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Botones de acción */}
            <div className='flex gap-4 pt-4'>
              <div className='flex justify-center gap-2 w-full'>
                <Button
                  onClick={() => procesarAnulacion('rechazar')}
                  disabled={processing}
                  variant='outline'
                  size='sm'
                  className='rounded-full  hover:scale-105 transition-all duration-200 hover:bg-black hover:text-white'
                >
                  {processing ? <Loader2 className='animate-spin' /> : <XCircle />}
                  Rechazar
                </Button>

                <Button
                  onClick={() => procesarAnulacion('confirmar')}
                  disabled={processing}
                  size='sm'
                  variant='outline'
                  className='bg-black text-white rounded-full hover:scale-105 transition-all duration-200'
                >
                  {processing ? <Loader2 className=' animate-spin ' /> : <CheckCircle />}
                  Aceptar
                </Button>
              </div>
            </div>

            {/* Información sobre cierre automático */}
            <div className='bg-blue-50 p-4 rounded-lg border border-blue-200'>
              <p className='text-sm text-blue-800 text-center'>
                <strong>ℹ️ Información:</strong> Después de procesar la anulación, esta ventana se
                cerrará automáticamente.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Toaster richColors position='top-right' expand={true} closeButton={true} duration={4000} />
    </>
  );
}

export default function ConfirmarAnulacionServicioPage() {
  return (
    <Suspense
      fallback={
        <div className='min-h-screen flex items-center justify-center p-4 bg-gray-50'>
          <Card className='w-full max-w-lg'>
            <CardContent className='text-center py-8'>
              <Loader2 className='animate-spin mx-auto mb-4' />
              <p>Cargando...</p>
            </CardContent>
          </Card>
        </div>
      }
    >
      <ConfirmarAnulacionServicioContent />
    </Suspense>
  );
}

