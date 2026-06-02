'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Clock } from 'lucide-react';
import { ServicioWithDetails } from '@/types/servicio';
import { useTimer, useCountdown } from '@/contexts/TimerContext';
import { toast } from 'sonner';
import { useServicioAnfitrionas } from '@/contexts/ServicioAnfitrionasContext';
import { useCurrentUser } from '@/hooks/auth/useCurrentUser';
import EditServiceModal from './EditServiceModal';
import {
  buildServicioCardDisplayData
} from './servicioCardUtils';
import {
  ServicioCardActions,
  ServicioCardFinancial,
  ServicioCardHeader,
  ServicioCardInfo,
  ServicioCardSummary,
  ServicioCardTemporaryTime,
  ServicioCardTimerSection
} from './ServicioCardSections';

interface ServicioCardProps {
  servicio: ServicioWithDetails;
  onStopTimer?: (servicioId: string | number) => void;
  onUpdate?: () => void;
  showAllServices?: boolean;
  onShowDetail?: (servicio: ServicioWithDetails) => void;
}

export default function ServicioCard({
  servicio,
  onStopTimer,
  onUpdate,
  showAllServices = false,
  onShowDetail
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

  const rawId = servicio.id_servicio ?? servicio.id;
  const servicioIdStr = String(rawId || 'NO-ID');
  const effectiveTimerId =
    servicio.es_temporal && servicio.servicio_original_id
      ? String(servicio.servicio_original_id)
      : servicioIdStr;

  const globalTimer = getTimerByServicioId(effectiveTimerId);
  const temporaryTimer = getTemporaryTimerByServicioId(effectiveTimerId);
  const displayTimer = temporaryTimer || globalTimer;
  const isTemporaryActive = !!temporaryTimer;
  const shouldHideCard = !servicio.es_temporal && isTemporaryActive;

  const servicioIdOriginal =
    isTemporaryActive && temporaryTimer?.datosTemporales?.servicio_original_id
      ? temporaryTimer.datosTemporales.servicio_original_id
      : servicio.id_servicio;

  const anfitrionasDelContexto = obtenerAnfitrionas(Number(servicioIdOriginal));
  const finalDisplayData = buildServicioCardDisplayData(
    servicio,
    temporaryTimer,
    anfitrionasDelContexto
  );

  const handleTemporaryTimerComplete = useCallback(
    (nuevasAnfitrionas: string) => {
      if (servicio?.id_servicio) {
        actualizarAnfitrionas(Number(servicio.id_servicio), nuevasAnfitrionas);
        if (onUpdate) {
          setTimeout(() => {
            onUpdate();
          }, 100);
        }
      }
    },
    [servicio?.id_servicio, actualizarAnfitrionas, onUpdate]
  );

  const mainFrozenRemainingTime = temporaryTimer?.datosTemporales?.tiempo_principal_congelado;
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
  }, [servicio.precio_servicio, servicio.tiempo]);

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

      const response = await fetch(`/api/servicios/${servicioIdStr}`, {
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
    } catch {
      toast.error('Error de conexión al actualizar');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCardClick = () => {
    if (showAllServices && onShowDetail) {
      onShowDetail(servicio);
    }
  };

  const handleStopTimer = () => {
    setShowConfirm(true);
  };

  const confirmStopTimer = async () => {
    if (!servicioIdStr || servicioIdStr === 'NO-ID') {
      toast.error('No se pudo determinar el ID del servicio');
      return;
    }

    setStopping(true);
    try {
      const response = await fetch(`/api/servicios/${servicioIdStr}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ estado: 1 })
      });

      if (response.ok) {
        stopTimerByServicioId(servicioIdStr);
        if (onStopTimer && rawId != null) onStopTimer(rawId);
        toast.success('Servicio finalizado exitosamente');
        setShowConfirm(false);
      } else {
        toast.error('Error al finalizar el servicio');
      }
    } catch {
      toast.error('Error al finalizar el servicio');
    } finally {
      setStopping(false);
    }
  };

  const handlePauseMainTimer = useCallback(() => {
    if (servicioIdStr && servicioIdStr !== 'NO-ID') {
      pauseTimerByServicioId(servicioIdStr);
    }
  }, [servicioIdStr, pauseTimerByServicioId]);

  const handleResumeMainTimer = useCallback(() => {
    if (servicioIdStr && servicioIdStr !== 'NO-ID') {
      resumeTimerByServicioId(servicioIdStr);
    }
  }, [servicioIdStr, resumeTimerByServicioId]);

  const remainingTime = useCountdown(displayTimer);
  const mainRemainingTime = useCountdown(globalTimer);

  const isLowTime = Boolean(
    isAdminOrCajero && displayTimer && displayTimer.isActive && remainingTime <= 300
  );
  const isCriticalTime = Boolean(
    isAdminOrCajero && displayTimer && displayTimer.isActive && remainingTime <= 60
  );

  const showEditButton =
    Number(servicio.habitacion_comision || 0) > 0 && !isEditing && servicio.estado !== 1;
  const canStop =
    isAdminOrCajero && !!displayTimer && displayTimer.isActive && !showAllServices && !isEditing;

  if (shouldHideCard) {
    return null;
  }

  return (
    <Card
      className={`relative w-full cursor-pointer overflow-hidden border border-zinc-200/70 bg-white shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg dark:border-zinc-800/70 dark:bg-zinc-950/95 dark:shadow-black/20 ${showAllServices ? 'hover:cursor-pointer' : ''} ${isCriticalTime ? 'animate-pulse-red border-red-500/80 shadow-red-100/30 dark:border-red-900/70 dark:shadow-red-950/20' : isLowTime ? 'animate-pulse-yellow border-amber-400/80 shadow-amber-100/30 dark:border-amber-900/70 dark:shadow-amber-950/10' : 'hover:border-zinc-300 dark:hover:border-zinc-700'} ${isLowTime && !isCriticalTime ? 'bg-amber-50/40 dark:bg-amber-950/10' : ''} ${isCriticalTime ? 'bg-red-50/40 dark:bg-red-950/15' : ''}`}
      onClick={handleCardClick}
    >
      <div className='relative space-y-3.5 p-4 md:p-5'>
        <ServicioCardHeader
          habitacionNumero={servicio.habitacion_numero}
          codigo={servicio.codigo}
          estado={servicio.estado ?? 1}
          isTemporaryActive={isTemporaryActive}
          onEditClick={() => setShowEditModal(true)}
          showEditButton={showEditButton}
        />

        <ServicioCardTimerSection
          isAdminOrCajero={isAdminOrCajero}
          isEditing={isEditing}
          isTemporaryActive={isTemporaryActive}
          displayTimer={displayTimer}
          isLowTime={isLowTime}
          editTiempo={editTiempo}
          setEditTiempo={setEditTiempo}
          isSaving={isSaving}
          showAllServices={showAllServices}
          formatTime={formatTime}
          remainingTime={remainingTime}
        />

        <ServicioCardTemporaryTime
          isTemporaryActive={isTemporaryActive}
          isTemporal={!!servicio.es_temporal}
          mainFrozenRemainingTime={mainFrozenRemainingTime}
          mainRemainingTime={mainRemainingTime}
          formatTime={formatTime}
        />

        <ServicioCardInfo
          clienteNombre={servicio.cliente_nombre}
          anfitrionas={finalDisplayData.anfitrionas_nombres}
          creatorName={servicio.creator_name}
          isTemporaryActive={isTemporaryActive}
        />

        <ServicioCardFinancial
          isTemporaryActive={isTemporaryActive}
          isEditing={isEditing}
          editPrecio={editPrecio}
          setEditPrecio={setEditPrecio}
          isSaving={isSaving}
          finalDisplayData={finalDisplayData}
        />

        <ServicioCardSummary
          isTemporaryActive={isTemporaryActive}
          finalDisplayData={finalDisplayData}
          fechaCreacion={servicio.fecha_crea || ''}
        />

        <ServicioCardActions
          isEditing={isEditing}
          isSaving={isSaving}
          onCancelEdit={() => setIsEditing(false)}
          onSaveEdit={handleSaveEdit}
          canStop={canStop}
          onStopTimer={handleStopTimer}
        />
      </div>

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
            <div className='p-6 border-b text-center flex-shrink-0'>
              <Clock className='w-12 h-12 text-red-500 mx-auto mb-2' />
              <h3 className='text-lg font-semibold text-gray-900 dark:text-gray-100'>
                ¿Finalizar sesión?
              </h3>
            </div>
            <div className='p-6 flex-1 overflow-y-auto text-center'>
              <p className='text-sm text-gray-600 dark:text-gray-300'>
                Se liberará la habitación y se guardará el registro.
              </p>
            </div>
            <div className='p-6 border-t flex-shrink-0'>
              <div className='flex gap-3'>
                <button
                  className='flex-1 rounded-md border px-4 py-2 text-sm'
                  onClick={() => setShowConfirm(false)}
                  disabled={stopping}
                >
                  Cancelar
                </button>
                <button
                  className='flex-1 rounded-md bg-red-600 px-4 py-2 text-sm text-white'
                  onClick={confirmStopTimer}
                  disabled={stopping}
                >
                  Finalizar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}
