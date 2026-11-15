'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { toast, Toaster } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { formatCurrencyCLP } from '@/lib/utils/formatters';
import logger from '@/lib/utils/logger';

interface SolicitudAnulacionEntrada {
  id: string;
  entrada_id: string;
  token: string;
  estado: string;
  fecha_solicitud: string;
  solicitado_por: string;
  motivo: string | null;
  monto: number;
  cliente_nombre: string | null;
  metodo_pago_original: string;
}

function ConfirmarAnulacionEntradaContent() {
  const searchParams = useSearchParams();
  const token = searchParams?.get('token');

  const [solicitud, setSolicitud] = useState<SolicitudAnulacionEntrada | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [metodoDevolucion, setMetodoDevolucion] = useState<string>('');

  useEffect(() => {
    if (!token) {
      setError('Token de anulación no válido');
      setLoading(false);
      return;
    }

    const cargarSolicitud = async () => {
      try {
        const response = await fetch(`/api/tickets/cancellation-request?token=${token}`);

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.message || 'Solicitud no encontrada o ya procesada');
        }

        const data = await response.json();
        setSolicitud(data.solicitud);
        setMetodoDevolucion(data.solicitud?.metodo_pago_original || 'efectivo');
      } catch (err) {
        logger.captureException(err, { context: 'ConfirmarAnulacionEntrada:cargarSolicitud' });
        setError(err instanceof Error ? err.message : 'Error al cargar la solicitud');
      } finally {
        setLoading(false);
      }
    };

    cargarSolicitud();
  }, [token]);

  const procesarAnulacion = async (accion: 'confirmar' | 'rechazar') => {
    if (!token) return;

    if (accion === 'confirmar' && !metodoDevolucion) {
      toast.error('Selecciona el método de devolución');
      return;
    }

    setProcessing(true);
    try {
      const response = await fetch('/api/tickets/process-cancellation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          token,
          action: accion,
          metodoDevolucion: accion === 'confirmar' ? metodoDevolucion : null
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Error al procesar la anulación');
      }

      const result = await response.json();

      if (result.success) {
        toast.success(
          accion === 'confirmar'
            ? 'Anulación confirmada, entrada devuelta'
            : 'Anulación rechazada, entrada permanece pendiente'
        );
        toast.info('La ventana se cerrará automáticamente en 2 segundos');

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
      <div className='min-h-screen flex items-center justify-center bg-gray-50 p-4 dark:bg-gray-950'>
        <Card className='w-full max-w-md'>
          <CardContent className='flex flex-col items-center gap-4 pt-6'>
            <Loader2 className='h-8 w-8 animate-spin text-primary' />
            <p className='text-sm text-muted-foreground'>Cargando solicitud...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className='min-h-screen flex items-center justify-center bg-gray-50 p-4 dark:bg-gray-950'>
        <Card className='w-full max-w-md'>
          <CardHeader>
            <CardTitle className='flex items-center gap-2 text-destructive'>
              <XCircle className='h-5 w-5' />
              Error
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Alert variant='destructive'>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
            <div className='mt-4 flex justify-center'>
              <Button variant='outline' onClick={() => window.close()}>
                Cerrar ventana
              </Button>
            </div>
          </CardContent>
        </Card>
        <Toaster />
      </div>
    );
  }

  if (!solicitud) {
    return (
      <div className='min-h-screen flex items-center justify-center bg-gray-50 p-4 dark:bg-gray-950'>
        <Card className='w-full max-w-md'>
          <CardHeader>
            <CardTitle>Solicitud no encontrada</CardTitle>
          </CardHeader>
          <CardContent>
            <p className='text-sm text-muted-foreground'>
              Esta solicitud no existe o ya fue procesada.
            </p>
            <div className='mt-4 flex justify-center'>
              <Button variant='outline' onClick={() => window.close()}>
                Cerrar ventana
              </Button>
            </div>
          </CardContent>
        </Card>
        <Toaster />
      </div>
    );
  }

  return (
    <div className='min-h-screen flex items-center justify-center bg-gray-50 p-4 dark:bg-gray-950'>
      <Card className='w-full max-w-md'>
        <CardHeader>
          <div className='flex items-center justify-between'>
            <CardTitle className='text-lg'>Anulación de entrada</CardTitle>
            <Badge variant='secondary'>Pendiente</Badge>
          </div>
        </CardHeader>
        <CardContent className='space-y-4'>
          <div className='space-y-2 text-sm'>
            <div className='flex items-center justify-between'>
              <span className='text-muted-foreground'>Cliente</span>
              <span className='font-medium'>
                {solicitud.cliente_nombre || 'Sin nombre'}
              </span>
            </div>
            <div className='flex items-center justify-between'>
              <span className='text-muted-foreground'>Monto a devolver</span>
              <span className='font-semibold text-lg'>{formatCurrencyCLP(solicitud.monto)}</span>
            </div>
            <div className='flex items-center justify-between'>
              <span className='text-muted-foreground'>Método de pago original</span>
              <span className='font-medium capitalize'>{solicitud.metodo_pago_original}</span>
            </div>
            <div className='flex items-center justify-between'>
              <span className='text-muted-foreground'>Solicitado por</span>
              <span className='font-medium'>{solicitud.solicitado_por}</span>
            </div>
            {solicitud.motivo && (
              <div className='rounded-lg border bg-muted/40 p-3'>
                <p className='text-muted-foreground'>Motivo</p>
                <p className='mt-1'>{solicitud.motivo}</p>
              </div>
            )}
          </div>

          <div className='space-y-2'>
            <label className='text-sm font-medium text-muted-foreground'>
              Método de devolución
            </label>
            <Select value={metodoDevolucion} onValueChange={setMetodoDevolucion}>
              <SelectTrigger>
                <SelectValue placeholder='Selecciona método de devolución' />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='efectivo'>Efectivo</SelectItem>
                <SelectItem value='tarjeta'>Tarjeta</SelectItem>
                <SelectItem value='transferencia'>Transferencia</SelectItem>
                <SelectItem value='prepago'>Prepago del cliente</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className='flex gap-2 pt-2'>
            <Button
              variant='outline'
              className='flex-1 border-destructive text-destructive hover:bg-destructive/10'
              onClick={() => void procesarAnulacion('rechazar')}
              disabled={processing}
            >
              {processing ? (
                <Loader2 className='mr-2 h-4 w-4 animate-spin' />
              ) : (
                <XCircle className='mr-2 h-4 w-4' />
              )}
              Rechazar
            </Button>
            <Button
              className='flex-1 bg-emerald-600 hover:bg-emerald-700'
              onClick={() => void procesarAnulacion('confirmar')}
              disabled={processing}
            >
              {processing ? (
                <Loader2 className='mr-2 h-4 w-4 animate-spin' />
              ) : (
                <CheckCircle className='mr-2 h-4 w-4' />
              )}
              Aprobar
            </Button>
          </div>
        </CardContent>
      </Card>
      <Toaster />
    </div>
  );
}

export default function ConfirmarAnulacionEntradaPage() {
  return (
    <Suspense
      fallback={
        <div className='min-h-screen flex items-center justify-center'>
          <Loader2 className='h-8 w-8 animate-spin text-primary' />
        </div>
      }
    >
      <ConfirmarAnulacionEntradaContent />
    </Suspense>
  );
}
