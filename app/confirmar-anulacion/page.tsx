'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { toast, Toaster } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';

interface SolicitudAnulacion {
  venta_id: number;
  codigo: string;
  total: number;
  cliente_nombre: string;
  motivo: string;
  solicitado_por: string;
  fecha_solicitud: string;
}

export default function ConfirmarAnulacionPage() {
  const searchParams = useSearchParams();
  const token = searchParams?.get('token');

  const [solicitud, setSolicitud] = useState<SolicitudAnulacion | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    console.log('🔍 Token recibido:', token);

    if (!token) {
      console.log('🔍 No hay token, mostrando error');
      setError('Token de anulación no válido');
      setLoading(false);
      return;
    }

    // Cargar datos de la solicitud
    const cargarSolicitud = async () => {
      try {
        console.log('🔍 Cargando solicitud con token:', token);
        const response = await fetch(`/api/ventas/solicitud-anulacion?token=${token}`);
        console.log('🔍 Response status:', response.status);

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          console.log('🔍 Error data:', errorData);
          throw new Error(errorData.message || 'Solicitud no encontrada o ya procesada');
        }

        const data = await response.json();
        console.log('🔍 Response data:', data);
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
      const response = await fetch(`/api/ventas/procesar-anulacion`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          token,
          action: accion
        })
      });

      if (!response.ok) {
        throw new Error('Error al procesar la anulación');
      }

      const result = await response.json();

      if (result.success) {
        toast.success(
          accion === 'confirmar'
            ? '✅ Anulación confirmada exitosamente'
            : '❌ Anulación rechazada exitosamente'
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
          <p>Cargando solicitud de anulación...</p>
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
            <p>La solicitud de anulación no existe o ya fue procesada.</p>
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
              Confirmar Anulación de Venta
            </CardTitle>
            <p className='text-gray-600 text-md'>Revisa los detalles y confirma tu decisión</p>
          </CardHeader>

          <CardContent className='space-y-6'>
            {/* Detalles de la venta */}
            <div className='bg-blue-50 p-4 rounded-lg'>
              <h4 className='font-semibold text-blue-900 mb-3'>Detalles de la Venta</h4>
              <div className='space-y-2 text-sm'>
                <div className='flex justify-between'>
                  <span className='font-medium'>Código:</span>
                  <Badge variant='outline'>{solicitud.codigo}</Badge>
                </div>
                <div className='flex justify-between'>
                  <span className='font-medium'>Cliente:</span>
                  <span>{solicitud.cliente_nombre}</span>
                </div>
                <div className='flex justify-between'>
                  <span className='font-medium'>Total:</span>
                  <span className='font-bold text-green-600'>
                    ${solicitud.total?.toLocaleString('es-ES')}
                  </span>
                </div>
                <div className='flex justify-between'>
                  <span className='font-medium'>Solicitado por:</span>
                  <span>{solicitud.solicitado_por}</span>
                </div>
                <div className='flex justify-between'>
                  <span className='font-medium'>Fecha:</span>
                  <span>{new Date(solicitud.fecha_solicitud).toLocaleDateString('es-ES')}</span>
                </div>
              </div>
            </div>

            {/* Motivo de anulación */}
            {solicitud.motivo && solicitud.motivo !== 'Motivo no especificado' && (
              <div className='bg-yellow-50 p-4 rounded-lg'>
                <h3 className='font-semibold text-yellow-900 mb-2'>Motivo de Anulación</h3>
                <p className='text-sm text-yellow-800'>{solicitud.motivo}</p>
              </div>
            )}

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
