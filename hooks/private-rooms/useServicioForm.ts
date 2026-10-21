'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useRefreshOnFocus } from '@/hooks/shared';
import { useClients } from '@/hooks/clientes/useClients';
import { useAnfitrionas } from '@/hooks/personal';
import { useHabitaciones } from '@/hooks/habitaciones/useHabitaciones';
import { useTimer } from '@/contexts/TimerContext';
import logger from '@/lib/utils/logger';
import { usePrivateRoomSummary } from '@/hooks/private-rooms/usePrivateRoomSummary';
import { useIvaRate } from '@/components/providers/IvaRateProvider';
import { printBoletaHabitacion } from '@/components/private-rooms/new/printBoleta';
import {
  buildServicioPayload,
  calcularDistribucionPrepago,
  calcularTotalesServicio,
  validateServicioForm,
  unirNombresAnfitrionas,
  type PrepagoDestino,
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

export function useServicioForm() {
  const router = useRouter();
  const submitKey = useRef<string>('');
  const submitSignature = useRef('');
  const submitCode = useRef('');
  const submitting = useRef(false);
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const { allClients: clientes = [], fetchClients } = useClients();
  const { anfitrionas, getAnfitrionas: refetchAnfitrionas } = useAnfitrionas();
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

  const [prepagoDestino, setPrepagoDestino] = useState('');

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
    disabledPaymentMethods,
    clientesConSaldo
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

  useEffect(() => {
    if (!Number.isFinite(maxClients) || !Number.isFinite(maxHostesses)) return;

    setFormData(prev => {
      const clientes = prev.clientes.slice(0, maxClients);
      const usuarios = prev.usuarios.slice(0, maxHostesses);

      if (clientes.length === prev.clientes.length && usuarios.length === prev.usuarios.length) {
        return prev;
      }

      return { ...prev, clientes, usuarios };
    });
  }, [maxClients, maxHostesses]);

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
          producto_incluido_presentacion_id:
            roomCommission > 0 ? prev.producto_incluido_presentacion_id : undefined,
          precio_servicio: roomCommission > 0 ? 0 : prev.precio_servicio
        }));
      }
    } else {
      setPrecioHabitacion(0);
      setTiempoHabitacion(0);
    }
  }, [formData.habitacion_id, selectedRoom]);

  useEffect(() => {
    if (selectedClientData) return;

    if (formData.metodo_pago === 'prepago') {
      setFormData(prev => ({ ...prev, metodo_pago: '' }));
    }

    setPagosMixtos(prev => prev.filter(pago => pago.metodo !== 'prepago'));
  }, [selectedClientData, formData.metodo_pago]);

  useEffect(() => {
    if (clientesConSaldo.length > 0) return;

    if (formData.metodo_pago === 'prepago') {
      setFormData(prev => ({ ...prev, metodo_pago: '' }));
    }

    setPagosMixtos(prev => prev.filter(pago => pago.metodo !== 'prepago'));
  }, [clientesConSaldo.length, formData.metodo_pago]);

  useEffect(() => {
    if (clientesConSaldo.length === 0) {
      setPrepagoDestino('');
      return;
    }
    setFormData(prev => ({ ...prev, metodo_pago: 'prepago' }));
    setPagosMixtos([]);
    setPrepagoDestino(clientesConSaldo.length === 2 ? 'ambos' : clientesConSaldo[0].clienteId);
  }, [clientesConSaldo]);

  const preguntarDestinoSaldo =
    clientesConSaldo.length > 0 &&
    (formData.metodo_pago === 'mixto'
      ? pagosMixtos.some(pago => pago.metodo === 'prepago')
      : formData.metodo_pago === 'prepago');

  const montoPrepagoBase =
    formData.metodo_pago === 'mixto'
      ? pagosMixtos
          .filter(pago => pago.metodo === 'prepago')
          .reduce((sum, pago) => sum + Number(pago.monto || 0), 0)
      : total;

  const handleSubmit = () => {
    if (submitting.current) return;
    const validationError =
      hasComision && !formData.producto_incluido_presentacion_id
        ? 'Selecciona el producto incluido en la habitación'
        : validateServicioForm(formData);
    if (validationError) {
      toast.error(validationError);
      return;
    }

    if (formData.metodo_pago === 'prepago' && clientesConSaldo.length === 0) {
      toast.error('Ninguno de los clientes seleccionados tiene saldo disponible');
      return;
    }

    const servicioData = buildServicioPayload({
      formData,
      precioHabitacion,
      subTotal,
      total,
      pagosMixtos,
      prepagoDestinos: preguntarDestinoSaldo ? resolverDestinosPrepago() : undefined
    });

    const signature = JSON.stringify({ ...servicioData, codigo: undefined });
    if (submitSignature.current !== signature) {
      submitKey.current = crypto.randomUUID();
      submitCode.current = servicioData.codigo;
      submitSignature.current = signature;
    }
    servicioData.codigo = submitCode.current;
    setServicioDataToSubmit(servicioData);
    setShowConfirmModal(true);
  };

  function resolverDestinosPrepago(): PrepagoDestino[] {
    if (!preguntarDestinoSaldo) return [];
    if (prepagoDestino === 'ambos') {
      return calcularDistribucionPrepago(montoPrepagoBase, clientesConSaldo, 'ambos').destinos;
    }
    const titular = clientesConSaldo.find(cliente => cliente.clienteId === prepagoDestino);
    if (!titular) return [];
    return calcularDistribucionPrepago(montoPrepagoBase, clientesConSaldo, 'uno', titular.clienteId)
      .destinos;
  }

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
    if (!servicioDataToSubmit || submitting.current) return;
    submitting.current = true;

    setLoading(true);
    setShowConfirmModal(false);
    try {
      const response = await fetch('/api/servicios', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-idempotency-key': submitKey.current
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
        await refreshLookupData();
      }
    } catch (error) {
      logger.captureException(error, { context: 'NewPrivateRoomPageClient:createRoom' });
      toast.error('Error al crear servicio');
    } finally {
      submitting.current = false;
      setLoading(false);
    }
  };

  return {
    clientes,
    anfitrionas,
    habitaciones,
    refreshLookupData,
    formData,
    setFormData,
    precioHabitacion,
    tiempoHabitacion,
    subTotal,
    total,
    pagosMixtos,
    setPagosMixtos,
    ivaRate,
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
    loading,
    showConfirmModal,
    setShowConfirmModal,
    handleSubmit,
    handleGenerarBoletaHabitacion,
    confirmAndSubmit,
    prepagoDestino,
    setPrepagoDestino,
    clientesConSaldo,
    montoPrepagoBase
  };
}

export type ServicioFormState = ReturnType<typeof useServicioForm>;
