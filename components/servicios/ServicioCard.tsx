'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Clock,
  Users,
  Home,
  User,
  CreditCard,
  Edit2,
  Save,
  X,
  Square,
  History,
  Trash2,
  Settings2
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog';
import { ServiceTimeline } from './ServiceTimeline';
import { ServicioWithDetails } from '@/types/servicio';
import { formatCurrencyNoDecimals, formatSoloFecha, formatSoloHora } from '@/lib/formatters';
import { useTimer, useCountdown } from '@/contexts/TimerContext';
import { toast } from 'sonner';
import { useServicioAnfitrionas } from '@/contexts/ServicioAnfitrionasContext';
import { useCurrentUser } from '@/hooks/auth/useCurrentUser';
import EditServiceModal from './EditServiceModal';

interface ServicioCardProps {
  servicio: ServicioWithDetails;
  onStopTimer?: (servicioId: number) => void;
  onUpdate?: () => void;
  showAllServices?: boolean;
}

export default function ServicioCard({
  servicio,
  onStopTimer,
  onUpdate,
  showAllServices = false
}: ServicioCardProps) {
  const {
    getTimerByServicioId,
    formatTime,
    pauseTimerByServicioId,
    resumeTimerByServicioId,
    getTemporaryTimerByServicioId,
    stopTimerByServicioId
  } = useTimer();

  const { actualizarAnfitrionas, obtenerAnfitrionas } = useServicioAnfitrionas();

  const { user } = useCurrentUser();
  const isAdminOrCajero =
    user?.role?.toLowerCase() === 'administrador' || user?.role?.toLowerCase() === 'cajero';

  const globalTimer = getTimerByServicioId(servicio.id_servicio!);
  const temporaryTimer = getTemporaryTimerByServicioId(servicio.id_servicio!);

  const displayTimer = temporaryTimer || globalTimer;
  const isTemporaryActive = !!temporaryTimer;

  // Obtener el ID del servicio original cuando hay timer temporal
  const servicioIdOriginal =
    isTemporaryActive && temporaryTimer?.datosTemporales?.servicio_original_id
      ? temporaryTimer.datosTemporales.servicio_original_id
      : servicio.id_servicio;

  const anfitrionasDelContexto = obtenerAnfitrionas(servicioIdOriginal);

  const displayData =
    isTemporaryActive && temporaryTimer?.datosTemporales
      ? {
          ...servicio,
          ...temporaryTimer.datosTemporales,
          // Mantener el ID del servicio original para que el key sea consistente
          id_servicio: servicioIdOriginal
        }
      : {
          ...servicio,
          // Priorizar anfitrionas del contexto global (persistentes) sobre las originales del servicio
          anfitrionas_nombres: anfitrionasDelContexto || servicio.anfitrionas_nombres
        };

  const finalDisplayData = {
    ...displayData
  };

  const handleTemporaryTimerComplete = useCallback(
    (nuevasAnfitrionas: string) => {
      if (servicio?.id_servicio) {
        // Usar el contexto global para mantener las anfitrionas actualizadas
        actualizarAnfitrionas(servicio.id_servicio, nuevasAnfitrionas);

        // Forzar actualización del componente padre
        if (onUpdate) {
          setTimeout(() => {
            onUpdate();
          }, 100);
        }
      }
    },
    [servicio?.id_servicio, actualizarAnfitrionas, onUpdate]
  );

  const mainTimer = globalTimer
    ? {
        totalSeconds: globalTimer.remainingTime,
        isPaused: globalTimer.isPaused,
        isActive: globalTimer.isActive,
        isRunning: globalTimer.isActive && !globalTimer.isPaused
      }
    : null;

  const [showConfirm, setShowConfirm] = useState(false);
  const [stopping, setStopping] = useState(false);

  const [isEditing, setIsEditing] = useState(false);
  const [editPrecio, setEditPrecio] = useState(servicio.precio_servicio || 0);
  const [editTiempo, setEditTiempo] = useState(servicio.tiempo || 0);
  const [isSaving, setIsSaving] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);

  useEffect(() => {
    setEditPrecio(servicio.precio_servicio || 0);
    setEditTiempo(servicio.tiempo || 0);
  }, [servicio]);

  const handleSaveEdit = async () => {
    if (editPrecio < 0 || editTiempo <= 0) {
      toast.error('Precio y tiempo deben ser valores positivos');
      return;
    }

    setIsSaving(true);
    try {
      let totalDurationToSave = editTiempo;

      if (displayTimer && displayTimer.isActive) {
        const now = new Date();
        const startTime = new Date(displayTimer.startTime || new Date());
        const elapsedMinutes = Math.floor((now.getTime() - startTime.getTime()) / 60000);
        totalDurationToSave = elapsedMinutes + editTiempo;
      }

      const response = await fetch(`/api/servicios/${servicio.id_servicio}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          precio_servicio: editPrecio,
          tiempo: totalDurationToSave
        })
      });

      const result = await response.json();

      if (result.success) {
        toast.success('Servicio actualizado correctamente');
        setIsEditing(false);

        if (onUpdate) onUpdate();
      } else {
        toast.error(result.message || 'Error al actualizar servicio');
      }
    } catch (error) {
      toast.error('Error de conexión al actualizar');
    } finally {
      setIsSaving(false);
    }
  };

  const getEstadoBadge = (estado: number) => {
    const estadoNum = Number(estado);
    switch (estadoNum) {
      case 0:
        return (
          <Badge variant='destructive' className='text-xs'>
            Anulado
          </Badge>
        );
      case 1:
        return (
          <Badge variant='secondary' className='text-xs'>
            Finalizado
          </Badge>
        );
      case 2:
        return <Badge className='bg-green-100 text-green-800 text-xs'>En Proceso</Badge>;
      case 3:
        return <Badge className='bg-yellow-100 text-yellow-800 text-xs'>Pausado</Badge>;
      case 4:
        return <Badge className='bg-orange-100 text-orange-800 text-xs'>Solicitud Anulación</Badge>;
      default:
        return (
          <Badge variant='secondary' className='text-xs'>
            Desconocido
          </Badge>
        );
    }
  };

  const handleStopTimer = () => {
    setShowConfirm(true);
  };

  const confirmStopTimer = async () => {
    setStopping(true);
    try {
      const response = await fetch(`/api/servicios/${servicio.id_servicio}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ estado: 1 }) // 1 = Finalizado
      });

      if (response.ok) {
        // Detener el timer en el contexto global (esto también libera la habitación y actualiza el servicio)
        if (servicio.id_servicio) {
          stopTimerByServicioId(servicio.id_servicio);
        }

        if (onStopTimer) onStopTimer(servicio.id_servicio!);
        toast.success('Servicio finalizado exitosamente');
        setShowConfirm(false);
      } else {
        toast.error('Error al finalizar el servicio');
      }
    } catch (error) {
      toast.error('Error al finalizar el servicio');
    } finally {
      setStopping(false);
    }
  };

  const handlePauseMainTimer = useCallback(() => {
    if (servicio.id_servicio) {
      console.log('ServicioCard: Pausando timer principal para servicio:', servicio.id_servicio);
      pauseTimerByServicioId(servicio.id_servicio);
    }
  }, [servicio.id_servicio, pauseTimerByServicioId]);

  const handleResumeMainTimer = useCallback(() => {
    if (servicio.id_servicio) {
      console.log('ServicioCard: Reanudando timer principal para servicio:', servicio.id_servicio);
      resumeTimerByServicioId(servicio.id_servicio);
    }
  }, [servicio.id_servicio, resumeTimerByServicioId]);

  // Hook de alto rendimiento para el conteo regresivo
  const remainingTime = useCountdown(displayTimer);
  const mainRemainingTime = useCountdown(globalTimer); // Para mostrar el principal mientras hay uno temporal

  const isLowTime =
    isAdminOrCajero && displayTimer && displayTimer.isActive && remainingTime <= 300;
  const isCriticalTime =
    isAdminOrCajero && displayTimer && displayTimer.isActive && remainingTime <= 60;

  return (
    <Card
      className={`w-full transition-all duration-300 hover:shadow-xl hover:-translate-y-1 border-opacity-50 
      ${
        isCriticalTime
          ? 'animate-pulse-red border-red-500 shadow-red-100 dark:shadow-red-900/20 shadow-lg'
          : isLowTime
            ? 'animate-pulse-yellow border-yellow-400 shadow-yellow-50 dark:shadow-yellow-900/10 shadow-md'
            : 'hover:border-indigo-300 dark:hover:border-indigo-700'
      } 
      ${isLowTime && !isCriticalTime ? 'bg-yellow-50/30 dark:bg-yellow-900/10' : 'bg-white/80 dark:bg-zinc-900/80 backdrop-blur-sm'} 
      ${isCriticalTime ? 'bg-red-50/30 dark:border-red-800 dark:bg-red-900/20' : ''}`}
    >
      <div className='p-4 space-y-4'>
        {/* Header Row */}
        <div className='flex items-center justify-between'>
          <div className='flex items-center gap-3'>
            <div className='flex items-center gap-2'>
              <Home className='w-4 h-4 text-gray-600 dark:text-gray-400' />
              <span className='font-semibold text-md text-gray-900 dark:text-gray-100'>
                {servicio.habitacion_numero}
              </span>
            </div>
            {getEstadoBadge(servicio.estado ?? 1)}
          </div>
          <div className='flex items-center gap-2'>
            <span className='text-xs text-gray-500 dark:text-gray-400 font-mono'>
              #{servicio.codigo}
            </span>
            {Number(servicio.precio_servicio || 0) === 0 && !isEditing && (
              <>
                <Button
                  variant='ghost'
                  size='sm'
                  onClick={() => setShowEditModal(true)}
                  className='h-8 w-8 p-0 hover:bg-gray-100 dark:hover:bg-gray-800'
                  title='Editar servicio'
                >
                  <Edit2 className='w-3 h-3 text-gray-600 dark:text-gray-400' />
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Timer Section - Solo para Admin y Cajero */}
        {isAdminOrCajero && (
          <div className='flex items-center justify-between'>
            <div className='flex items-center gap-2'>
              <Clock
                className={`w-4 h-4 ${isLowTime ? 'text-red-500' : displayTimer?.isPaused ? 'text-orange-500' : isTemporaryActive ? 'text-blue-500' : 'text-gray-500 dark:text-gray-400'}`}
              />
              <span className='text-sm text-gray-600 dark:text-gray-300'>
                {isEditing
                  ? 'Editando tiempo'
                  : isTemporaryActive
                    ? 'Timer temporal'
                    : displayTimer?.isPaused
                      ? 'Pausado (editando)'
                      : 'Tiempo restante'}
              </span>
            </div>
            <div className='text-right'>
              {isEditing ? (
                <div className='flex items-center gap-2'>
                  <Input
                    type='number'
                    value={editTiempo}
                    onChange={e => setEditTiempo(Number(e.target.value))}
                    className='h-8 w-16 text-center text-sm'
                    min={1}
                    disabled={isSaving}
                  />
                  <span className='text-xs text-gray-500 dark:text-gray-400'>min</span>
                </div>
              ) : (
                <div className='flex items-center gap-2'>
                  <span
                    className={`font-mono text-lg font-semibold ${isLowTime ? 'text-red-600' : displayTimer?.isPaused ? 'text-orange-600' : isTemporaryActive ? 'text-blue-600' : 'text-gray-900 dark:text-gray-100'}`}
                  >
                    {showAllServices
                      ? `${servicio.tiempo}:00`
                      : displayTimer
                        ? formatTime(remainingTime)
                        : '00:00'}
                  </span>
                  {isTemporaryActive && (
                    <span className='text-xs bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 px-2 py-1 rounded-full'>
                      TEMPORAL
                    </span>
                  )}
                  {displayTimer?.isPaused && !isTemporaryActive && (
                    <span className='text-xs bg-orange-100 dark:bg-orange-900 text-orange-700 dark:text-orange-300 px-2 py-1 rounded-full'>
                      PAUSADO
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Información adicional cuando hay timer temporal */}
        {isTemporaryActive && mainTimer && (
          <div className='bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 text-xs'>
            <div className='flex items-center justify-between mb-2'>
              <span className='text-blue-700 dark:text-blue-300 font-medium'>Timer Principal:</span>
              <div className='flex items-center gap-2'>
                <span className='text-blue-600 dark:text-blue-400 font-mono'>
                  {formatTime(mainRemainingTime)}
                </span>
                <span
                  className={`px-2 py-1 rounded-full text-xs ${
                    mainTimer.isPaused
                      ? 'bg-orange-100 dark:bg-orange-900 text-orange-700 dark:text-orange-300'
                      : 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300'
                  }`}
                >
                  {mainTimer.isPaused ? 'PAUSADO' : 'ACTIVO'}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Client and Hostesses */}
        <div className='grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm'>
          <div className='flex items-center gap-2'>
            <User className='w-4 h-4 text-blue-500 flex-shrink-0' />
            <div className='min-w-0'>
              <span className='text-xs text-gray-500 dark:text-gray-400 block'>Cliente</span>
              <span className='font-medium truncate block text-gray-900 dark:text-gray-100'>
                {servicio.cliente_nombre || 'Sin registrar'}
              </span>
            </div>
          </div>
          <div className='flex items-start gap-2'>
            <Users className='w-4 h-4 text-purple-500 flex-shrink-0 mt-0.5' />
            <div className='min-w-0 flex-1'>
              <span className='text-xs text-gray-500 dark:text-gray-400 block'>Anfitrionas</span>
              {finalDisplayData.anfitrionas_nombres ? (
                <div className='space-y-1'>
                  {finalDisplayData.anfitrionas_nombres
                    .split(', ')
                    .map((nick: string, index: number) => (
                      <div
                        key={index}
                        className={`text-xs px-2 py-1 rounded-full inline-block mr-1 mb-1 ${
                          isTemporaryActive
                            ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
                            : 'bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300'
                        }`}
                      >
                        {nick.trim()}
                      </div>
                    ))}
                </div>
              ) : (
                <span className='text-xs text-gray-500 dark:text-gray-400 italic'>Sin asignar</span>
              )}
            </div>
          </div>
        </div>

        {/* Creator Information */}
        {servicio.creator_name && (
          <div className='flex items-center gap-2 text-sm'>
            <User className='w-4 h-4 text-green-500 flex-shrink-0' />
            <div className='min-w-0'>
              <span className='text-xs text-gray-500 dark:text-gray-400 block'>Creado por</span>
              <span className='font-medium truncate block text-gray-900 dark:text-gray-100'>
                {servicio.creator_name}
              </span>
            </div>
          </div>
        )}

        {/* Pricing Section */}
        <div className='flex items-center justify-between pt-3 border-t border-gray-200 dark:border-gray-700'>
          <div className='flex items-center gap-4 text-xs'>
            <div>
              <span className='text-gray-500 dark:text-gray-400'>Servicio: </span>
              {isEditing ? (
                <Input
                  type='number'
                  value={editPrecio}
                  onChange={e => setEditPrecio(Number(e.target.value))}
                  className='h-6 w-20 text-xs inline-block ml-1'
                  disabled={isSaving}
                />
              ) : (
                <span
                  className={`font-medium ${isTemporaryActive ? 'text-blue-600 dark:text-blue-400' : 'text-gray-900 dark:text-gray-100'}`}
                >
                  {formatCurrencyNoDecimals(finalDisplayData.precio_servicio)}
                  {isTemporaryActive && <span className='text-blue-500 ml-1'>*</span>}
                </span>
              )}
            </div>
            <div>
              <span className='text-gray-500 dark:text-gray-400'>Habitacion: </span>
              <span
                className={`font-medium ${isTemporaryActive ? 'text-blue-600 dark:text-blue-400' : 'text-gray-900 dark:text-gray-100'}`}
              >
                {formatCurrencyNoDecimals(finalDisplayData.precio_habitacion)}
                {isTemporaryActive && <span className='text-blue-500 ml-1'>*</span>}
              </span>
              {finalDisplayData.habitacion_comision &&
                finalDisplayData.habitacion_comision > 0 &&
                !isTemporaryActive && (
                  <span className='text-xs text-gray-600 dark:text-gray-400 font-medium ml-2'>
                    Comisión:{' '}
                    <span
                      className={`font-medium ${isTemporaryActive ? 'text-blue-600 dark:text-blue-400' : 'text-gray-900 dark:text-gray-100'}`}
                    >
                      {formatCurrencyNoDecimals(finalDisplayData.habitacion_comision)}
                    </span>
                  </span>
                )}
            </div>
            {finalDisplayData.iva > 0 && (
              <div>
                <span className='text-gray-500 dark:text-gray-400'>IVA: </span>
                <span
                  className={`font-medium text-purple-600 dark:text-purple-400 ${isTemporaryActive ? 'text-blue-600 dark:text-blue-400' : ''}`}
                >
                  {formatCurrencyNoDecimals(finalDisplayData.iva)}
                  {isTemporaryActive && <span className='text-blue-500 ml-1'>*</span>}
                </span>
              </div>
            )}
          </div>
          <div className='text-right'>
            <div
              className={`text-lg font-bold ${isTemporaryActive ? 'text-blue-600 dark:text-blue-400' : 'text-gray-900 dark:text-gray-100'}`}
            >
              {formatCurrencyNoDecimals(finalDisplayData.total)}
              {isTemporaryActive && <span className='text-blue-500 ml-1'>*</span>}
            </div>
            <div className='flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400'>
              <CreditCard className='w-3 h-3' />
              <span className='capitalize'>{finalDisplayData.metodo_pago || 'efectivo'}</span>
            </div>
          </div>
        </div>

        {/* Nota sobre valores temporales */}
        {isTemporaryActive && (
          <div className='text-xs text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-2 py-1 rounded border-t border-blue-200 dark:border-blue-800'>
            <span className='font-medium'>* Valores temporales</span> - Precios se restaurarán,
            anfitrionas se mantendrán cuando termine el timer temporal
          </div>
        )}

        {/* Date and Actions */}
        <div className='flex items-center justify-between pt-2'>
          <div className='text-xs text-gray-500 dark:text-gray-400'>
            <div>{formatSoloFecha(servicio.fecha_crea || '')}</div>
            <div>{formatSoloHora(servicio.fecha_crea || '')}</div>
          </div>
          <div className='flex gap-2'>
            {isEditing && (
              <>
                <Button
                  size='sm'
                  variant='ghost'
                  onClick={() => setIsEditing(false)}
                  disabled={isSaving}
                  className='hover:bg-gray-100 dark:hover:bg-gray-800'
                >
                  <X className='w-3 h-3 text-gray-600 dark:text-gray-400' />
                </Button>
                <Button size='sm' onClick={handleSaveEdit} disabled={isSaving}>
                  <Save className='w-3 h-3 mr-1' />
                  Guardar
                </Button>
              </>
            )}
            {isAdminOrCajero &&
              displayTimer &&
              displayTimer.isActive &&
              !showAllServices &&
              !isEditing && (
                <Button
                  size='sm'
                  variant='outline'
                  onClick={handleStopTimer}
                  className='text-red-600 border-red-200 hover:bg-red-50 dark:text-red-400 dark:border-red-800 dark:hover:bg-red-900/20'
                >
                  <Square className='w-3 h-3 mr-1' />
                  Finalizar
                </Button>
              )}
          </div>
        </div>
      </div>

      {/* Edit Service Modal */}
      <EditServiceModal
        open={showEditModal}
        onOpenChange={setShowEditModal}
        servicio={servicio}
        onUpdate={onUpdate}
        onPauseMainTimer={handlePauseMainTimer}
        onResumeMainTimer={handleResumeMainTimer}
        onTemporaryTimerComplete={handleTemporaryTimerComplete}
      />

      {showConfirm && (
        <div className='fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4'>
          <div className='bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-sm w-full flex flex-col max-h-[90vh] overflow-hidden'>
            {/* Header (Fijo) */}
            <div className='p-6 border-b text-center flex-shrink-0'>
              <Clock className='w-12 h-12 text-red-500 mx-auto mb-2' />
              <h3 className='text-lg font-semibold text-gray-900 dark:text-gray-100'>
                ¿Finalizar sesión?
              </h3>
            </div>

            {/* Contenido (Scrollable) */}
            <div className='p-6 flex-1 overflow-y-auto text-center'>
              <p className='text-sm text-gray-600 dark:text-gray-300'>
                Se liberará la habitación y se guardará el registro.
              </p>
            </div>

            {/* Footer (Fijo) */}
            <div className='p-6 border-t flex-shrink-0'>
              <div className='flex gap-3'>
                <Button
                  variant='outline'
                  className='flex-1 rounded-full'
                  onClick={() => setShowConfirm(false)}
                >
                  Cancelar
                </Button>
                <Button
                  className='flex-1 bg-red-600 hover:bg-red-700 rounded-full'
                  onClick={confirmStopTimer}
                  disabled={stopping}
                >
                  {stopping ? 'Finalizando...' : 'Finalizar'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}
