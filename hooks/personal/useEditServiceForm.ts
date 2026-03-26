import { useState, useEffect, useCallback } from 'react';
import { ServicioWithDetails } from '@/types/servicio';
import { toast } from 'sonner';
import { useTimer } from '@/contexts/TimerContext';
import { useAnfitrionas } from '@/hooks/personal/useAnfitrionas';
import { useHabitaciones } from '@/hooks/habitaciones/useHabitaciones';
import { useNumberFormatter } from '@/hooks/shared/useNumberFormatter';
import { useServicePricing } from '@/hooks/shared/useServicePricing';

interface UseEditServiceFormProps {
  open: boolean;
  servicio: ServicioWithDetails | null;
  onOpenChange: (open: boolean) => void;
  onUpdate?: () => void;
  onPauseMainTimer?: () => void;
  onResumeMainTimer?: () => void;
  onTemporaryTimerComplete?: (nuevasAnfitrionas: string) => void;
}

export function useEditServiceForm({
  open,
  servicio,
  onOpenChange,
  onUpdate,
  onPauseMainTimer,
  onResumeMainTimer,
  onTemporaryTimerComplete
}: UseEditServiceFormProps) {
  const { startTemporaryTimer: startGlobalTemporaryTimer, pauseTimerByServicioId, resumeTimerByServicioId, getTemporaryTimerByServicioId } = useTimer();
  const { anfitrionas, loading: loadingAnfitrionas } = useAnfitrionas();
  const { habitaciones } = useHabitaciones();

  const [formData, setFormData] = useState({
    precio_servicio: 0,
    precio_habitacion: 0,
    metodo_pago: 'efectivo',
    tiempo: 0,
    usuarios: [] as string[]
  });
  const [isSaving, setIsSaving] = useState(false);
  const [numAnfitrionas, setNumAnfitrionas] = useState(1);
  const [anfitrionasDisponibles, setAnfitrionasDisponibles] = useState<any[]>([]);
  const [anfitrionasDelServicio, setAnfitrionasDelServicio] = useState<string[]>([]);
  const [precioHabitacionSinComision, setPrecioHabitacionSinComision] = useState<number>(0);
  const precioServicioFormatter = useNumberFormatter(formData.precio_servicio);
  const precioHabitacionFormatter = useNumberFormatter(formData.precio_habitacion);

  const obtenerPrecioHabitacionSinComision = useCallback(() => {
    const habitacionSinComision = habitaciones.find(h =>
      !h.comision_anfitriona || h.comision_anfitriona === 0
    );

    if (habitacionSinComision) {
      const precio = habitacionSinComision.precio || habitacionSinComision.price || 0;
      setPrecioHabitacionSinComision(precio);
      return precio;
    } else {
      setPrecioHabitacionSinComision(0);
      return 0;
    }
  }, [habitaciones]);

  const fetchAnfitrionasParaEdicion = useCallback(async (servicioId: number) => {
    try {
      const disponiblesResponse = await fetch('/api/anfitrionas/disponibles');
      const disponiblesData = await disponiblesResponse.json();

      const servicioResponse = await fetch(`/api/servicios/${servicioId}`);
      const servicioData = await servicioResponse.json();

      let anfitrionasDelServicioArr: any[] = [];
      let idsDelServicio: string[] = [];

      if (servicioData.success && servicioData.data.usuarios) {
        anfitrionasDelServicioArr = servicioData.data.usuarios;
        idsDelServicio = anfitrionasDelServicioArr.map((user: any) => user.id_usuario.toString());
      }

      let todasLasAnfitrionas = [...(disponiblesData.data || [])];
      anfitrionasDelServicioArr.forEach(anfitriona => {
        const yaExiste = todasLasAnfitrionas.some(a =>
          (a.id_usuario || a.id) === anfitriona.id_usuario
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
      console.error('Error fetching anfitrionas for edition:', error);
      setAnfitrionasDisponibles(anfitrionas);
      return [];
    }
  }, [anfitrionas]);

  useEffect(() => {
    if (habitaciones.length > 0 && open) {
      const precio = obtenerPrecioHabitacionSinComision();
      if (precio > 0) {
        setFormData(prev => ({ ...prev, precio_habitacion: precio }));
        precioHabitacionFormatter.setFormattedValue(
          precioHabitacionFormatter.formatNumber(precio)
        );
      }
    }
  }, [habitaciones, open, obtenerPrecioHabitacionSinComision, precioHabitacionFormatter]);

  useEffect(() => {
    if (servicio && open) {
      const totalAnfitrionas = servicio.total_usuarios || 1;
      setNumAnfitrionas(totalAnfitrionas);
      const precioSinComision = obtenerPrecioHabitacionSinComision();

      setFormData({
        precio_servicio: 0,
        precio_habitacion: precioSinComision,
        metodo_pago: servicio.metodo_pago || 'efectivo',
        tiempo: servicio.tiempo || 0,
        usuarios: []
      });

      precioServicioFormatter.setFormattedValue('');
      precioHabitacionFormatter.setFormattedValue(
        precioSinComision > 0 ? precioHabitacionFormatter.formatNumber(precioSinComision) : ''
      );

      if (servicio.id_servicio) {
        fetchAnfitrionasParaEdicion(Number(servicio.id_servicio)).then(usuarios => {
          setFormData(prev => ({ ...prev, usuarios }));
        });
      }

      if (onPauseMainTimer) {
        setTimeout(() => {
          onPauseMainTimer();
          if (servicio?.id_servicio) pauseTimerByServicioId(String(servicio.id_servicio));
        }, 0);
      }
    }
  }, [servicio?.id_servicio, open]);

  useEffect(() => {
    if (!open && onResumeMainTimer && servicio?.id_servicio) {
      const servicioId = servicio.id_servicio;
      const timeoutId = setTimeout(() => {
        onResumeMainTimer();
        const tempTimer = getTemporaryTimerByServicioId(String(servicioId));
        if (!tempTimer) resumeTimerByServicioId(String(servicioId));
      }, 0);
      return () => clearTimeout(timeoutId);
    }
  }, [open, servicio?.id_servicio]);

  const numAnfitrionasSeleccionadas = formData.usuarios.length || 1;

  const pricing = useServicePricing({
    precioServicio: formData.precio_servicio,
    precioHabitacion: formData.precio_habitacion,
    metodoPago: formData.metodo_pago,
    tiempo: formData.tiempo,
    numAnfitrionas: numAnfitrionasSeleccionadas
  });

  const { iva, subTotal, total, precioServicioTotal, precioHabitacionTotal, multiplicadorTiempo } = pricing;

  const handlePrecioServicioChange = useCallback((value: string) => {
    precioServicioFormatter.handleChange(value, (numValue) => {
      setFormData(prev => ({ ...prev, precio_servicio: numValue }));
    });
  }, [precioServicioFormatter]);

  const handleMetodoPagoChange = useCallback((value: string) => {
    setFormData(prev => ({ ...prev, metodo_pago: value }));
  }, []);

  const handleTiempoChange = useCallback((value: string) => {
    setFormData(prev => ({ ...prev, tiempo: Number(value) }));
  }, []);

  const handleUsuariosChange = useCallback((usuarios: string[]) => {
    setFormData(prev => ({ ...prev, usuarios }));
  }, []);

  const handleClose = useCallback(() => {
    onOpenChange(false);
  }, [onOpenChange]);

  const handleSave = useCallback(async () => {
    if (!servicio) return;
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
      if (formData.tiempo > 0 && servicio.habitacion_numero) {
        const servicioTemporalResponse = await fetch('/api/servicios/temporal', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            servicio_original_id: servicio.id_servicio,
            cliente_id: servicio.cliente_id || null,
            habitacion_id: servicio.habitacion_id,
            precio_habitacion: formData.precio_habitacion,
            precio_servicio: formData.precio_servicio,
            iva, sub_total: subTotal, total,
            tiempo: formData.tiempo,
            metodo_pago: formData.metodo_pago,
            usuarios: formData.usuarios,
            clientes: servicio.cliente_id ? [servicio.cliente_id] : [],
            es_temporal: true
          })
        });

        const servicioTemporalResult = await servicioTemporalResponse.json();
        if (!servicioTemporalResult.success) {
          toast.error(servicioTemporalResult.message || 'Error al crear servicio temporal');
          return;
        }

        const datosTemporales = {
          precio_servicio: precioServicioTotal,
          precio_habitacion: precioHabitacionTotal,
          metodo_pago: formData.metodo_pago,
          iva, sub_total: subTotal, total,
          anfitrionas_nombres: formData.usuarios.map(id => {
            const anfitriona = anfitrionasDisponibles.find(a => (a.id_usuario || a.id).toString() === id);
            return anfitriona ? (anfitriona.nick || anfitriona.nombre || anfitriona.name) : 'Desconocida';
          }).join(', '),
          total_usuarios: formData.usuarios.length,
          servicio_temporal_id: servicioTemporalResult.data.id_servicio,
          servicio_original_id: servicio.id_servicio
        };

        startGlobalTemporaryTimer(
          String(servicio.id_servicio!),
          String(servicio.habitacion_id),
          servicio.habitacion_numero || '?',
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
              if (onTemporaryTimerComplete) onTemporaryTimerComplete(datosTemporales.anfitrionas_nombres);
              toast.success('Servicio temporal finalizado - Nuevo servicio completado');
              if (onUpdate) onUpdate();
            } catch (error) {
              console.error('Error finalizando servicio temporal:', error);
              toast.error('Error al finalizar servicio temporal');
            }
          },
          datosTemporales,
          datosTemporales.anfitrionas_nombres
        );

        toast.success(`Nuevo servicio creado - Timer de ${formData.tiempo} minutos iniciado`);
        handleClose();
        if (onUpdate) onUpdate();
      }
    } catch (error) {
      console.error('Error in handleSave:', error);
      toast.error('Error general al procesar la solicitud');
    } finally {
      setIsSaving(false);
    }
  }, [servicio, formData, iva, subTotal, total, handleClose, onUpdate, precioServicioTotal, precioHabitacionTotal, startGlobalTemporaryTimer, anfitrionasDisponibles]);

  return {
    formData,
    isSaving,
    anfitrionasDisponibles,
    anfitrionasDelServicio,
    loadingAnfitrionas,
    precioServicioDisplay: precioServicioFormatter.formattedValue,
    precioHabitacionDisplay: precioHabitacionFormatter.formattedValue,
    precioHabitacionSinComision,
    numAnfitrionasSeleccionadas,
    pricing,
    handlePrecioServicioChange,
    handleMetodoPagoChange,
    handleTiempoChange,
    handleUsuariosChange,
    handleClose,
    handleSave,
    numAnfitrionasOriginal: numAnfitrionas
  };
}
