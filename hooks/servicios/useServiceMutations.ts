'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { ServicioWithDetails } from '@/types/servicio';
import { toast } from 'sonner';
import { useTimer } from '@/contexts/TimerContext';
import { useAnfitrionas } from '@/hooks/personal';
import logger from '@/lib/utils/logger';

interface UseServiceMutationsProps {
  open: boolean;
  servicio: ServicioWithDetails | null;
  onOpenChange: (open: boolean) => void;
  onUpdate?: () => void;
  onPauseMainTimer?: () => void;
  onResumeMainTimer?: () => void;
  onTemporaryTimerComplete?: (nuevasAnfitrionas: string) => void;
  formData: {
    precio_servicio: number;
    precio_habitacion: number;
    metodo_pago: string;
    tiempo: number;
    usuarios: string[];
  };
  pricing: {
    iva: number;
    subTotal: number;
    total: number;
    precioServicioTotal: number;
    precioHabitacionTotal: number;
    multiplicadorTiempo: number;
  };
}

export interface UseServiceMutationsReturn {
  isSaving: boolean;
  anfitrionasDisponibles: any[];
  anfitrionasDelServicio: string[];
  loadingAnfitrionas: boolean;
  handleSave: () => Promise<void>;
  handleClose: () => void;
  fetchAnfitrionasParaEdicion: (servicioId: string | number) => Promise<string[]>;
}

