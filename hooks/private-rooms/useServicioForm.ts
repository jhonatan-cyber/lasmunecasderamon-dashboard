'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useRefreshOnFocus } from '@/hooks/shared';
import { useClients } from '@/hooks/clientes/useClients';
import { useAnfitrionasDisponibles } from '@/hooks/personal';
import { useHabitaciones } from '@/hooks/habitaciones/useHabitaciones';
import { useTimer } from '@/contexts/TimerContext';
import logger from '@/lib/utils/logger';
import { usePrivateRoomSummary } from '@/hooks/private-rooms/usePrivateRoomSummary';
import { useIvaRate } from '@/components/providers/IvaRateProvider';
import { printBoletaHabitacion } from '@/components/private-rooms/new/printBoleta';
import {
  buildServicioPayload,
  calcularTotalesServicio,
  validateServicioForm,
  unirNombresAnfitrionas,
  type ServicioFormData
} from '@/components/private-rooms/new/servicioFormModel';

const INITIAL_FORM: ServicioFormData = {
  clientes: [],
  usuarios: [],
  habitacion_id: '',
  precio_habitacion: 0,
  tiempo_habitacion: 0,
  precio_servicio: 0,
  metodo_pago: '',
  iva: 0,
  tiempo: 0
};

/**
 * Estado completo de la página «Datos Servicio»: datos de lookup, formulario,
 * totales derivados (con IVA/redondeo), efectos de habitación/cliente y el
 * flujo confirmar → POST `/api/servicios` → timer. El JSX vive en los
 * subcomponentes de `components/private-rooms/new/` y la página solo compone.
 */
