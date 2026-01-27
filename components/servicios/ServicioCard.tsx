'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Clock, Users, DollarSign, Home, User, Square, CreditCard, Edit2, Save, X } from 'lucide-react';
import { ServicioWithDetails } from '@/types/servicio';
import { formatCurrencyNoDecimals } from '@/lib/formatters';
import { useTimer } from '@/contexts/TimerContext';
import { toast } from 'sonner';

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
  const { getTimerByServicioId, stopTimerByServicioId, formatTime, updateTimerByServicioId } = useTimer();
  const timer = getTimerByServicioId(servicio.id_servicio!);
  const [showConfirm, setShowConfirm] = useState(false);
  const [stopping, setStopping] = useState(false);

  // Estados para edición
  const [isEditing, setIsEditing] = useState(false);
  const [editPrecio, setEditPrecio] = useState(servicio.precio_servicio || 0);
  const [editTiempo, setEditTiempo] = useState(servicio.tiempo || 0);
  const [isSaving, setIsSaving] = useState(false);

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
      if (timer && timer.isActive) {
        const now = new Date();
        const startTime = new Date(timer.startTime);
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

        // Si el tiempo cambió y hay un timer activo, actualizarlo con el nuevo tiempo TOTAL
        if (totalDurationToSave !== servicio.tiempo) {
          updateTimerByServicioId(servicio.id_servicio!, totalDurationToSave);
        }

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
    if (timer && timer.isActive) {
      setEditTiempo(Math.ceil(timer.remainingTime / 60));
    } else {
      setEditTiempo(servicio.tiempo || 0);
    }
    setIsEditing(true);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const day = date.getDate();
    const month = date.toLocaleDateString('es-ES', { month: 'long' });
    const year = date.getFullYear();
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${day}/${month}/${year} ${hours}:${minutes}`;
  };

  const getEstadoBadge = (estado: number) => {
    // Asegurar que estado sea un número
    const estadoNum = Number(estado);

    switch (estadoNum) {
      case 0:
        return (
          <Badge className='bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300 text-xs sm:text-sm'>
            Terminado
          </Badge>
        );
      case 1:
        return (
          <Badge className='bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 text-xs sm:text-sm'>
            En Proceso
          </Badge>
        );
      case 2:
        return (
          <Badge className='bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300 text-xs sm:text-sm'>
            Pendiente Anulación
          </Badge>
        );
      case 3:
        return (
          <Badge className='bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300 text-xs sm:text-sm'>
            Anulado
          </Badge>
        );
      default:
        return (
          <Badge className='bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300 text-xs sm:text-sm'>
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
        body: JSON.stringify({ estado: 0 })
      });

      if (response.ok) {
        if (onStopTimer) onStopTimer(servicio.id_servicio!);
        stopTimerByServicioId(servicio.id_servicio!);
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

  return (
    <Card className='group w-full bg-white dark:bg-neutral-900 border-none shadow-sm hover:shadow-xl transition-all duration-300 rounded-[1.5rem] overflow-hidden'>
      {/* Indicador de estado lateral */}
      <div className="flex flex-col md:flex-row h-full">
        {/* Lado Izquierdo: Habitación y Tiempo */}
        <div className={`w-full md:w-[40%] p-5 sm:p-6 flex flex-col justify-between border-b md:border-b-0 md:border-r border-neutral-100 dark:border-neutral-800 transition-colors duration-500 ${timer && timer.isActive && timer.remainingTime <= 300
            ? 'bg-red-50/50 dark:bg-red-900/10'
            : 'bg-neutral-50/30'
          }`}>
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="bg-black dark:bg-white p-2 rounded-xl">
                  <Home className="w-4 h-4 text-white dark:text-black" />
                </div>
                <span className="text-xl font-black tracking-tighter dark:text-white">
                  HAB. {servicio.habitacion_numero}
                </span>
              </div>
              <span className="text-[10px] font-bold text-neutral-400 font-mono tracking-widest px-2 py-1 bg-neutral-100 dark:bg-neutral-800 rounded-lg">
                #{servicio.codigo}
              </span>
            </div>

            <div className="flex flex-col items-center justify-center py-4">
              <div className="flex items-center gap-2 mb-1">
                <Clock className={`w-3.5 h-3.5 ${timer && timer.isActive && timer.remainingTime <= 300 ? 'text-red-500 animate-pulse' : 'text-neutral-400'}`} />
                <span className="text-[10px] font-black uppercase tracking-widest text-neutral-400">
                  {isEditing ? 'EDITANDO' : 'TIEMPO RESTANTE'}
                </span>
              </div>

              {isEditing ? (
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    value={editTiempo}
                    onChange={(e) => setEditTiempo(Number(e.target.value))}
                    className="h-10 w-20 text-center font-mono text-xl font-bold bg-white dark:bg-black rounded-xl"
                    min={1}
                    disabled={isSaving}
                  />
                  <span className="text-xs font-bold text-neutral-500">MIN</span>
                </div>
              ) : (
                <div className={`text-4xl sm:text-5xl font-mono font-black tracking-tighter tabular-nums ${timer && timer.isActive && timer.remainingTime <= 300 ? 'text-red-600' : 'text-neutral-800 dark:text-white'
                  }`}>
                  {showAllServices ? `${servicio.tiempo}:00` : timer ? formatTime(timer.remainingTime) : '00:00'}
                </div>
              )}
            </div>
          </div>

          <div className="mt-2 text-center">
            {timer && timer.isActive && !showAllServices && !isEditing && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleStopTimer}
                className="w-full rounded-xl text-[10px] font-black uppercase tracking-widest border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 transition-all"
              >
                DETENER SESIÓN
              </Button>
            )}
            {isEditing && (
              <div className="flex gap-2">
                <Button size="sm" className="flex-1 bg-green-600 hover:bg-green-700 rounded-xl" onClick={handleSaveEdit} disabled={isSaving}>
                  <Save className="w-3.5 h-3.5 mr-1" /> Guardar
                </Button>
                <Button size="sm" variant="ghost" className="flex-1 rounded-xl text-neutral-400" onClick={() => setIsEditing(false)} disabled={isSaving}>
                  <X className="w-3.5 h-3.5" />
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Lado Derecho: Detalles y Precios */}
        <div className="flex-1 p-5 sm:p-6 flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <div className="space-y-3 flex-1">
              <div className="flex items-center gap-2">
                {getEstadoBadge(servicio.estado ?? 1)}
                {servicio.precio_servicio === 0 && !isEditing && (
                  <button onClick={handleStartEdit} className="p-1.5 rounded-lg bg-neutral-100 dark:bg-neutral-800 text-neutral-400 hover:text-black transition-colors">
                    <Edit2 className="w-3 h-3" />
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center">
                    <User className="w-3.5 h-3.5 text-blue-500" />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-[9px] font-bold text-neutral-400 uppercase leading-none">Cliente</span>
                    <span className="text-xs font-bold truncate dark:text-neutral-200">{servicio.cliente_nombre || 'S/R'}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-purple-50 dark:bg-purple-900/20 flex items-center justify-center">
                    <Users className="w-3.5 h-3.5 text-purple-500" />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-[9px] font-bold text-neutral-400 uppercase leading-none">Anfitrionas</span>
                    <span className="text-xs font-bold truncate dark:text-neutral-200">{servicio.anfitrionas_nombres || 'S/A'}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-col items-end pl-4">
              <span className="text-[9px] font-black text-neutral-400 uppercase tracking-widest mb-1">Total a cobrar</span>
              <div className="text-2xl font-black tracking-tighter text-black dark:text-white">
                {formatCurrencyNoDecimals(servicio.total)}
              </div>
              <div className="flex items-center gap-1.5 mt-1 bg-neutral-100 dark:bg-neutral-800 px-2 py-0.5 rounded-full">
                <CreditCard className="w-3 h-3 text-neutral-500" />
                <span className="text-[10px] font-bold text-neutral-500 capitalize">{servicio.metodo_pago || 'efectivo'}</span>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between">
            <div className="flex gap-4">
              <div className="flex flex-col">
                <span className="text-[8px] font-black text-neutral-400 uppercase">Servicio</span>
                {isEditing ? (
                  <input
                    type="number"
                    value={editPrecio}
                    onChange={(e) => setEditPrecio(Number(e.target.value))}
                    className="w-16 h-5 text-[10px] font-bold bg-neutral-50 dark:bg-neutral-800 border-none p-0 outline-none"
                    disabled={isSaving}
                  />
                ) : (
                  <span className="text-[11px] font-bold dark:text-neutral-300">{formatCurrencyNoDecimals(servicio.precio_servicio)}</span>
                )}
              </div>
              <div className="flex flex-col">
                <span className="text-[8px] font-black text-neutral-400 uppercase">Habitación</span>
                <span className="text-[11px] font-bold dark:text-neutral-300">{formatCurrencyNoDecimals(servicio.precio_habitacion)}</span>
              </div>
              {servicio.iva > 0 && (
                <div className="flex flex-col">
                  <span className="text-[8px] font-black text-neutral-400 uppercase">IVA</span>
                  <span className="text-[11px] font-bold text-purple-600 dark:text-purple-400">{formatCurrencyNoDecimals(servicio.iva)}</span>
                </div>
              )}
            </div>
            <span className="text-[9px] text-neutral-400 italic font-medium">
              {formatDate(servicio.fecha_crea || '')}
            </span>
          </div>
        </div>
      </div>

      {showConfirm && (
        <div className='fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-in fade-in duration-200'>
          <div className='bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl p-6 max-w-xs w-full text-center'>
            <div className="w-12 h-12 bg-red-50 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Clock className="text-red-600 w-6 h-6" />
            </div>
            <h3 className="font-bold text-lg mb-2 dark:text-white">¿Finalizar sesión?</h3>
            <p className="text-sm text-neutral-500 mb-6 italic">Se liberará la habitación y se guardará el registro.</p>
            <div className="flex gap-2">
              <Button variant="ghost" className="flex-1 rounded-xl" onClick={() => setShowConfirm(false)}>No</Button>
              <Button className="flex-1 bg-red-600 hover:bg-red-700 rounded-xl" onClick={confirmStopTimer}>Sí, ahora</Button>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
};
