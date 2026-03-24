/* eslint-disable */
'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatDateTimeLabel } from '@/lib/calendarUtils';
import { formatNumberCL } from '@/lib/formatters';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { showSuccessToast, showErrorToast } from '@/lib/toastUtils';
import { useRouter } from 'next/navigation';
import { CheckCircle2, XCircle, Clock, User, Users, Home, DollarSign, Trash2 } from 'lucide-react';

interface Solicitud {
  id_solicitud: number;
  codigo?: string;
  cliente_id?: number;
  habitacion_id: number;
  precio_servicio: number;
  precio_habitacion: number;
  anfitrionas_ids: number[];
  metodo_pago: string;
  tiempo: number;
  total: number;
  solicitado_por: number;
  estado: 'pendiente' | 'aprobada' | 'rechazada';
  motivo_rechazo?: string;
  procesado_por?: number;
  fecha_solicitud: string;
  fecha_procesamiento?: string;
  solicitado_por_nombre: string;
  solicitado_por_nick: string;
  procesado_por_nombre?: string;
  cliente_nombre?: string;
  habitacion_nombre: string;
  habitacion_numero: number;
}

export function SolicitudesServiciosList() {
  const [solicitudes, setSolicitudes] = useState<Solicitud[]>([]);
  const [loading, setLoading] = useState(true);
  const [showActionModal, setShowActionModal] = useState(false);
  const [selectedSolicitud, setSelectedSolicitud] = useState<Solicitud | null>(null);
  const [motivoRechazo, setMotivoRechazo] = useState('');
  const [processing, setProcessing] = useState(false);
  const [anfitrionasInfo, setAnfitrionasInfo] = useState<Record<number, any>>({});
  const router = useRouter();

  const fetchSolicitudes = async () => {
    try {
      const response = await fetch('/api/solicitudes-servicios?estado=pendiente');
      const data = await response.json();

      if (data.success) {
        const pendientes = (data.data || []).filter((s: Solicitud) => s.estado === 'pendiente');
        setSolicitudes(pendientes);
        // Obtener información de anfitrionas
        await fetchAnfitrionasInfo(pendientes);
      } else {
        showErrorToast(data.message || 'Error al cargar solicitudes');
      }
    } catch (error) {
      console.error('Error:', error);
      showErrorToast('Error al cargar solicitudes');
    } finally {
      setLoading(false);
    }
  };

  const fetchAnfitrionasInfo = async (solicitudes: Solicitud[]) => {
    const anfitrionasIds = new Set<number>();
    solicitudes.forEach((s) => {
      s.anfitrionas_ids.forEach((id) => anfitrionasIds.add(id));
    });

    try {
      const response = await fetch('/api/anfitrionas');
      const data = await response.json();

      if (data.success) {
        const anfitrionasMap: Record<number, any> = {};
        data.data.forEach((anf: any) => {
          anfitrionasMap[anf.id_anfitriona] = anf;
        });
        setAnfitrionasInfo(anfitrionasMap);
      }
    } catch (error) {
      console.error('Error al cargar anfitrionas:', error);
    }
  };

  useEffect(() => {
    fetchSolicitudes();
  }, []);

  const handleAprobar = async (solicitud: Solicitud) => {
    setProcessing(true);
    try {
      const response = await fetch(`/api/solicitudes-servicios/${solicitud.id_solicitud}/aprobar`, {
        method: 'PATCH'
      });

      const data = await response.json();

      if (data.success) {
        showSuccessToast('Solicitud aprobada y servicio creado exitosamente');
        setShowActionModal(false);
        setSelectedSolicitud(null);
        setMotivoRechazo('');
        fetchSolicitudes();

        // Disparar evento para actualizar otras vistas
        const updateEvent = new CustomEvent('updateServiceRequests');
        window.dispatchEvent(updateEvent);
      } else {
        showErrorToast(data.message || 'Error al aprobar solicitud');
      }
    } catch (error) {
      console.error('Error:', error);
      showErrorToast('Error al aprobar solicitud');
    } finally {
      setProcessing(false);
    }
  };

  const handleRechazar = async () => {
    if (!selectedSolicitud) return;
    if (!motivoRechazo.trim()) {
      showErrorToast('El motivo de rechazo es requerido');
      return;
    }

    setProcessing(true);
    try {
      const response = await fetch(`/api/solicitudes-servicios/${selectedSolicitud.id_solicitud}/rechazar`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ motivo_rechazo: motivoRechazo })
      });

      const data = await response.json();

      if (data.success) {
        showSuccessToast('Solicitud rechazada exitosamente');
        setShowActionModal(false);
        setMotivoRechazo('');
        setSelectedSolicitud(null);
        fetchSolicitudes();

        // Disparar evento para actualizar otras vistas
        const updateEvent = new CustomEvent('updateServiceRequests');
        window.dispatchEvent(updateEvent);
      } else {
        showErrorToast(data.message || 'Error al rechazar solicitud');
      }
    } catch (error) {
      console.error('Error:', error);
      showErrorToast('Error al rechazar solicitud');
    } finally {
      setProcessing(false);
    }
  };

  const formatDate = (dateString: string) => {
    const { date, time } = formatDateTimeLabel(dateString);
    return `${date} ${time}`;
  };

  const formatNumber = (num: number) => formatNumberCL(num);

  const handleOpenModal = (solicitud: Solicitud) => {
    setSelectedSolicitud(solicitud);
    setMotivoRechazo('');
    setShowActionModal(true);
  };

  const handleDelete = async (solicitud: Solicitud) => {
    if (!confirm('¿Eliminar esta solicitud?')) return;
    setProcessing(true);
    try {
      const response = await fetch(`/api/solicitudes-servicios?id=${solicitud.id_solicitud}`, {
        method: 'DELETE'
      });
      const data = await response.json();
      if (data.success) {
        showSuccessToast('Solicitud eliminada');
        fetchSolicitudes();
        const updateEvent = new CustomEvent('updateServiceRequests');
        window.dispatchEvent(updateEvent);
      } else {
        showErrorToast(data.message || 'Error al eliminar solicitud');
      }
    } catch (error) {
      showErrorToast('Error al eliminar solicitud');
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className='flex justify-center items-center h-64'>
        <p className='text-gray-500 dark:text-gray-400'>Cargando solicitudes...</p>
      </div>
    );
  }

  if (solicitudes.length === 0) {
    return (
      <div className='flex justify-center items-center h-64'>
        <p className='text-gray-500 dark:text-gray-400'>No hay solicitudes pendientes</p>
      </div>
    );
  }

  return (
    <>
      <div className='grid gap-6'>
        {solicitudes.map((solicitud) => (
          <Card
            key={solicitud.id_solicitud}
            className='bg-white dark:bg-[#2a2a2a] border-gray-200 dark:border-gray-700 cursor-pointer'
            onClick={() => handleOpenModal(solicitud)}
          >
            <CardHeader>
              <div className='flex justify-between items-start'>
                <div>
                  <CardTitle className='text-lg font-semibold text-gray-900 dark:text-white'>
                    Solicitud {solicitud.codigo ? `#${solicitud.codigo}` : `#${solicitud.id_solicitud}`}
                  </CardTitle>
                  <div className='flex items-center gap-2 mt-1 text-sm text-gray-600 dark:text-gray-400'>
                    <Clock className='w-4 h-4' />
                    {formatDate(solicitud.fecha_solicitud)}
                  </div>
                </div>
                <div className='flex items-center gap-2'>
                  <Badge className='bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'>
                    Pendiente
                  </Badge>
                  <Button
                    size='icon'
                    variant='ghost'
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(solicitud);
                    }}
                    disabled={processing}
                    className='text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20'
                  >
                    <Trash2 className='w-4 h-4' />
                  </Button>
                </div>
              </div>
            </CardHeader>

            <CardContent>
              <div className='space-y-4'>
                {/* Información básica */}
                <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                  <div className='flex items-center gap-2'>
                    <User className='w-5 h-5 text-gray-500 dark:text-gray-400' />
                    <div>
                      <p className='text-xs text-gray-500 dark:text-gray-400'>Solicitado por</p>
                      <p className='font-medium text-gray-900 dark:text-white'>
                        {solicitud.solicitado_por_nombre} ({solicitud.solicitado_por_nick})
                      </p>
                    </div>
                  </div>

                  <div className='flex items-center gap-2'>
                    <User className='w-5 h-5 text-gray-500 dark:text-gray-400' />
                    <div>
                      <p className='text-xs text-gray-500 dark:text-gray-400'>Cliente</p>
                      <p className='font-medium text-gray-900 dark:text-white'>
                        {solicitud.cliente_nombre || 'Sin cliente registrado'}
                      </p>
                    </div>
                  </div>

                  <div className='flex items-center gap-2'>
                    <Home className='w-5 h-5 text-gray-500 dark:text-gray-400' />
                    <div>
                      <p className='text-xs text-gray-500 dark:text-gray-400'>Habitación</p>
                      <p className='font-medium text-gray-900 dark:text-white'>
                        {solicitud.habitacion_nombre} #{solicitud.habitacion_numero}
                      </p>
                    </div>
                  </div>

                  <div className='flex items-center gap-2'>
                    <Clock className='w-5 h-5 text-gray-500 dark:text-gray-400' />
                    <div>
                      <p className='text-xs text-gray-500 dark:text-gray-400'>Tiempo</p>
                      <p className='font-medium text-gray-900 dark:text-white'>{solicitud.tiempo} min</p>
                    </div>
                  </div>
                </div>

                {/* Anfitrionas */}
                <div>
                  <div className='flex items-center gap-2 mb-2'>
                    <Users className='w-5 h-5 text-gray-500 dark:text-gray-400' />
                    <p className='text-sm font-medium text-gray-900 dark:text-white'>
                      Anfitrionas ({solicitud.anfitrionas_ids.length})
                    </p>
                  </div>
                  <div className='flex flex-wrap gap-2'>
                    {solicitud.anfitrionas_ids.map((anfId) => {
                      const anf = anfitrionasInfo[anfId];
                      return (
                        <Badge key={anfId} variant='outline' className='bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-700'>
                          {anf ? `${anf.nombre} ${anf.apellido}` : `Anfitriona #${anfId}`}
                        </Badge>
                      );
                    })}
                  </div>
                </div>

                {/* Detalles de pago */}
                <div className='border-t pt-4 dark:border-gray-700'>
                  <div className='grid grid-cols-2 gap-3 text-sm'>
                    <div>
                      <p className='text-gray-500 dark:text-gray-400'>Precio servicio</p>
                      <p className='font-medium text-gray-900 dark:text-white'>${formatNumber(solicitud.precio_servicio)}</p>
                    </div>
                    <div>
                      <p className='text-gray-500 dark:text-gray-400'>Precio habitación</p>
                      <p className='font-medium text-gray-900 dark:text-white'>${formatNumber(solicitud.precio_habitacion)}</p>
                    </div>
                    <div>
                      <p className='text-gray-500 dark:text-gray-400'>Método de pago</p>
                      <p className='font-medium text-gray-900 dark:text-white capitalize'>{solicitud.metodo_pago}</p>
                    </div>
                    <div>
                      <p className='text-gray-500 dark:text-gray-400 font-bold'>Total</p>
                      <p className='text-lg font-bold text-green-600 dark:text-green-400'>${formatNumber(solicitud.total)}</p>
                    </div>
                  </div>
                </div>

                {/* Botones de acción */}
                <div className='flex gap-3 pt-4'>
                  <Button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleAprobar(solicitud);
                    }}
                    disabled={processing}
                    className='flex-1 bg-green-600 hover:bg-green-700 text-white rounded-full'
                  >
                    <CheckCircle2 className='w-4 h-4 mr-2' />
                    Aprobar
                  </Button>
                  <Button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedSolicitud(solicitud);
                      setShowActionModal(true);
                    }}
                    disabled={processing}
                    variant='destructive'
                    className='flex-1 rounded-full'
                  >
                    <XCircle className='w-4 h-4 mr-2' />
                    Rechazar
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Modal de acciones */}
      <Dialog open={showActionModal} onOpenChange={setShowActionModal}>
        <DialogContent className='bg-white dark:bg-[#2a2a2a] border-gray-200 dark:border-gray-700'>
          <DialogHeader>
            <DialogTitle className='text-gray-900 dark:text-white'>
              Solicitud #{selectedSolicitud?.id_solicitud}
            </DialogTitle>
          </DialogHeader>
          <div className='space-y-4'>
            {selectedSolicitud && (
              <div className='space-y-2 text-sm text-gray-700 dark:text-gray-300'>
                <div>
                  <span className='font-medium'>Cliente:</span>{' '}
                  {selectedSolicitud.cliente_nombre || 'Sin cliente registrado'}
                </div>
                <div>
                  <span className='font-medium'>Habitación:</span>{' '}
                  {selectedSolicitud.habitacion_nombre} #{selectedSolicitud.habitacion_numero}
                </div>
                <div>
                  <span className='font-medium'>Tiempo:</span> {selectedSolicitud.tiempo} min
                </div>
                <div>
                  <span className='font-medium'>Total:</span> ${formatNumber(selectedSolicitud.total)}
                </div>
                <div>
                  <span className='font-medium'>Garzón:</span>{' '}
                  {selectedSolicitud.solicitado_por_nombre || selectedSolicitud.solicitado_por_nick || 'N/A'}
                </div>
                <div>
                  <span className='font-medium'>Método de pago:</span>{' '}
                  {selectedSolicitud.metodo_pago}
                </div>
                <div>
                  <span className='font-medium'>Anfitrionas:</span>{' '}
                  {selectedSolicitud.anfitrionas_ids.map((anfId) => {
                    const anf = anfitrionasInfo[anfId];
                    return anf ? `${anf.nombre} ${anf.apellido}` : `Anfitriona #${anfId}`;
                  }).join(', ')}
                </div>
              </div>
            )}
            <div>
              <Label htmlFor='motivo' className='text-gray-900 dark:text-white'>
                Motivo del rechazo *
              </Label>
              <Textarea
                id='motivo'
                value={motivoRechazo}
                onChange={(e) => setMotivoRechazo(e.target.value)}
                placeholder='Explica por qué se rechaza esta solicitud'
                className='mt-2 bg-white dark:bg-[#1a1a1a] border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white rounded-xl'
                rows={4}
              />
            </div>
            <div className='flex gap-3'>
              <Button
                onClick={() => {
                  setShowActionModal(false);
                  setMotivoRechazo('');
                  setSelectedSolicitud(null);
                }}
                variant="outline"
                className="flex-1 rounded-full"
                disabled={processing}
              >
                Cerrar
              </Button>
              <Button
                onClick={() => selectedSolicitud && handleAprobar(selectedSolicitud)}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white rounded-full"
                disabled={processing || !selectedSolicitud}
              >
                {processing ? 'Procesando...' : 'Aprobar'}
              </Button>
              <Button
                onClick={handleRechazar}
                variant='destructive'
                className='flex-1 rounded-full'
                disabled={processing || !motivoRechazo.trim()}
              >
                {processing ? 'Procesando...' : 'Rechazar'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

