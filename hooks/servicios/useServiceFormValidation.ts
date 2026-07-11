'use client';

import { useState, useEffect, useCallback } from 'react';
import { ServicioWithDetails } from '@/types/servicio';
import { useNumberFormatter } from '@/hooks/shared';
import { useServicePricing } from '@/hooks/shared';
import { useHabitaciones } from '@/hooks/habitaciones/useHabitaciones';

interface UseServiceFormValidationProps {
  open: boolean;
  servicio: ServicioWithDetails | null;
}

export interface UseServiceFormValidationReturn {
  formData: {
    precio_servicio: number;
    precio_habitacion: number;
    metodo_pago: string;
    tiempo: number;
    usuarios: string[];
  };
  precioServicioDisplay: string;
  precioHabitacionDisplay: string;
  precioHabitacionSinComision: number;
  numAnfitrionasSeleccionadas: number;
  pricing: {
    iva: number;
    subTotal: number;
    total: number;
    precioServicioTotal: number;
    precioHabitacionTotal: number;
    multiplicadorTiempo: number;
  };
  handlePrecioServicioChange: (value: string) => void;
  handleMetodoPagoChange: (value: string) => void;
  handleTiempoChange: (value: string) => void;
  handleUsuariosChange: (usuarios: string[]) => void;
  validateForm: () => string | null;
  initFormForServicio: (servicio: ServicioWithDetails) => void;
}

export function useServiceFormValidation({
  open,
  servicio
}: UseServiceFormValidationProps): UseServiceFormValidationReturn {
  const { habitaciones } = useHabitaciones();

  const [formData, setFormData] = useState({
    precio_servicio: 0,
    precio_habitacion: 0,
    metodo_pago: 'efectivo',
    tiempo: 0,
    usuarios: [] as string[]
  });

  const precioServicioFormatter = useNumberFormatter(formData.precio_servicio);
  const precioHabitacionFormatter = useNumberFormatter(formData.precio_habitacion);

  const obtenerPrecioHabitacionSinComision = useCallback(() => {
    const habitacionSinComision = habitaciones.find(
      h => !h.comision_anfitriona || h.comision_anfitriona === 0
    );

    if (habitacionSinComision) {
      const precio = habitacionSinComision.precio || habitacionSinComision.price || 0;
      return precio;
    } else {
      return 0;
    }
  }, [habitaciones]);

  useEffect(() => {
    if (habitaciones.length > 0 && open) {
      const precio = obtenerPrecioHabitacionSinComision();
      if (precio > 0) {
        setFormData(prev => ({ ...prev, precio_habitacion: precio }));
        precioHabitacionFormatter.setFormattedValue(precioHabitacionFormatter.formatNumber(precio));
      }
    }
  }, [habitaciones, open, obtenerPrecioHabitacionSinComision, precioHabitacionFormatter]);

  const initFormForServicio = useCallback(
    (servicio: ServicioWithDetails) => {
      const precioSinComision = obtenerPrecioHabitacionSinComision();

      setFormData({
        precio_servicio: 0,
        precio_habitacion: precioSinComision,
        metodo_pago: servicio.metodo_pago || 'efectivo',
        tiempo: 0,
        usuarios: []
      });

      precioServicioFormatter.setFormattedValue('');
      precioHabitacionFormatter.setFormattedValue(
        precioSinComision > 0 ? precioHabitacionFormatter.formatNumber(precioSinComision) : ''
      );
    },
    [obtenerPrecioHabitacionSinComision, precioServicioFormatter, precioHabitacionFormatter]
  );

  const numAnfitrionasSeleccionadas = formData.usuarios.length || 1;

  const pricing = useServicePricing({
    precioServicio: formData.precio_servicio,
    precioHabitacion: formData.precio_habitacion,
    metodoPago: formData.metodo_pago,
    tiempo: formData.tiempo,
    numAnfitrionas: numAnfitrionasSeleccionadas
  });

  const handlePrecioServicioChange = useCallback(
    (value: string) => {
      precioServicioFormatter.handleChange(value, numValue => {
        setFormData(prev => ({ ...prev, precio_servicio: numValue }));
      });
    },
    [precioServicioFormatter]
  );

  const handleMetodoPagoChange = useCallback((value: string) => {
    setFormData(prev => ({ ...prev, metodo_pago: value }));
  }, []);

  const handleTiempoChange = useCallback((value: string) => {
    setFormData(prev => ({ ...prev, tiempo: Number(value) }));
  }, []);

  const handleUsuariosChange = useCallback((usuarios: string[]) => {
    setFormData(prev => ({ ...prev, usuarios }));
  }, []);

  const validateForm = useCallback((): string | null => {
    if (formData.precio_servicio <= 0) {
      return 'El precio del servicio debe ser mayor a 0';
    }
    if (formData.precio_habitacion < 0) {
      return 'El precio de la habitación debe ser mayor o igual a 0';
    }
    if (formData.tiempo <= 0) {
      return 'El tiempo debe ser mayor a 0 minutos';
    }
    if (formData.usuarios.length === 0) {
      return 'Debe seleccionar al menos una anfitriona';
    }
    return null;
  }, [formData]);

  return {
    formData,
    precioServicioDisplay: precioServicioFormatter.formattedValue,
    precioHabitacionDisplay: precioHabitacionFormatter.formattedValue,
    precioHabitacionSinComision: obtenerPrecioHabitacionSinComision(),
    numAnfitrionasSeleccionadas,
    pricing,
    handlePrecioServicioChange,
    handleMetodoPagoChange,
    handleTiempoChange,
    handleUsuariosChange,
    validateForm,
    initFormForServicio
  };
}
