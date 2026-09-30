'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { toast, Toaster } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, XCircle, Loader2, TriangleAlert } from 'lucide-react';
import { formatCurrencyCLP } from '@/lib/utils/formatters';
import { formatLongDateEs, formatDateTimeLabel } from '@/lib/utils/calendarUtils';
import logger from '@/lib/utils/logger';

interface SolicitudCierreCaja {
  caja_id: string;
  estado: 'pendiente' | 'aprobada' | 'rechazada';
  monto_cierre_calculado: number;
  saldo_clientes_descontado: number;
  solicitado_por: string;
  motivo: string | null;
  fecha_solicitud: string;
  fecha_apertura: string;
  cajero_nombre: string | null;
  monto_apertura: number;
  efectivo: number;
  tarjeta: number;
  transferencia: number;
  devolucion: number;
  retiro_total: number;
  caja_estado: number;
  resuelto_por: string | null;
  // Detalle del turno, igual que en el mensaje de WhatsApp: qué produjo la caja,
  // además del dinero que hay en el cajón.
  venta: number;
  servicio: number;
  propina: number;
  comision: number;
  anticipo: number;
  iva: number;
  // Prepago de clientes del turno (calculado al abrir el link).
  prepago_cargado: number;
  prepago_consumido: number;
  prepago_pendiente_clientes: number;
  // Estado del aviso: cuántas veces se le avisó al administrador y cuánto lleva la
  // solicitud sin respuesta (minutos calculados en hora de negocio por el servidor).
  avisos_enviados: number;
  ultimo_aviso_en: string | null;
  minutos_sin_respuesta: number;
}

function Fila({
  etiqueta,
  valor,
  destacar
}: {
  etiqueta: string;
  valor: string;
  destacar?: boolean;
}) {
  return (
    <div className='flex justify-between'>
      <span className='font-medium text-gray-700 dark:text-gray-300'>{etiqueta}</span>
      <span
        className={
          destacar
            ? 'font-bold text-blue-700 dark:text-blue-300'
            : 'text-gray-900 dark:text-gray-100'
        }
      >
        {valor}
      </span>
    </div>
  );
}

/** Cuánto lleva la solicitud sin respuesta, con la unidad que le toca. */
function haceCuanto(minutos: number): string {
  if (minutos < 1) return 'hace menos de un minuto';
  if (minutos < 60) return `hace ${minutos} min`;
  const horas = Math.floor(minutos / 60);
  const resto = minutos % 60;
  return resto > 0 ? `hace ${horas} h ${resto} min` : `hace ${horas} h`;
}

