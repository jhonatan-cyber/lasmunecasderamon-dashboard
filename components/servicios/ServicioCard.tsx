'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Clock, Users, Home, User, CreditCard, Edit2, Save, X, Square } from 'lucide-react';
import { ServicioWithDetails } from '@/types/servicio';
import { formatCurrencyNoDecimals, formatSoloFecha, formatSoloHora } from '@/lib/formatters';
import { useServiceTimer } from '@/hooks/useServiceTimer';
import { toast } from 'sonner';
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
  // Usar el nuevo hook de timer
  const {
    mainTimer,
    temporaryTimer,
    isTemporaryActive,
    displayTimer,
    pauseMainTimer,
    resumeMainTimer,
    startTemporaryTimer,
    formatTime,
    isPaused
  } = useServiceTimer({
    servicioId: servicio.id_servicio!,
    initialTime: (servicio.tiempo || 0) * 60, // convertir minutos a segundos
    onExpire: () => {
      // Cuando expire el timer principal
      if (onStopTimer) {
        onStopTimer(servicio.id_servicio!);
      }
    },
    autoStart: !showAllServices && servicio.estado === 1 // Solo iniciar si es servicio activo
  });

  const [showConfirm, setShowConfirm] = useState(false);
  const [stopping, setStopping] = useState(false);

  // Estados para edición
  const [isEditing, setIsEditing] = useState(false);
  const [editPrecio, setEditPrecio] = useState(servicio.precio_servicio || 0);
  const [editTiempo, setEditTiempo] = useState(servicio.tiempo || 0);
  const [isSaving, setIsSaving] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);

  // Sincronizar estados locales si el prop servicio cambia
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

      // Si hay un timer activo, calculamos la nueva duración total relativa al inicio
      if (displayTimer && displayTimer.isActive) {
        const now = new Date();
        const startTime = new Date(displayTimer.startTime || new Date());
        const elapsedMinutes = Math.floor((now.getTime() - startTime.getTime()) / 60000);
        // El nuevo tiempo total es lo que ya pasó más lo que el usuario quiere que falte
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
      console.error('Error saving service edit:', error);
      toast.error('Error de conexión al actualizar');
    } finally {
      setIsSaving(false);
    }
  };

  const handleStartEdit = () => {
    // Cuando empezamos a editar, si hay un timer, mostramos los minutos restantes redondeados
    if (displayTimer && displayTimer.isActive) {
      setEditTiempo(Math.ceil(displayTimer.totalSeconds / 60));
    } else {
      setEditTiempo(servicio.tiempo || 0);
    }
    setIsEditing(true);
  };

  const getEstadoBadge = (estado: number) => {
    const estadoNum = Number(estado);
    switch (estadoNum) {
      case 0:
        return <Badge variant="secondary" className="text-xs">Terminado</Badge>;
      case 1:
        return <Badge className="bg-green-100 text-green-800 text-xs">En Proceso</Badge>;
      case 2:
        return <Badge className="bg-yellow-100 text-yellow-800 text-xs">Pendiente</Badge>;
      case 3:
        return <Badge variant="destructive" className="text-xs">Anulado</Badge>;
      default:
        return <Badge variant="secondary" className="text-xs">Desconocido</Badge>;
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
        body: JSON.stringify({ estado: 0 })
      });

      if (response.ok) {
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
      pauseMainTimer();
    }
  }, [servicio.id_servicio, pauseMainTimer]);

  const handleResumeMainTimer = useCallback(() => {
    if (servicio.id_servicio) {
      console.log('ServicioCard: Reanudando timer principal para servicio:', servicio.id_servicio);
      resumeMainTimer();
    }
  }, [servicio.id_servicio, resumeMainTimer]);

  const isLowTime = displayTimer && displayTimer.isActive && displayTimer.totalSeconds <= 300;

  return (
    <Card className={`w-full transition-all duration-200 hover:shadow-md ${isLowTime ? 'border-red-200 bg-red-50/30' : ''}`}>
      <div className="p-4 space-y-4">
        {/* Header Row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Home className="w-4 h-4 text-gray-600" />
              <span className="font-semibold text-md">Habitacion. {servicio.habitacion_numero}</span>
            </div>
            {getEstadoBadge(servicio.estado ?? 1)}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 font-mono">#{servicio.codigo}</span>
            {servicio.precio_servicio === 0 && !isEditing && (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowEditModal(true)}
                  className="h-8 w-8 p-0"
                  title="Editar servicio"
                >
                  <Edit2 className="w-3 h-3" />
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Timer Section */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className={`w-4 h-4 ${isLowTime ? 'text-red-500' : displayTimer?.isPaused ? 'text-orange-500' : isTemporaryActive ? 'text-blue-500' : 'text-gray-500'}`} />
            <span className="text-sm text-gray-600">
              {isEditing ? 'Editando tiempo' :
                isTemporaryActive ? 'Timer temporal' :
                  displayTimer?.isPaused ? 'Pausado (editando)' :
                    'Tiempo restante'}
            </span>
          </div>
          <div className="text-right">
            {isEditing ? (
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  value={editTiempo}
                  onChange={(e) => setEditTiempo(Number(e.target.value))}
                  className="h-8 w-16 text-center text-sm"
                  min={1}
                  disabled={isSaving}
                />
                <span className="text-xs text-gray-500">min</span>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span className={`font-mono text-lg font-semibold ${isLowTime ? 'text-red-600' : displayTimer?.isPaused ? 'text-orange-600' : isTemporaryActive ? 'text-blue-600' : 'text-gray-900'}`}>
                  {showAllServices ? `${servicio.tiempo}:00` : displayTimer ? formatTime(displayTimer.totalSeconds) : '00:00'}
                </span>
                {isTemporaryActive && (
                  <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                    TEMPORAL
                  </span>
                )}
                {displayTimer?.isPaused && !isTemporaryActive && (
                  <span className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded-full">
                    PAUSADO
                  </span>
                )}
                {mainTimer?.isPaused && isTemporaryActive && (
                  <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
                    PRINCIPAL PAUSADO
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Información adicional cuando hay timer temporal */}
        {isTemporaryActive && mainTimer && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs">
            <div className="flex items-center justify-between mb-2">
              <span className="text-blue-700 font-medium">Timer Principal:</span>
              <div className="flex items-center gap-2">
                <span className="text-blue-600 font-mono">{formatTime(mainTimer.totalSeconds)}</span>
                <span className={`px-2 py-1 rounded-full text-xs ${mainTimer.isPaused ? 'bg-orange-100 text-orange-700' : 'bg-green-100 text-green-700'
                  }`}>
                  {mainTimer.isPaused ? '⏸️ PAUSADO' : '▶️ ACTIVO'}
                </span>
              </div>
            </div>
            <div className="text-blue-600 space-y-1">
              <p>• Se reanudará cuando termine el timer temporal</p>
              <p>• Los precios actuales son temporales</p>
              <p>• Al finalizar, volverán a los valores originales</p>
            </div>
          </div>
        )}

        {/* Client and Hostesses */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-blue-500 flex-shrink-0" />
            <div className="min-w-0">
              <span className="text-xs text-gray-500 block">Cliente</span>
              <span className="font-medium truncate block">{servicio.cliente_nombre || 'Sin registrar'}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-purple-500 flex-shrink-0" />
            <div className="min-w-0">
              <span className="text-xs text-gray-500 block">Anfitrionas</span>
              <span className="font-medium truncate block">{servicio.anfitrionas_nombres || 'Sin asignar'}</span>
            </div>
          </div>
        </div>

        {/* Creator Information */}
        {servicio.creator_name && (
          <div className="flex items-center gap-2 text-sm">
            <User className="w-4 h-4 text-green-500 flex-shrink-0" />
            <div className="min-w-0">
              <span className="text-xs text-gray-500 block">Creado por</span>
              <span className="font-medium truncate block">{servicio.creator_name}</span>
            </div>
          </div>
        )}

        {/* Pricing Section */}
        <div className="flex items-center justify-between pt-3 border-t">
          <div className="flex items-center gap-4 text-xs">
            <div>
              <span className="text-gray-500">Servicio: </span>
              {isEditing ? (
                <Input
                  type="number"
                  value={editPrecio}
                  onChange={(e) => setEditPrecio(Number(e.target.value))}
                  className="h-6 w-20 text-xs inline-block ml-1"
                  disabled={isSaving}
                />
              ) : (
                <span className={`font-medium ${isTemporaryActive ? 'text-blue-600' : ''}`}>
                  {formatCurrencyNoDecimals(servicio.precio_servicio)}
                  {isTemporaryActive && <span className="text-blue-500 ml-1">*</span>}
                </span>
              )}
            </div>
            <div>
              <span className="text-gray-500">Habitacion: </span>
              <span className={`font-medium ${isTemporaryActive ? 'text-blue-600' : ''}`}>
                {formatCurrencyNoDecimals(servicio.precio_habitacion)}
                {isTemporaryActive && <span className="text-blue-500 ml-1">*</span>}
              </span>
            </div>
            {servicio.iva > 0 && (
              <div>
                <span className="text-gray-500">IVA: </span>
                <span className={`font-medium text-purple-600 ${isTemporaryActive ? 'text-blue-600' : ''}`}>
                  {formatCurrencyNoDecimals(servicio.iva)}
                  {isTemporaryActive && <span className="text-blue-500 ml-1">*</span>}
                </span>
              </div>
            )}
          </div>
          <div className="text-right">
            <div className={`text-lg font-bold ${isTemporaryActive ? 'text-blue-600' : ''}`}>
              {formatCurrencyNoDecimals(servicio.total)}
              {isTemporaryActive && <span className="text-blue-500 ml-1">*</span>}
            </div>
            <div className="flex items-center gap-1 text-xs text-gray-500">
              <CreditCard className="w-3 h-3" />
              <span className="capitalize">{servicio.metodo_pago || 'efectivo'}</span>
            </div>
          </div>
        </div>

        {/* Nota sobre valores temporales */}
        {isTemporaryActive && (
          <div className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded border-t">
            <span className="font-medium">* Valores temporales</span> - Se restaurarán a los originales cuando termine el timer temporal
          </div>
        )}

        {/* Date and Actions */}
        <div className="flex items-center justify-between pt-2">
          <div className="text-xs text-gray-500">
            <div>{formatSoloFecha(servicio.fecha_crea || '')}</div>
            <div>{formatSoloHora(servicio.fecha_crea || '')}</div>
          </div>
          <div className="flex gap-2">
            {isEditing && (
              <>
                <Button size="sm" variant="ghost" onClick={() => setIsEditing(false)} disabled={isSaving}>
                  <X className="w-3 h-3" />
                </Button>
                <Button size="sm" onClick={handleSaveEdit} disabled={isSaving}>
                  <Save className="w-3 h-3 mr-1" />
                  Guardar
                </Button>
              </>
            )}
            {displayTimer && displayTimer.isActive && !showAllServices && !isEditing && (
              <Button size="sm" variant="outline" onClick={handleStopTimer} className="text-red-600 border-red-200 hover:bg-red-50">
                <Square className="w-3 h-3 mr-1" />
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
        onStartTemporaryTimer={(duration, onComplete) => {
          startTemporaryTimer({
            duration,
            onComplete
          });
        }}
      />

      {showConfirm && (
        <div className='fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4'>
          <div className='bg-white rounded-lg shadow-xl p-6 max-w-sm w-full'>
            <div className="text-center">
              <Clock className="w-12 h-12 text-red-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">¿Finalizar sesión?</h3>
              <p className="text-sm text-gray-600 mb-6">Se liberará la habitación y se guardará el registro.</p>
              <div className="flex gap-3">
                <Button variant="outline" className="flex-1" onClick={() => setShowConfirm(false)}>
                  Cancelar
                </Button>
                <Button className="flex-1 bg-red-600 hover:bg-red-700" onClick={confirmStopTimer} disabled={stopping}>
                  {stopping ? 'Finalizando...' : 'Finalizar'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
};