'use client';

import { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ServicioWithDetails } from '@/types/servicio';
import { formatCurrencyNoDecimals } from '@/lib/formatters';
import { Clock } from 'lucide-react';
import { toast } from 'sonner';
import { useTimer } from '@/contexts/TimerContext';
import HostessSelect from '@/components/ui/HostessSelect';
import { useAnfitrionas } from '@/hooks/useAnfitrionas';
import { useHabitaciones } from '@/hooks/useHabitaciones';

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
  const [displayValues, setDisplayValues] = useState({
    precio_servicio: '',
    precio_habitacion: ''
  });
  const [anfitrionasDisponibles, setAnfitrionasDisponibles] = useState<any[]>([]);
  const [anfitrionasDelServicio, setAnfitrionasDelServicio] = useState<string[]>([]);
  const [precioHabitacionSinComision, setPrecioHabitacionSinComision] = useState<number>(0);

  const formatNumberWithDots = useCallback((value: number | string) => {
    if (!value || value === 0) return '';
    const numValue = typeof value === 'string' ? parseInt(value.replace(/[^\d]/g, ''), 10) : value;
    if (isNaN(numValue) || numValue === 0) return '';
    return numValue.toLocaleString('es-CL');
  }, []);

  const parseNumberFromDots = useCallback((value: string) => {
    if (!value || value.trim() === '') return 0;

    const cleanValue = value.replace(/[^\d]/g, '');
    if (cleanValue === '') return 0;
    const numValue = parseInt(cleanValue, 10);
    return isNaN(numValue) ? 0 : numValue;
  }, []);

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
        setDisplayValues(prev => ({
          ...prev,
          precio_habitacion: formatNumberWithDots(precio)
        }));
        console.log('Precio de habitación actualizado:', precio);
      }
    }
  }, [habitaciones, open, obtenerPrecioHabitacionSinComision, formatNumberWithDots]);


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


      setDisplayValues({
        precio_servicio: '',
        precio_habitacion: precioSinComision > 0 ? formatNumberWithDots(precioSinComision) : ''
      });


      if (servicio.id_servicio) {
        fetchAnfitrionasParaEdicion(servicio.id_servicio).then(usuarios => {
          setFormData(prev => ({ ...prev, usuarios }));
        });
      }


      if (onPauseMainTimer) {
        setTimeout(() => {
          onPauseMainTimer();

          if (servicio?.id_servicio) {
            pauseTimerByServicioId(servicio.id_servicio);
          }
          console.log('Modal: Pausando timer principal para servicio:', servicio?.id_servicio);
        }, 0);
      }
    }
  }, [servicio?.id_servicio, open, fetchAnfitrionasParaEdicion, obtenerPrecioHabitacionSinComision, formatNumberWithDots]); // Actualizado las dependencias

  useEffect(() => {
    if (!open && onResumeMainTimer && servicio?.id_servicio) {
      const servicioId = servicio.id_servicio;

      const timeoutId = setTimeout(() => {
        onResumeMainTimer();
        const tempTimer = getTemporaryTimerByServicioId(servicioId);
        if (!tempTimer) {
          resumeTimerByServicioId(servicioId);
        }
      }, 0);

      return () => clearTimeout(timeoutId);
    }
  }, [open, servicio?.id_servicio]);


  const calculateIVA = useCallback((precioServicio: number, metodoPago: string, numAnfitrionas: number, precioHabitacion: number) => {
    if (metodoPago === 'tarjeta') {
      const nuevoSubTotal = precioServicio * numAnfitrionas;
      const precioHabitacionTotal = precioHabitacion * numAnfitrionas;


      let nuevoIVA = Math.floor(nuevoSubTotal * 0.20);

      let nuevoTotal = nuevoSubTotal + precioHabitacionTotal + nuevoIVA;


      const totalRedondeado = Math.ceil(nuevoTotal / 5000) * 5000;
      const excedente = totalRedondeado - nuevoTotal;

      nuevoIVA = nuevoIVA + excedente;

      return nuevoIVA;
    }
    return 0;
  }, []);

  // Calcular totales
  const numAnfitrionasSeleccionadas = formData.usuarios.length || 1;
  const multiplicadorTiempo = formData.tiempo === 60 ? 2 : 1;

  const precioServicioTotal = (formData.precio_servicio * numAnfitrionasSeleccionadas) * multiplicadorTiempo;
  const precioHabitacionTotal = (formData.precio_habitacion * numAnfitrionasSeleccionadas) * multiplicadorTiempo;
  const iva = calculateIVA(formData.precio_servicio * multiplicadorTiempo, formData.metodo_pago, numAnfitrionasSeleccionadas, formData.precio_habitacion * multiplicadorTiempo);
  const subTotal = precioServicioTotal;

  // Calcular total final (replicando lógica de creación)
  let total = subTotal + precioHabitacionTotal + iva;
  if (formData.metodo_pago === 'tarjeta') {
    // El total ya está redondeado por la función calculateIVA
    total = Math.ceil((subTotal + precioHabitacionTotal + Math.floor(subTotal * 0.20)) / 5000) * 5000;
  }

  const handleInputChange = useCallback((field: string, value: string | number) => {
    if (field === 'precio_servicio' || field === 'precio_habitacion') {
      // Para campos de precio, manejar el formateo
      const stringValue = String(value);
      const numericValue = parseNumberFromDots(stringValue);
      const formattedValue = formatNumberWithDots(numericValue);

      setFormData(prev => ({
        ...prev,
        [field]: numericValue
      }));

      setDisplayValues(prev => ({
        ...prev,
        [field]: formattedValue
      }));
    } else {
      // Para otros campos, comportamiento normal
      setFormData(prev => ({
        ...prev,
        [field]: typeof value === 'string' ? (field === 'metodo_pago' ? value : (value === '' ? 0 : Number(value))) : value
      }));
    }
  }, [parseNumberFromDots, formatNumberWithDots]);

  const handleInputFocus = useCallback((_field: 'precio_servicio' | 'precio_habitacion') => {
    // No necesitamos hacer nada especial en el focus
  }, []);

  const handleInputBlur = useCallback((field: 'precio_servicio' | 'precio_habitacion') => {
    // Si el campo está vacío al perder el focus, limpiar tanto el valor como el display
    const value = formData[field];
    if (value === null || value === undefined || String(value) === '' || isNaN(Number(value)) || value === 0) {
      setFormData(prev => ({ ...prev, [field]: 0 }));
      setDisplayValues(prev => ({ ...prev, [field]: '' }));
    }
  }, [formData]);

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
          servicio.id_servicio!,
          servicio.habitacion_id,
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
        // NO llamar a onUpdate() inmediatamente para evitar que se recargue la lista
        // y aparezca el servicio temporal como un nuevo card
        // El timer temporal manejará la actualización cuando termine
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
            {/* Selector de Anfitrionas */}
            <div className="space-y-2">
              <Label>Anfitrionas</Label>
              <HostessSelect
                anfitrionas={anfitrionasDisponibles}
                value={formData.usuarios}
                onChange={(usuarios) => setFormData(prev => ({ ...prev, usuarios }))}
                placeholder="Seleccione anfitrionas"
                maxSelection={10}
                disabled={isSaving || loadingAnfitrionas}
              />
              {formData.usuarios.length > 0 && (
                <p className="text-xs text-gray-500">
                  {formData.usuarios.length} anfitriona{formData.usuarios.length > 1 ? 's' : ''} seleccionada{formData.usuarios.length > 1 ? 's' : ''}
                </p>
              )}
              {anfitrionasDelServicio.length > 0 && (
                <p className="text-xs text-blue-600">
                  Anfitrionas actuales del servicio están incluidas en la lista
                </p>
              )}
            </div>

            {/* Precio del Servicio */}
            <div className="space-y-2">
              <Label htmlFor="precio_servicio">
                Precio del Servicio {numAnfitrionasSeleccionadas > 1 ? `(por anfitriona)` : ''}
              </Label>
              <Input
                id="precio_servicio"
                type="text"
                value={displayValues.precio_servicio}
                onChange={(e) => handleInputChange('precio_servicio', e.target.value)}
                onFocus={() => handleInputFocus('precio_servicio')}
                onBlur={() => handleInputBlur('precio_servicio')}
                placeholder="Ingrese el precio del servicio"
                disabled={isSaving}
              />
              {numAnfitrionasSeleccionadas > 1 && formData.precio_servicio > 0 && (
                <p className="text-xs text-gray-500">
                  Total: {formatCurrencyNoDecimals(precioServicioTotal)} ({numAnfitrionasSeleccionadas} × {formatCurrencyNoDecimals(formData.precio_servicio)}{multiplicadorTiempo > 1 ? ` × ${multiplicadorTiempo}` : ''})
                </p>
              )}
              {multiplicadorTiempo > 1 && (
                <p className="text-xs text-orange-600">
                  Precio duplicado por seleccionar 60 minutos
                </p>
              )}
            </div>

            {/* Precio de la Habitación */}
            <div className="space-y-2">
              <Label htmlFor="precio_habitacion">
                Precio de la Habitación {numAnfitrionasSeleccionadas > 1 ? `(por anfitriona)` : ''}
              </Label>
              <Input
                id="precio_habitacion"
                type="text"
                value={displayValues.precio_habitacion}
                onChange={(e) => handleInputChange('precio_habitacion', e.target.value)}
                onFocus={() => handleInputFocus('precio_habitacion')}
                onBlur={() => handleInputBlur('precio_habitacion')}
                placeholder="Precio tomado de habitación sin comisión"
                disabled={true}
                className="bg-gray-100 cursor-not-allowed"
              />
              {precioHabitacionSinComision > 0 && (
                <p className="text-xs text-blue-600">
                  Precio automático de habitación sin comisión: {formatCurrencyNoDecimals(precioHabitacionSinComision)}
                </p>
              )}
              {numAnfitrionasSeleccionadas > 1 && formData.precio_habitacion > 0 && (
                <p className="text-xs text-gray-500">
                  Total: {formatCurrencyNoDecimals(precioHabitacionTotal)} ({numAnfitrionasSeleccionadas} × {formatCurrencyNoDecimals(formData.precio_habitacion)}{multiplicadorTiempo > 1 ? ` × ${multiplicadorTiempo}` : ''})
                </p>
              )}
              {multiplicadorTiempo > 1 && formData.precio_habitacion > 0 && (
                <p className="text-xs text-orange-600">
                  Precio duplicado por seleccionar 60 minutos
                </p>
              )}
            </div>

            {/* Método de Pago */}
            <div className="space-y-2">
              <Label htmlFor="metodo_pago">Método de Pago</Label>
              <Select
                value={formData.metodo_pago}
                onValueChange={(value) => handleInputChange('metodo_pago', value)}
                disabled={isSaving}
              >
                <SelectTrigger className="rounded-full">
                  <SelectValue placeholder="Seleccione método de pago" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="efectivo">Efectivo</SelectItem>
                  <SelectItem value="tarjeta">Tarjeta (+ 20% IVA)</SelectItem>
                  <SelectItem value="transferencia">Transferencia</SelectItem>
                </SelectContent>
              </Select>
              {formData.metodo_pago === 'tarjeta' && (
                <div className="space-y-1">
                  <p className="text-xs text-purple-600">
                    Se aplicará automáticamente 20% de IVA sobre el precio total del servicio ({formatCurrencyNoDecimals(precioServicioTotal)})
                  </p>
                  {iva > 0 && (
                    <p className="text-xs text-gray-500">
                      Total IVA ajustado: {formatCurrencyNoDecimals(iva)}
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Tiempo */}
            <div className="space-y-2">
              <Label htmlFor="tiempo">Tiempo Adicional (minutos)</Label>
              <Select
                value={formData.tiempo.toString()}
                onValueChange={(value) => handleInputChange('tiempo', value)}
                disabled={isSaving}
              >
                <SelectTrigger className="rounded-full">
                  <SelectValue placeholder="Seleccione tiempo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">Seleccione tiempo</SelectItem>
                  <SelectItem value="2">2 minutos</SelectItem>
                  <SelectItem value="10">10 minutos</SelectItem>
                  <SelectItem value="20">20 minutos</SelectItem>
                  <SelectItem value="30">30 minutos</SelectItem>
                  <SelectItem value="60">60 minutos (costos duplicados)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-blue-600">
                Este tiempo creará un nuevo servicio completo en la base de datos. El timer principal se pausará hasta que termine.
              </p>
              {formData.tiempo === 60 && (
                <p className="text-xs text-orange-600 font-medium">
                  Con 60 minutos los costos se duplicarán automáticamente
                </p>
              )}
            </div>

            {/* Resumen de Totales */}
            <div className="bg-gray-50 p-4 rounded-lg space-y-2">
              <div className="flex justify-between text-sm">
                <span>Subtotal:</span>
                <span>{formatCurrencyNoDecimals(subTotal)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Habitación:</span>
                <span>{formatCurrencyNoDecimals(precioHabitacionTotal)}</span>
              </div>
              {iva > 0 && (
                <div className="flex justify-between text-sm text-purple-600">
                  <span>IVA (20%):</span>
                  <span>{formatCurrencyNoDecimals(iva)}</span>
                </div>
              )}
              <div className="flex justify-between font-semibold text-lg border-t pt-2">
                <span>Total:</span>
                <span>{formatCurrencyNoDecimals(total)}</span>
              </div>
              {numAnfitrionasSeleccionadas === 1 && (
                <div className="text-xs text-blue-600 font-medium mt-1">
                  Comisión para anfitriona: {formatCurrencyNoDecimals(precioServicioTotal)}
                </div>
              )}
              {numAnfitrionasSeleccionadas > 1 && (
                <div className="text-xs text-gray-500 border-t pt-2">
                  <p>Desglose por anfitriona:</p>
                  <p>• Servicio: {formatCurrencyNoDecimals(formData.precio_servicio)} × {numAnfitrionasSeleccionadas}{multiplicadorTiempo > 1 ? ` × ${multiplicadorTiempo} (60min)` : ''}</p>
                  <p>• Habitación: {formatCurrencyNoDecimals(formData.precio_habitacion)} × {numAnfitrionasSeleccionadas}{multiplicadorTiempo > 1 ? ` × ${multiplicadorTiempo} (60min)` : ''}</p>
                  {iva > 0 && <p>• IVA: {formatCurrencyNoDecimals(iva)} (20% + ajuste para redondeo a $5.000)</p>}
                  <p className="text-blue-600 font-medium mt-1">Comisión por anfitriona: {formatCurrencyNoDecimals(Math.floor(precioServicioTotal / numAnfitrionasSeleccionadas))}</p>
                </div>
              )}
            </div>
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