/* eslint-disable */
'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ServicioWithDetails } from '@/types/servicio';
import { formatCurrencyNoDecimals } from '@/lib/formatters';
import { Clock } from 'lucide-react';
import { toast } from 'sonner';
import { useTimer } from '@/contexts/TimerContext';
import { useAnfitrionas } from '@/hooks/personal/useAnfitrionas';
import { useHabitaciones } from '@/hooks/habitaciones/useHabitaciones';
import { useNumberFormatter } from '@/hooks/shared/useNumberFormatter';
import { useServicePricing } from '@/hooks/shared/useServicePricing';
import { ServiceFormFields } from './ServiceFormFields';
import { ServicePriceSummary } from './ServicePriceSummary';

interface EditServiceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  servicio: ServicioWithDetails | null;
  onUpdate?: () => void;
  onPauseMainTimer?: () => void;
  onResumeMainTimer?: () => void;
  onTemporaryTimerComplete?: (nuevasAnfitrionas: string) => void;
}

export default function EditServiceModal({
  open,
  onOpenChange,
  servicio,
  onUpdate,
  onPauseMainTimer,
  onResumeMainTimer,
  onTemporaryTimerComplete
}: EditServiceModalProps) {
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

  // Hooks de formateo
  const precioServicioFormatter = useNumberFormatter(formData.precio_servicio);
  const precioHabitacionFormatter = useNumberFormatter(formData.precio_habitacion);

  const obtenerPrecioHabitacionSinComision = useCallback(() => {
    console.log('Habitaciones disponibles:', habitaciones.length);
    console.log('Habitaciones:', habitaciones.map(h => ({
      nombre: h.nombre || h.name,
      precio: h.precio || h.price,
      comision: h.comision_anfitriona
    })));


    const habitacionSinComision = habitaciones.find(h =>
      !h.comision_anfitriona || h.comision_anfitriona === 0
    );

    if (habitacionSinComision) {
      const precio = habitacionSinComision.precio || habitacionSinComision.price || 0;
      setPrecioHabitacionSinComision(precio);
      console.log(`✅ Precio de habitación sin comisión encontrado: ${precio} (${habitacionSinComision.nombre || habitacionSinComision.name})`);
      return precio;
    } else {
      console.log('❌ No se encontró habitación sin comisión, usando precio 0');
      setPrecioHabitacionSinComision(0);
      return 0;
    }
  }, [habitaciones]);


  const fetchAnfitrionasParaEdicion = useCallback(async (servicioId: number) => {
    try {

      const disponiblesResponse = await fetch('/api/anfitrionas/disponibles');
      const disponiblesData = await disponiblesResponse.json();

      // Obtener anfitrionas del servicio actual
      const servicioResponse = await fetch(`/api/servicios/${servicioId}`);
      const servicioData = await servicioResponse.json();

      let anfitrionasDelServicio: any[] = [];
      let idsDelServicio: string[] = [];

      if (servicioData.success && servicioData.data.usuarios) {
        anfitrionasDelServicio = servicioData.data.usuarios;
        idsDelServicio = anfitrionasDelServicio.map((user: any) => user.id_usuario.toString());
      }


      let todasLasAnfitrionas = [...(disponiblesData.data || [])];


      anfitrionasDelServicio.forEach(anfitriona => {
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
      setAnfitrionasDisponibles(anfitrionas); // Fallback a las disponibles
      return [];
    }
  }, [anfitrionas]);


  const fetchServiceUsers = useCallback(async (servicioId: number) => {
    try {
      const response = await fetch(`/api/servicios/${servicioId}`);
      const data = await response.json();

      if (data.success && data.data.usuarios) {
        return data.data.usuarios.map((user: any) => user.id_usuario.toString());
      }
      return [];
    } catch (error) {
      console.error('Error fetching service users:', error);
      return [];
    }
  }, []);


  useEffect(() => {
    if (habitaciones.length > 0 && open) {
      const precio = obtenerPrecioHabitacionSinComision();
      if (precio > 0) {
        setFormData(prev => ({ ...prev, precio_habitacion: precio }));
        precioHabitacionFormatter.setFormattedValue(
          precioHabitacionFormatter.formatNumber(precio)
        );
        console.log('Precio de habitación actualizado:', precio);
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

      // Actualizar formatters
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
          if (servicio?.id_servicio) {
            pauseTimerByServicioId(Number(servicio.id_servicio));
          }
          console.log('Modal: Pausando timer principal para servicio:', servicio?.id_servicio);
        }, 0);
      }
    }
  }, [servicio?.id_servicio, open, fetchAnfitrionasParaEdicion, obtenerPrecioHabitacionSinComision, precioHabitacionFormatter, precioServicioFormatter]);

  useEffect(() => {
    if (!open && onResumeMainTimer && servicio?.id_servicio) {
      const servicioId = servicio.id_servicio;

      const timeoutId = setTimeout(() => {
        onResumeMainTimer();
        const tempTimer = getTemporaryTimerByServicioId(Number(servicioId));
        if (!tempTimer) {
          resumeTimerByServicioId(Number(servicioId));
        }
      }, 0);

      return () => clearTimeout(timeoutId);
    }
  }, [open, servicio?.id_servicio]);


  // Calcular totales con hook
  const numAnfitrionasSeleccionadas = formData.usuarios.length || 1;

  const pricing = useServicePricing({
    precioServicio: formData.precio_servicio,
    precioHabitacion: formData.precio_habitacion,
    metodoPago: formData.metodo_pago,
    tiempo: formData.tiempo,
    numAnfitrionas: numAnfitrionasSeleccionadas
  });

  const { precioServicioTotal, precioHabitacionTotal, iva, subTotal, total, multiplicadorTiempo } = pricing;

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

    // Validaciones
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
      // Si se cambió el tiempo, crear un servicio temporal en la base de datos
      if (formData.tiempo > 0 && servicio.habitacion_numero) {
        console.log('⏱️ Creando servicio temporal en la base de datos');

        // Crear el servicio temporal en la base de datos
        const servicioTemporalResponse = await fetch('/api/servicios/temporal', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            servicio_original_id: servicio.id_servicio,
            cliente_id: servicio.cliente_id || null,
            habitacion_id: servicio.habitacion_id,
            precio_habitacion: formData.precio_habitacion,
            precio_servicio: formData.precio_servicio,
            iva: iva,
            sub_total: subTotal,
            total: total,
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

        console.log('✅ Servicio temporal creado:', servicioTemporalResult.data);

        // Preparar los datos temporales para mostrar en el card
        const datosTemporales = {
          precio_servicio: precioServicioTotal,
          precio_habitacion: precioHabitacionTotal,
          metodo_pago: formData.metodo_pago,
          iva: iva,
          sub_total: subTotal,
          total: total,
          anfitrionas_nombres: formData.usuarios.map(id => {
            const anfitriona = anfitrionasDisponibles.find(a =>
              (a.id_usuario || a.id).toString() === id
            );
            return anfitriona ? (anfitriona.nick || anfitriona.nombre || anfitriona.name) : 'Desconocida';
          }).join(', '),
          total_usuarios: formData.usuarios.length,
          servicio_temporal_id: servicioTemporalResult.data.id_servicio, // Guardar ID del servicio temporal
          servicio_original_id: servicio.id_servicio // ID del servicio original para mantener consistencia
        };

        console.log('📊 Datos temporales para mostrar:', datosTemporales);

        // Iniciar timer temporal que mostrará los nuevos datos en el card
        startGlobalTemporaryTimer(
          Number(servicio.id_servicio!),
          Number(servicio.habitacion_id),
          servicio.habitacion_numero || '?',
          formData.tiempo,
          `${servicio.codigo}-TEMP`,
          servicio.cliente_nombre || 'Sin registrar',
          async () => {
            // Callback cuando termine el timer temporal
            try {
              console.log('⏱️ Timer temporal terminado, finalizando servicio temporal en BD');

              // Finalizar el servicio temporal en la base de datos
              await fetch(`/api/servicios/${servicioTemporalResult.data.id_servicio}`, {
                method: 'PATCH',
                headers: {
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({ estado: 0 }) // Finalizar servicio temporal
              });

              console.log('✅ Servicio temporal finalizado en BD');

              // Actualizar las anfitrionas permanentemente en el contexto global
              if (onTemporaryTimerComplete) {
                console.log('🔄 Llamando onTemporaryTimerComplete con:', datosTemporales.anfitrionas_nombres);
                onTemporaryTimerComplete(datosTemporales.anfitrionas_nombres);
              } else {
                console.warn('⚠️ onTemporaryTimerComplete no está definido');
              }

              toast.success('Servicio temporal finalizado - Nuevo servicio completado');
              if (onUpdate) onUpdate(); // Actualizar la vista
            } catch (error) {
              console.error('Error finalizando servicio temporal:', error);
              toast.error('Error al finalizar servicio temporal');
            }
          },
          datosTemporales, // Pasar los datos temporales al timer
          datosTemporales.anfitrionas_nombres // Pasar las anfitrionas al timer
        );

        toast.success(`Nuevo servicio creado - Timer de ${formData.tiempo} minutos iniciado`);
        handleClose();
        if (onUpdate) onUpdate(); // Actualizar la vista para ocultar el anterior y mostrar el nuevo
      } else {
        toast.error('Debe seleccionar un tiempo mayor a 0 para crear el servicio temporal');
      }
    } catch (error) {
      console.error('Error in handleSave:', error);
      toast.error('Error general al procesar la solicitud');
    } finally {
      setIsSaving(false);
    }
  }, [servicio, formData, iva, subTotal, total, handleClose, onUpdate, precioServicioTotal, precioHabitacionTotal, startGlobalTemporaryTimer, anfitrionasDisponibles, anfitrionasDelServicio]);

  if (!servicio) return null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="w-[95vw] max-w-[95vw] sm:w-auto sm:max-w-[600px] max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="flex-shrink-0 px-4 sm:px-6 pt-4 sm:pt-6 pb-4 border-b">
          <DialogTitle className="flex items-center justify-between">
            <span>Crear Nuevo Servicio + Timer</span>
            <div className="flex items-center gap-2 text-sm text-blue-600">
              <Clock className="w-4 h-4" />
              <span>Timer principal pausado</span>
            </div>
          </DialogTitle>
          <p className="text-sm text-gray-600">
            Habitación {servicio.habitacion_numero} - Código #{servicio.codigo}
          </p>
          {numAnfitrionas > 1 && (
            <p className="text-xs text-purple-600 bg-purple-50 px-2 py-1 rounded">
              {numAnfitrionas} anfitrionas - Los precios se multiplicarán automáticamente
            </p>
          )}

        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4">
          <div className="space-y-4">
            <ServiceFormFields
              anfitrionasDisponibles={anfitrionasDisponibles}
              selectedUsuarios={formData.usuarios}
              onUsuariosChange={handleUsuariosChange}
              anfitrionasDelServicio={anfitrionasDelServicio}
              loadingAnfitrionas={loadingAnfitrionas}
              precioServicioDisplay={precioServicioFormatter.formattedValue}
              onPrecioServicioChange={handlePrecioServicioChange}
              onPrecioServicioFocus={() => { }}
              onPrecioServicioBlur={() => { }}
              precioServicioTotal={precioServicioTotal}
              numAnfitrionas={numAnfitrionasSeleccionadas}
              multiplicadorTiempo={multiplicadorTiempo}
              precioHabitacionDisplay={precioHabitacionFormatter.formattedValue}
              precioHabitacionSinComision={precioHabitacionSinComision}
              precioHabitacionTotal={precioHabitacionTotal}
              metodoPago={formData.metodo_pago}
              onMetodoPagoChange={handleMetodoPagoChange}
              precioServicioTotalForIVA={precioServicioTotal}
              iva={iva}
              tiempo={formData.tiempo}
              onTiempoChange={handleTiempoChange}
              isSaving={isSaving}
            />

            <ServicePriceSummary
              subTotal={subTotal}
              precioHabitacionTotal={precioHabitacionTotal}
              iva={iva}
              total={total}
              precioServicioTotal={precioServicioTotal}
              numAnfitrionas={numAnfitrionasSeleccionadas}
              multiplicadorTiempo={multiplicadorTiempo}
              precioServicio={formData.precio_servicio}
              precioHabitacion={formData.precio_habitacion}
            />
          </div>
        </div>

        {/* Footer con botones */}
        <div className="flex-shrink-0 border-t px-4 sm:px-6 py-4">
          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1 rounded-full"
              onClick={handleClose}
              disabled={isSaving}
            >
              Cancelar
            </Button>
            <Button
              className="flex-1 rounded-full"
              onClick={handleSave}
              disabled={isSaving}
            >
              {isSaving ? 'Guardando...' : 'Guardar Cambios'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