function ConfirmarCierreCajaContent() {
  const searchParams = useSearchParams();
  const token = searchParams?.get('token');

  const [solicitud, setSolicitud] = useState<SolicitudCierreCaja | null>(null);
  const [cargando, setCargando] = useState(true);
  const [procesando, setProcesando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resuelta, setResuelta] = useState<'aprobada' | 'rechazada' | null>(null);

  useEffect(() => {
    if (!token) {
      setError('Token de cierre no válido');
      setCargando(false);
      return;
    }

    const cargarSolicitud = async () => {
      try {
        const response = await fetch(
          `/api/cashregister/solicitud-cierre?token=${encodeURIComponent(token)}`
        );

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.message || 'Solicitud no encontrada');
        }

        const data = await response.json();
        setSolicitud(data.solicitud);

        // Ya resuelta (por ejemplo, el link se abrió dos veces): se muestra el
        // resultado en vez de ofrecer botones que no van a hacer nada.
        if (data.solicitud?.estado && data.solicitud.estado !== 'pendiente') {
          setResuelta(data.solicitud.estado);
        }
      } catch (err) {
        logger.captureException(err, { context: 'ConfirmarCierreCaja:cargarSolicitud' });
        setError(err instanceof Error ? err.message : 'Error al cargar la solicitud');
      } finally {
        setCargando(false);
      }
    };

    cargarSolicitud();
  }, [token]);

  const procesarCierre = async (accion: 'confirmar' | 'rechazar') => {
    if (!token) return;

    setProcesando(true);
    try {
      const response = await fetch('/api/cashregister/procesar-cierre', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, action: accion })
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok || !result.success) {
        throw new Error(result.message || 'Error al procesar el cierre');
      }

      setResuelta(accion === 'confirmar' ? 'aprobada' : 'rechazada');
      toast.success(
        accion === 'confirmar' ? 'Cierre de caja autorizado' : 'Cierre de caja rechazado'
      );
    } catch (err) {
      const mensaje = err instanceof Error ? err.message : 'Error desconocido';
      toast.error(mensaje);
      setError(mensaje);
    } finally {
      setProcesando(false);
    }
  };

  if (cargando) {
    return (
      <div className='min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950'>
        <div className='text-center'>
          <Loader2 className='h-8 w-8 animate-spin mx-auto mb-4 text-gray-900 dark:text-gray-100' />
          <p className='text-gray-900 dark:text-gray-100'>Cargando solicitud de cierre...</p>
        </div>
      </div>
    );
  }

  if (error && !solicitud) {
    return (
      <div className='min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950'>
        <Card className='w-full max-w-md'>
          <CardHeader>
            <CardTitle className='text-red-600 dark:text-red-400'>Error</CardTitle>
          </CardHeader>
          <CardContent>
            <Alert>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
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
            <CardTitle className='text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2'>
              Autorizar Cierre de Caja
            </CardTitle>
            <p className='text-gray-600 dark:text-gray-400 text-md'>
              La caja sigue abierta hasta que confirmes
            </p>
          </CardHeader>

          <CardContent className='space-y-6'>
            {resuelta ? (
              <div
                className={`p-4 rounded-lg border ${
                  resuelta === 'aprobada'
                    ? 'bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800'
                    : 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800'
                }`}
              >
                <h4 className='font-semibold mb-2 text-gray-900 dark:text-gray-100'>
                  {resuelta === 'aprobada' ? 'Cierre autorizado' : 'Cierre rechazado'}
                </h4>
                <p className='text-sm text-gray-700 dark:text-gray-300'>
                  {resuelta === 'aprobada'
                    ? `La caja quedó cerrada con un monto de cierre de ${formatCurrencyCLP(
                        solicitud.monto_cierre_calculado || 0
                      )}, descontando ${formatCurrencyCLP(
                        solicitud.saldo_clientes_descontado || 0
                      )} de saldos de clientes.`
                    : 'La caja sigue abierta. El cajero tendrá que volver a pedir el cierre.'}
                </p>
                {solicitud.resuelto_por && (
                  <p className='text-xs text-gray-500 dark:text-gray-400 mt-2'>
                    Resuelto por: {solicitud.resuelto_por}
                  </p>
                )}
              </div>
            ) : (
              <>
                <div className='bg-blue-50 dark:bg-blue-950/30 p-4 rounded-lg border border-blue-200 dark:border-blue-800'>
                  <h4 className='font-semibold text-blue-900 dark:text-blue-300 mb-3'>
                    Caja del turno
                  </h4>
                  <div className='space-y-2 text-sm'>
                    <Fila etiqueta='Cajero:' valor={solicitud.cajero_nombre || 'Sin asignar'} />
                    <Fila
                      etiqueta='Abierta el:'
                      valor={formatLongDateEs(solicitud.fecha_apertura)}
                    />
                    <Fila etiqueta='Solicitado por:' valor={solicitud.solicitado_por} />
                    <Fila
                      etiqueta='Pedido el:'
                      valor={formatLongDateEs(solicitud.fecha_solicitud)}
                    />
                    <Fila etiqueta='Estado:' valor='Abierta (pendiente de tu respuesta)' />
                  </div>
                </div>

                <div className='bg-amber-50 dark:bg-amber-950/30 p-4 rounded-lg border border-amber-200 dark:border-amber-800'>
                  <h4 className='font-semibold text-amber-900 dark:text-amber-300 mb-3'>
                    Cierre sin respuesta
                  </h4>
                  <div className='space-y-2 text-sm'>
                    <Fila
                      etiqueta='Sin respuesta desde:'
                      valor={haceCuanto(solicitud.minutos_sin_respuesta || 0)}
                    />
                    <Fila
                      etiqueta='Avisos enviados:'
                      valor={String(solicitud.avisos_enviados || 1)}
                    />
                    <Fila
                      etiqueta='Último aviso:'
                      valor={
                        solicitud.ultimo_aviso_en
                          ? `${formatDateTimeLabel(solicitud.ultimo_aviso_en).date}, ${
                              formatDateTimeLabel(solicitud.ultimo_aviso_en).time
                            }`
                          : 'Sin registro'
                      }
                    />
                  </div>
                  <p className='text-xs text-amber-800 dark:text-amber-300 mt-2'>
                    {Number(solicitud.avisos_enviados || 1) > 1
                      ? `Se avisó ${solicitud.avisos_enviados} veces y nadie contestó: el cajero ya puede pedir el cierre de nuevo.`
                      : 'Si no respondes, el cajero podrá pedir el cierre de nuevo y saldrá un aviso nuevo.'}
                  </p>
                </div>

                <div className='bg-purple-50 dark:bg-purple-950/30 p-4 rounded-lg border border-purple-200 dark:border-purple-800'>
                  <h4 className='font-semibold text-purple-900 dark:text-purple-300 mb-3'>
                    Movimiento del turno
                  </h4>
                  <div className='space-y-2 text-sm'>
                    <Fila etiqueta='Ventas:' valor={formatCurrencyCLP(solicitud.venta || 0)} />
                    <Fila
                      etiqueta='Servicios:'
                      valor={formatCurrencyCLP(solicitud.servicio || 0)}
                    />
                    <Fila etiqueta='Propinas:' valor={formatCurrencyCLP(solicitud.propina || 0)} />
                    <Fila
                      etiqueta='Comisiones:'
                      valor={formatCurrencyCLP(solicitud.comision || 0)}
                    />
                    <Fila
                      etiqueta='Anticipos:'
                      valor={formatCurrencyCLP(solicitud.anticipo || 0)}
                    />
                    <Fila etiqueta='IVA:' valor={formatCurrencyCLP(solicitud.iva || 0)} />
                  </div>
                </div>

                <div className='bg-gray-50 dark:bg-neutral-900 p-4 rounded-lg border border-gray-200 dark:border-neutral-800'>
                  <h4 className='font-semibold text-gray-900 dark:text-gray-100 mb-3'>
                    Dinero en caja
                  </h4>
                  <div className='space-y-2 text-sm'>
                    <Fila
                      etiqueta='Apertura:'
                      valor={formatCurrencyCLP(solicitud.monto_apertura || 0)}
                    />
                    <Fila etiqueta='Efectivo:' valor={formatCurrencyCLP(solicitud.efectivo || 0)} />
                    <Fila etiqueta='Tarjeta:' valor={formatCurrencyCLP(solicitud.tarjeta || 0)} />
                    <Fila
                      etiqueta='Transferencia:'
                      valor={formatCurrencyCLP(solicitud.transferencia || 0)}
                    />
                    <Fila
                      etiqueta='Devoluciones:'
                      valor={`-${formatCurrencyCLP(solicitud.devolucion || 0)}`}
                    />
                    <Fila
                      etiqueta='Anticipos (ya descontados):'
                      valor={`-${formatCurrencyCLP(solicitud.anticipo || 0)}`}
                    />
                    <Fila
                      etiqueta='Retiros (ya descontados):'
                      valor={`-${formatCurrencyCLP(solicitud.retiro_total || 0)}`}
                    />
                    <Fila
                      etiqueta='Saldos de clientes a descontar:'
                      valor={`-${formatCurrencyCLP(solicitud.saldo_clientes_descontado || 0)}`}
                    />
                  </div>
                  <p className='text-xs text-gray-600 dark:text-gray-400 mt-2'>
                    Efectivo es lo que queda en el cajón: los retiros y los anticipos de turno ya
                    salieron de ahí.
                  </p>
                </div>

                <div className='bg-orange-50 dark:bg-orange-950/30 p-4 rounded-lg border border-orange-200 dark:border-orange-800'>
                  <h4 className='font-semibold text-orange-900 dark:text-orange-300 mb-3'>
                    Prepago de clientes
                  </h4>
                  <div className='space-y-2 text-sm'>
                    <Fila
                      etiqueta='Cargado en el turno:'
                      valor={formatCurrencyCLP(solicitud.prepago_cargado || 0)}
                    />
                    <Fila
                      etiqueta='Consumido:'
                      valor={formatCurrencyCLP(solicitud.prepago_consumido || 0)}
                    />
                    <Fila
                      etiqueta='Pendiente de clientes:'
                      valor={formatCurrencyCLP(solicitud.prepago_pendiente_clientes || 0)}
                    />
                  </div>
                </div>

                <div className='bg-green-50 dark:bg-green-950/30 p-4 rounded-lg border border-green-200 dark:border-green-800'>
                  <div className='flex justify-between items-center'>
                    <span className='font-semibold text-green-900 dark:text-green-300'>
                      Monto de cierre previsto
                    </span>
                    <span className='text-lg font-bold text-green-700 dark:text-green-400'>
                      {formatCurrencyCLP(solicitud.monto_cierre_calculado || 0)}
                    </span>
                  </div>
                  <p className='text-xs text-green-800 dark:text-green-300 mt-2 flex items-start gap-1'>
                    <TriangleAlert className='h-3.5 w-3.5 mt-0.5 shrink-0' />
                    Los saldos de clientes se recalculan al autorizar: se descuenta lo que los
                    clientes tengan cargado en ese momento.
                  </p>
                </div>

                {solicitud.motivo && (
                  <div className='bg-yellow-50 dark:bg-yellow-950/30 p-4 rounded-lg border border-yellow-200 dark:border-yellow-800'>
                    <h3 className='font-semibold text-yellow-900 dark:text-yellow-300 mb-2'>
                      Motivo
                    </h3>
                    <p className='text-sm text-yellow-800 dark:text-yellow-200'>
                      {solicitud.motivo}
                    </p>
                  </div>
                )}

                <div className='flex gap-4 pt-4'>
                  <div className='flex justify-center gap-2 w-full'>
                    <Button
                      onClick={() => procesarCierre('rechazar')}
                      disabled={procesando}
                      variant='outline'
                      size='sm'
                      className='rounded-full hover:scale-105 transition-all duration-200 hover:bg-red-600 hover:text-white dark:hover:bg-red-500'
                    >
                      {procesando ? <Loader2 className='animate-spin' /> : <XCircle />}
                      Rechazar
                    </Button>

                    <Button
                      onClick={() => procesarCierre('confirmar')}
                      disabled={procesando}
                      size='sm'
                      variant='outline'
                      className='bg-black dark:bg-white text-white dark:text-black rounded-full hover:scale-105 transition-all duration-200'
                    >
                      {procesando ? <Loader2 className='animate-spin' /> : <CheckCircle />}
                      Autorizar cierre
                    </Button>
                  </div>
                </div>

                <div className='bg-blue-50 dark:bg-blue-950/30 p-4 rounded-lg border border-blue-200 dark:border-blue-800'>
                  <p className='text-sm text-blue-800 dark:text-blue-200 text-center'>
                    <strong>Información:</strong> al autorizar, la caja se cierra y se descuentan
                    del efectivo los saldos que los clientes todavía tienen cargados.
                  </p>
                </div>
              </>
            )}

            <Badge variant='outline' className='w-full justify-center'>
              Caja {solicitud.caja_id.slice(0, 8)}
            </Badge>
          </CardContent>
        </Card>
      </div>

      <Toaster richColors position='top-right' expand={true} closeButton={true} duration={4000} />
    </>
  );
}

export default function ConfirmarCierreCajaPage() {
  return (
    <Suspense
      fallback={
        <div className='min-h-screen flex items-center justify-center p-4 bg-gray-50 dark:bg-gray-950'>
          <Card className='w-full max-w-lg'>
            <CardContent className='text-center py-8'>
              <Loader2 className='animate-spin mx-auto mb-4 text-gray-900 dark:text-gray-100' />
              <p className='text-gray-900 dark:text-gray-100'>Cargando...</p>
            </CardContent>
          </Card>
        </div>
      }
    >
      <ConfirmarCierreCajaContent />
    </Suspense>
  );
}