export function useServiceMutations({
  open,
  servicio,
  onOpenChange,
  onUpdate,
  onPauseMainTimer,
  onResumeMainTimer,
  onTemporaryTimerComplete,
  formData,
  pricing
}: UseServiceMutationsProps): UseServiceMutationsReturn {
  const {
    startTemporaryTimer: startGlobalTemporaryTimer,
    pauseTimerByServicioId,
    resumeTimerByServicioId,
    getTemporaryTimerByServicioId
  } = useTimer();
  const { anfitrionas, loading: loadingAnfitrionas } = useAnfitrionas();
  const temporaryCreatedRef = useRef(false);

  const [isSaving, setIsSaving] = useState(false);
  const [anfitrionasDisponibles, setAnfitrionasDisponibles] = useState<any[]>([]);
  const [anfitrionasDelServicio, setAnfitrionasDelServicio] = useState<string[]>([]);

  const fetchAnfitrionasParaEdicion = useCallback(
    async (servicioId: string | number) => {
      try {
        const disponiblesResponse = await fetch('/api/anfitrionas/disponibles');
        const disponiblesData = await disponiblesResponse.json();

        const servicioResponse = await fetch(`/api/servicios/${servicioId}`);
        const servicioData = await servicioResponse.json();

        let anfitrionasDelServicioArr: any[] = [];
        let idsDelServicio: string[] = [];

        if (servicioData.success && servicioData.data) {
          const usuariosFromApi = Array.isArray(servicioData.data.usuarios)
            ? servicioData.data.usuarios
            : [];

          if (usuariosFromApi.length > 0) {
            anfitrionasDelServicioArr = usuariosFromApi;
            idsDelServicio = usuariosFromApi
              .map((user: any) => String(user.id_usuario ?? user.id ?? '').trim())
              .filter(Boolean);
          } else {
            const rawIds = servicioData.data.anfitrionas_ids;
            if (Array.isArray(rawIds)) {
              idsDelServicio = rawIds.map((id: any) => String(id).trim()).filter(Boolean);
            } else if (typeof rawIds === 'string') {
              idsDelServicio = rawIds
                .split(',')
                .map((id: string) => id.trim())
                .filter(Boolean);
            }
          }
        }

        let todasLasAnfitrionas = [...(disponiblesData.data || [])];
        anfitrionasDelServicioArr.forEach(anfitriona => {
          const yaExiste = todasLasAnfitrionas.some(
            a => (a.id_usuario || a.id) === anfitriona.id_usuario
          );
          if (!yaExiste) {
            todasLasAnfitrionas.push({
              id_usuario: anfitriona.id_usuario,
              id: anfitriona.id_usuario,
              nombre: anfitriona.nombre,
              name: anfitriona.nombre,
              apellido: anfitriona.apellido,
              lastName: anfitriona.apellido,
              nick: anfitriona.nick,
              estado: 1
            });
          }
        });

        setAnfitrionasDisponibles(todasLasAnfitrionas);
        setAnfitrionasDelServicio(idsDelServicio);
        return idsDelServicio;
      } catch (error) {
        logger.captureException(error, { context: 'EditServiceForm:fetchAnfitrionas' });
        setAnfitrionasDisponibles(anfitrionas);
        return [];
      }
    },
    [anfitrionas]
  );

  useEffect(() => {
    if (servicio && open) {
      temporaryCreatedRef.current = false;
      const servicioPrincipalId = String(servicio.id_servicio ?? servicio.id ?? '').trim();

      if (onPauseMainTimer) {
        onPauseMainTimer();
      }
      if (servicioPrincipalId) {
        pauseTimerByServicioId(servicioPrincipalId);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [servicio?.id_servicio, servicio?.id, open]);

  const prevOpenRef = useRef(open);

  useEffect(() => {
    const servicioPrincipalId = String(servicio?.id_servicio ?? servicio?.id ?? '').trim();
    const wasOpen = prevOpenRef.current;
    prevOpenRef.current = open;

    if (wasOpen === true && !open && onResumeMainTimer && servicioPrincipalId) {
      if (temporaryCreatedRef.current) {
        temporaryCreatedRef.current = false;
        return;
      }

      onResumeMainTimer();
      const tempTimer = getTemporaryTimerByServicioId(servicioPrincipalId);
      if (!tempTimer) resumeTimerByServicioId(servicioPrincipalId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const handleClose = useCallback(() => {
    onOpenChange(false);
  }, [onOpenChange]);

  const handleSave = useCallback(async () => {
    if (!servicio) return;
    const servicioPrincipalId = String(servicio.id_servicio ?? servicio.id ?? '').trim();
    if (!servicioPrincipalId) {
      toast.error('No se pudo determinar el servicio principal');
      return;
    }
    if (formData.precio_servicio <= 0) {
      toast.error('El precio del servicio debe ser mayor a 0');
      return;
    }
    if (formData.precio_habitacion < 0) {
      toast.error('El precio de la habitación debe ser mayor o igual a 0');
      return;
    }
    if (formData.tiempo <= 0) {
      toast.error('El tiempo debe ser mayor a 0 minutos');
      return;
    }
    if (formData.usuarios.length === 0) {
      toast.error('Debe seleccionar al menos una anfitriona');
      return;
    }

    setIsSaving(true);
    try {
      if (formData.tiempo > 0 && servicio.habitacion_id) {
        const habitacionLabel =
          servicio.habitacion_numero ||
          (servicio as any).habitacion_nombre ||
          `Habitación ${servicio.habitacion_id}`;

        const servicioTemporalResponse = await fetch('/api/servicios/temporal', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            servicio_original_id: servicioPrincipalId,
            cliente_id: servicio.cliente_id || null,
            habitacion_id: servicio.habitacion_id,
            precio_habitacion: pricing.precioHabitacionTotal,
            precio_servicio: pricing.precioServicioTotal,
            iva: pricing.iva,
            sub_total: pricing.subTotal,
            total: pricing.total,
            tiempo: formData.tiempo,
            metodo_pago: formData.metodo_pago,
            usuarios: formData.usuarios,
            total_usuarios: formData.usuarios.length,
            clientes: servicio.cliente_id ? [servicio.cliente_id] : [],
            es_temporal: true
          })
        });

        const servicioTemporalResult = await servicioTemporalResponse.json();
        if (!servicioTemporalResponse.ok || !servicioTemporalResult.success) {
          toast.error(servicioTemporalResult.message || 'Error al crear servicio temporal');
          return;
        }

        const datosTemporales = {
          precio_servicio: pricing.precioServicioTotal,
          precio_habitacion: pricing.precioHabitacionTotal,
          metodo_pago: formData.metodo_pago,
          iva: pricing.iva,
          sub_total: pricing.subTotal,
          total: pricing.total,
          anfitrionas_nombres: formData.usuarios
            .map(id => {
              const anfitriona = anfitrionasDisponibles.find(
                a => (a.id_usuario || a.id).toString() === id
              );
              return anfitriona
                ? anfitriona.nick || anfitriona.nombre || anfitriona.name
                : 'Desconocida';
            })
            .join(', '),
          total_usuarios: formData.usuarios.length,
          servicio_temporal_id: servicioTemporalResult.data.id_servicio,
          servicio_original_id: servicioPrincipalId
        };

        startGlobalTemporaryTimer(
          servicioPrincipalId,
          String(servicio.habitacion_id),
          habitacionLabel,
          formData.tiempo,
          `${servicio.codigo}-TEMP`,
          servicio.cliente_nombre || 'Sin registrar',
          async () => {
            try {
              await fetch(`/api/servicios/${servicioTemporalResult.data.id_servicio}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ estado: 0 })
              });
              if (onTemporaryTimerComplete)
                onTemporaryTimerComplete(datosTemporales.anfitrionas_nombres);
              toast.success('Servicio temporal finalizado - Nuevo servicio completado');
              if (onUpdate) onUpdate();
            } catch (error) {
              logger.captureException(error, { context: 'EditServiceForm:finalizeTimer' });
              toast.error('Error al finalizar servicio temporal');
            }
          },
          datosTemporales,
          datosTemporales.anfitrionas_nombres
        );

        temporaryCreatedRef.current = true;
        toast.success(`Nuevo servicio creado - Timer de ${formData.tiempo} minutos iniciado`);
        handleClose();
        if (onUpdate) onUpdate();
      } else {
        toast.error('No se pudo determinar la habitación del servicio principal');
      }
    } catch (error) {
      logger.captureException(error, { context: 'EditServiceForm:saveServicio' });
      toast.error('Error general al procesar la solicitud');
    } finally {
      setIsSaving(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    servicio,
    formData,
    pricing,
    handleClose,
    onUpdate,
    startGlobalTemporaryTimer,
    anfitrionasDisponibles
  ]);

  return {
    isSaving,
    anfitrionasDisponibles,
    anfitrionasDelServicio,
    loadingAnfitrionas,
    handleSave,
    handleClose,
    fetchAnfitrionasParaEdicion
  };
}
