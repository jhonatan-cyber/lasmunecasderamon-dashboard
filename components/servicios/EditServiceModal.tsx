'use client';

import { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ServicioWithDetails } from '@/types/servicio';
import { formatCurrencyNoDecimals } from '@/lib/formatters';
import { Clock } from 'lucide-react';
import { toast } from 'sonner';
import { useTimer } from '@/contexts/TimerContext';

interface EditServiceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  servicio: ServicioWithDetails | null;
  onUpdate?: () => void;
  onPauseMainTimer?: () => void;
  onResumeMainTimer?: () => void;
  onStartTemporaryTimer?: (duration: number, onComplete: () => void) => void;
}

export default function EditServiceModal({
  open,
  onOpenChange,
  servicio,
  onUpdate,
  onPauseMainTimer,
  onResumeMainTimer,
  onStartTemporaryTimer
}: EditServiceModalProps) {
  const { startTemporaryTimer: startGlobalTemporaryTimer, pauseTimerByServicioId, resumeTimerByServicioId, getTemporaryTimerByServicioId } = useTimer();
  const [formData, setFormData] = useState({
    precio_servicio: 0,
    precio_habitacion: 0,
    metodo_pago: 'efectivo',
    tiempo: 0
  });
  const [isSaving, setIsSaving] = useState(false);
  const [numAnfitrionas, setNumAnfitrionas] = useState(1);
  const [displayValues, setDisplayValues] = useState({
    precio_servicio: '',
    precio_habitacion: ''
  });

  // Inicializar formulario cuando se abre el modal
  useEffect(() => {
    if (servicio && open) {
      // Obtener número de anfitrionas
      const totalAnfitrionas = servicio.total_usuarios || 1;
      setNumAnfitrionas(totalAnfitrionas);

      // Inicializar con campos de precio vacíos para que el usuario ingrese nuevos valores
      setFormData({
        precio_servicio: 0, // Empezar en 0 para que aparezca vacío
        precio_habitacion: 0, // Empezar en 0 para que aparezca vacío
        metodo_pago: servicio.metodo_pago || 'efectivo',
        tiempo: servicio.tiempo || 0
      });

      // Inicializar valores de display vacíos
      setDisplayValues({
        precio_servicio: '',
        precio_habitacion: ''
      });

      // Pausar temporizador principal con setTimeout para evitar actualizaciones síncronas
      if (onPauseMainTimer) {
        setTimeout(() => {
          onPauseMainTimer();
          // También pausar el timer global para mantener sincronía
          if (servicio?.id_servicio) {
            pauseTimerByServicioId(servicio.id_servicio);
          }
          console.log('Modal: Pausando timer principal para servicio:', servicio?.id_servicio);
        }, 0);
      }
    }
  }, [servicio?.id_servicio, open]); // Usar solo el ID del servicio para evitar recreaciones

  useEffect(() => {
    if (!open && onResumeMainTimer && servicio?.id_servicio) {
      const servicioId = servicio.id_servicio;
      // Usar setTimeout para evitar actualizaciones durante el render
      const timeoutId = setTimeout(() => {
        onResumeMainTimer();

        // Solo reanudar el global si no hay un timer temporal activo
        // (ya sea porque no se creó uno o porque ya terminó)
        const tempTimer = getTemporaryTimerByServicioId(servicioId);
        if (!tempTimer) {
          resumeTimerByServicioId(servicioId);
        }
      }, 0);

      return () => clearTimeout(timeoutId);
    }
  }, [open, servicio?.id_servicio]); // Removí onResumeMainTimer de las dependencias

  // Funciones para formatear números con puntos de miles
  const formatNumberWithDots = useCallback((value: number | string) => {
    if (!value || value === 0) return '';
    const numValue = typeof value === 'string' ? parseInt(value.replace(/[^\d]/g, ''), 10) : value;
    if (isNaN(numValue) || numValue === 0) return '';
    return numValue.toLocaleString('es-CO');
  }, []);

  const parseNumberFromDots = useCallback((value: string) => {
    if (!value || value.trim() === '') return 0;
    // Remover todos los puntos y espacios, mantener solo números
    const cleanValue = value.replace(/[^\d]/g, '');
    if (cleanValue === '') return 0;
    const numValue = parseInt(cleanValue, 10);
    return isNaN(numValue) ? 0 : numValue;
  }, []);

  // Calcular IVA automáticamente cuando es tarjeta (replicando lógica de creación)
  const calculateIVA = useCallback((precioServicio: number, metodoPago: string, numAnfitrionas: number, precioHabitacion: number) => {
    if (metodoPago === 'tarjeta') {
      const nuevoSubTotal = precioServicio * numAnfitrionas;
      const precioHabitacionTotal = precioHabitacion * numAnfitrionas;

      // Calcular IVA sobre el precio de servicio ya multiplicado
      let nuevoIVA = Math.floor(nuevoSubTotal * 0.20);

      let nuevoTotal = nuevoSubTotal + precioHabitacionTotal + nuevoIVA;

      // Redondear total al múltiplo de 5000 más cercano hacia arriba
      const totalRedondeado = Math.ceil(nuevoTotal / 5000) * 5000;
      const excedente = totalRedondeado - nuevoTotal;

      // El excedente se suma al IVA
      nuevoIVA = nuevoIVA + excedente;

      return nuevoIVA;
    }
    return 0;
  }, []);

  // Calcular totales
  const precioServicioTotal = formData.precio_servicio * numAnfitrionas;
  const precioHabitacionTotal = formData.precio_habitacion * numAnfitrionas;
  const iva = calculateIVA(formData.precio_servicio, formData.metodo_pago, numAnfitrionas, formData.precio_habitacion);
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

  const handleInputFocus = useCallback((field: 'precio_servicio' | 'precio_habitacion') => {
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
    if (formData.precio_servicio < 0) {
      toast.error('El precio del servicio debe ser mayor o igual a 0');
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

    setIsSaving(true);
    try {
      const response = await fetch(`/api/servicios/${servicio.id_servicio}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          precio_servicio: precioServicioTotal, // Enviar el precio total (unitario * anfitrionas)
          precio_habitacion: precioHabitacionTotal, // Enviar el precio total (unitario * anfitrionas)
          metodo_pago: formData.metodo_pago,
          tiempo: formData.tiempo,
          iva: iva,
          sub_total: subTotal,
          total: total
        })
      });

      const result = await response.json();

      if (result.success) {
        toast.success('Servicio actualizado correctamente');

        // Si se cambió el tiempo, iniciar timer temporal
        if (formData.tiempo > 0 && servicio.habitacion_numero && onStartTemporaryTimer) {
          // Guardar los valores originales para restaurar después
          const valoresOriginales = {
            precio_servicio: servicio.precio_servicio,
            precio_habitacion: servicio.precio_habitacion,
            metodo_pago: servicio.metodo_pago,
            iva: servicio.iva,
            sub_total: servicio.sub_total,
            total: servicio.total
          };

          // Generar comisiones para el servicio temporal
          try {
            const comisionResponse = await fetch('/api/servicios/temporal-commission', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                servicio_id: servicio.id_servicio,
                precio_servicio_temporal: precioServicioTotal,
                precio_habitacion_temporal: precioHabitacionTotal,
                iva_temporal: iva,
                total_temporal: total,
                metodo_pago: formData.metodo_pago,
                tiempo_temporal: formData.tiempo
              })
            });

            if (comisionResponse.ok) {
              const comisionResult = await comisionResponse.json();
              toast.success(`Comisiones generadas: ${comisionResult.data?.comisiones_creadas || 0} anfitrionas`);
            } else {
              toast.warning('Servicio actualizado pero error al generar comisiones temporales');
            }
          } catch (error) {
            console.error('Error generating temporal commissions:', error);
            toast.warning('Servicio actualizado pero error al generar comisiones temporales');
          }

          // Iniciar timer temporal global (para el "cad" en la parte inferior derecha)
          startGlobalTemporaryTimer(
            servicio.id_servicio!,
            servicio.habitacion_id,
            servicio.habitacion_numero || '?',
            formData.tiempo,
            servicio.codigo,
            servicio.cliente_nombre || 'Sin registrar',
            async () => {
              // Callback cuando termine el timer temporal global
              console.log('Timer global temporal terminado para servicio:', servicio.id_servicio);
            }
          );

          // Iniciar timer temporal usando el callback del ServicioCard (maneja la UI de la card y restauración)
          onStartTemporaryTimer(formData.tiempo, async () => {
            // Callback cuando termine el timer temporal - restaurar valores originales
            try {
              const restoreResponse = await fetch(`/api/servicios/${servicio.id_servicio}`, {
                method: 'PATCH',
                headers: {
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                  precio_servicio: valoresOriginales.precio_servicio,
                  precio_habitacion: valoresOriginales.precio_habitacion,
                  metodo_pago: valoresOriginales.metodo_pago,
                  iva: valoresOriginales.iva,
                  sub_total: valoresOriginales.sub_total,
                  total: valoresOriginales.total
                })
              });

              if (restoreResponse.ok) {
                toast.success('Valores del servicio restaurados a los originales');
                if (onUpdate) onUpdate(); // Actualizar la vista
              } else {
                toast.error('Error al restaurar valores originales del servicio');
              }
            } catch (error) {
              console.error('Error restoring service values:', error);
              toast.error('Error al restaurar valores del servicio');
            }
          });
        }

        handleClose();
        if (onUpdate) onUpdate();
      } else {
        toast.error(result.message || 'Error al actualizar servicio');
      }
    } catch (error) {
      console.error('Error updating service:', error);
      toast.error('Error de conexión al actualizar');
    } finally {
      setIsSaving(false);
    }
  }, [servicio, formData, iva, subTotal, total, handleClose, onUpdate, precioServicioTotal, precioHabitacionTotal, onStartTemporaryTimer, startGlobalTemporaryTimer]);

  if (!servicio) return null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="w-[95vw] max-w-[95vw] sm:w-auto sm:max-w-[600px] max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="flex-shrink-0 px-4 sm:px-6 pt-4 sm:pt-6 pb-4 border-b">
          <DialogTitle className="flex items-center justify-between">
            <span>Editar Servicio + Timer Temporal</span>
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
            {/* Precio del Servicio */}
            <div className="space-y-2">
              <Label htmlFor="precio_servicio">
                Precio del Servicio {numAnfitrionas > 1 ? `(por anfitriona)` : ''}
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
              {numAnfitrionas > 1 && formData.precio_servicio > 0 && (
                <p className="text-xs text-gray-500">
                  Total: {formatCurrencyNoDecimals(formData.precio_servicio * numAnfitrionas)} ({numAnfitrionas} × {formatCurrencyNoDecimals(formData.precio_servicio)})
                </p>
              )}
            </div>

            {/* Precio de la Habitación */}
            <div className="space-y-2">
              <Label htmlFor="precio_habitacion">
                Precio de la Habitación {numAnfitrionas > 1 ? `(por anfitriona)` : ''}
              </Label>
              <Input
                id="precio_habitacion"
                type="text"
                value={displayValues.precio_habitacion}
                onChange={(e) => handleInputChange('precio_habitacion', e.target.value)}
                onFocus={() => handleInputFocus('precio_habitacion')}
                onBlur={() => handleInputBlur('precio_habitacion')}
                placeholder="Ingrese el precio de la habitación"
                disabled={isSaving}
              />
              {numAnfitrionas > 1 && formData.precio_habitacion > 0 && (
                <p className="text-xs text-gray-500">
                  Total: {formatCurrencyNoDecimals(formData.precio_habitacion * numAnfitrionas)} ({numAnfitrionas} × {formatCurrencyNoDecimals(formData.precio_habitacion)})
                </p>
              )}
            </div>

            {/* Método de Pago */}
            <div className="space-y-2">
              <Label htmlFor="metodo_pago">Método de Pago</Label>
              <select
                value={formData.metodo_pago}
                onChange={(e) => handleInputChange('metodo_pago', e.target.value)}
                disabled={isSaving}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="efectivo">Efectivo</option>
                <option value="tarjeta">Tarjeta (+ 20% IVA)</option>
                <option value="transferencia">Transferencia</option>
              </select>
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
              <Input
                id="tiempo"
                type="number"
                value={formData.tiempo}
                onChange={(e) => handleInputChange('tiempo', e.target.value)}
                placeholder="0"
                min="1"
                disabled={isSaving}
              />
              <p className="text-xs text-blue-600">
                Este tiempo se ejecutará como timer temporal. El timer principal se pausará hasta que termine.
              </p>
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
              {numAnfitrionas === 1 && (
                <div className="text-xs text-blue-600 font-medium mt-1">
                  Comisión para anfitriona: {formatCurrencyNoDecimals(precioServicioTotal)}
                </div>
              )}
              {numAnfitrionas > 1 && (
                <div className="text-xs text-gray-500 border-t pt-2">
                  <p>Desglose por anfitriona:</p>
                  <p>• Servicio: {formatCurrencyNoDecimals(formData.precio_servicio)} × {numAnfitrionas}</p>
                  <p>• Habitación: {formatCurrencyNoDecimals(formData.precio_habitacion)} × {numAnfitrionas}</p>
                  {iva > 0 && <p>• IVA: {formatCurrencyNoDecimals(iva)} (20% + ajuste para redondeo a $5.000)</p>}
                  <p className="text-blue-600 font-medium mt-1">Comisión por anfitriona: {formatCurrencyNoDecimals(Math.floor(precioServicioTotal / numAnfitrionas))}</p>
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
              className="flex-1"
              onClick={handleClose}
              disabled={isSaving}
            >
              Cancelar
            </Button>
            <Button
              className="flex-1"
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