export function useServicioForm() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const { allClients: clientes = [], fetchClients } = useClients();
  const { anfitrionas, refetch: refetchAnfitrionas } = useAnfitrionasDisponibles();
  const { habitaciones, getHabitaciones } = useHabitaciones();
  const { startTimer } = useTimer();
  const ivaRate = useIvaRate();

  const [formData, setFormData] = useState<ServicioFormData>(INITIAL_FORM);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [servicioDataToSubmit, setServicioDataToSubmit] = useState<any>(null);

  const [precioHabitacion, setPrecioHabitacion] = useState(0);
  const [tiempoHabitacion, setTiempoHabitacion] = useState(0);
  const [subTotal, setSubTotal] = useState(0);
  const [total, setTotal] = useState(0);
  const [pagosMixtos, setPagosMixtos] = useState<any[]>([]);

  const {
    selectedRoom,
    selectedClientData,
    selectedClientName,
    selectedHostessNames,
    hasComision,
    isServicePriceLocked,
    maxHostesses,
    maxClients,
    desgloseTarjeta,
    precioHabitacionBoleta,
    disabledPaymentMethods
  } = usePrivateRoomSummary({
    formData,
    clientes,
    anfitrionas,
    habitaciones,
    precioHabitacion,
    total,
    pagosMixtos
  });

  const refreshLookupData = useCallback(async () => {
    await Promise.all([fetchClients(), refetchAnfitrionas(), getHabitaciones()]);
  }, [fetchClients, refetchAnfitrionas, getHabitaciones]);

  useRefreshOnFocus(refreshLookupData);

  // Recalcula subtotal/IVA/total cuando cambian los insumos del cálculo.
  useEffect(() => {
    const {
      subTotal: nuevoSubTotal,
      iva: nuevoIva,
      total: nuevoTotal
    } = calcularTotalesServicio({
      precioServicio: formData.precio_servicio,
      cantidadAnfitrionas: formData.usuarios.length,
      cantidadClientes: formData.clientes.length,
      selectedRoom,
      precioHabitacion,
      metodoPago: formData.metodo_pago,
      pagosMixtos,
      ivaRate
    });
    setSubTotal(nuevoSubTotal);
    setTotal(nuevoTotal);
    setFormData(prev => ({ ...prev, iva: nuevoIva }));
  }, [
    formData.precio_servicio,
    precioHabitacion,
    formData.usuarios.length,
    formData.clientes.length,
    formData.metodo_pago,
    pagosMixtos,
    selectedRoom,
    ivaRate
  ]);

  // Elegir habitación fija su precio/tiempo y bloquea la comisión si la sala la paga.
  useEffect(() => {
    if (formData.habitacion_id) {
      if (selectedRoom) {
        const precio = selectedRoom.precio || selectedRoom.price || 0;
        const tiempo = selectedRoom.tiempo || selectedRoom.time || 0;
        const roomCommission = Number(selectedRoom.comision_anfitriona ?? 0);
        setPrecioHabitacion(precio);
        setTiempoHabitacion(tiempo);
        setFormData(prev => ({
          ...prev,
          tiempo,
          precio_servicio: roomCommission > 0 ? 0 : prev.precio_servicio
        }));
      }
    } else {
      setPrecioHabitacion(0);
      setTiempoHabitacion(0);
    }
  }, [formData.habitacion_id, selectedRoom]);

  // Sin cliente elegido no hay prepago: se resetea el método y se saca de los mixtos.
  useEffect(() => {
    if (selectedClientData) return;

    if (formData.metodo_pago === 'prepago') {
      setFormData(prev => ({ ...prev, metodo_pago: '' }));
    }

    setPagosMixtos(prev => prev.filter(pago => pago.metodo !== 'prepago'));
  }, [selectedClientData, formData.metodo_pago]);

  // Cliente con saldo positivo: no puede pagar con prepago (su saldo cubre).
  useEffect(() => {
    if (!selectedClientData) return;

    const saldo = Number(selectedClientData.saldo || 0);
    if (saldo > 0) {
      if (formData.metodo_pago === 'prepago' || formData.metodo_pago === 'mixto') {
        setFormData(prev => ({ ...prev, metodo_pago: '' }));
      }

      setPagosMixtos([]);
      return;
    }

    if (formData.metodo_pago === 'prepago') {
      setFormData(prev => ({ ...prev, metodo_pago: '' }));
    }

    setPagosMixtos(prev => prev.filter(pago => pago.metodo !== 'prepago'));
  }, [selectedClientData, formData.metodo_pago]);

  const handleSubmit = () => {
    const validationError = validateServicioForm(formData);
    if (validationError) {
      toast.error(validationError);
      return;
    }

    const servicioData = buildServicioPayload({
      formData,
      precioHabitacion,
      subTotal,
      total,
      pagosMixtos
    });

    setServicioDataToSubmit(servicioData);
    setShowConfirmModal(true);
  };

  const handleGenerarBoletaHabitacion = () => {
    printBoletaHabitacion({
      selectedRoom,
      selectedClientData,
      precioHabitacionBoleta,
      metodoPago: formData.metodo_pago,
      anfitrionasAtendiendo: unirNombresAnfitrionas(anfitrionas, formData.usuarios)
    });
  };

  const confirmAndSubmit = async () => {
    if (!servicioDataToSubmit) return;

    setLoading(true);
    setShowConfirmModal(false);
    try {
      const response = await fetch('/api/servicios', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(servicioDataToSubmit)
      });

      const data = await response.json();

      if (data.success) {
        if (selectedRoom) {
          const anfitrionasSeleccionadas = unirNombresAnfitrionas(
            anfitrionas,
            servicioDataToSubmit.usuarios
          );

          startTimer(
            String(data.id || data.id_servicio),
            String(servicioDataToSubmit.habitacion_id),
            selectedRoom.nombre || selectedRoom.name || selectedRoom.numero || 'N/A',
            servicioDataToSubmit.tiempo,
            servicioDataToSubmit.codigo,
            clientes.find(
              c => String(c.id_cliente ?? c.id ?? '') === String(servicioDataToSubmit.cliente_id)
            )?.nombre || '',
            anfitrionasSeleccionadas
          );
        }

        queryClient.invalidateQueries({ queryKey: ['/api/servicios'] });

        await refreshLookupData();

        toast.success(`Servicio creado exitosamente`);
        router.push('/private-rooms');
      } else {
        toast.error(data.message || 'Error al crear servicio');
      }
    } catch (error) {
      logger.captureException(error, { context: 'NewPrivateRoomPageClient:createRoom' });
      toast.error('Error al crear servicio');
    } finally {
      setLoading(false);
    }
  };

  return {
    // Lookup
    clientes,
    anfitrionas,
    habitaciones,
    refreshLookupData,
    // Formulario
    formData,
    setFormData,
    precioHabitacion,
    tiempoHabitacion,
    subTotal,
    total,
    pagosMixtos,
    setPagosMixtos,
    ivaRate,
    // Resumen (de usePrivateRoomSummary)
    selectedRoom,
    selectedClientData,
    selectedClientName,
    selectedHostessNames,
    hasComision,
    isServicePriceLocked,
    maxHostesses,
    maxClients,
    desgloseTarjeta,
    precioHabitacionBoleta,
    disabledPaymentMethods,
    // Acciones
    loading,
    showConfirmModal,
    setShowConfirmModal,
    handleSubmit,
    handleGenerarBoletaHabitacion,
    confirmAndSubmit
  };
}

export type ServicioFormState = ReturnType<typeof useServicioForm>;
