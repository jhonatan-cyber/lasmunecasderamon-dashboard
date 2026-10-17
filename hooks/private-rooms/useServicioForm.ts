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
  type ClienteConSaldo,
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

/**
 * Estado completo de la página «Datos Servicio»: datos de lookup, formulario,
 * totales derivados (con IVA/redondeo), efectos de habitación/cliente y el
 * flujo confirmar → POST `/api/servicios` → timer. El JSX vive en los
 * subcomponentes de `components/private-rooms/new/` y la página solo compone.
 */
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

  /**
   * Pregunta «¿a quién descontamos?» cuando los clientes elegidos tienen cuenta
   * y saldo: al primero, al segundo, a ambos (mitad y mitad) o a nadie.
   */
  const [showPrepagoChoiceModal, setShowPrepagoChoiceModal] = useState(false);
  const [prepagoOpcion, setPrepagoOpcion] = useState<'uno' | 'ambos' | 'ninguno' | null>(null);
  const [prepagoTitularId, setPrepagoTitularId] = useState<string | null>(null);

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

  // Los topes de anfitrionas/clientes bajan según lo que se elija en el otro grupo
  // (y al elegir una habitación con comisión). Si la selección vigente queda por
  // encima del tope, se recorta para que nunca supere las 4 personas ni los 2
  // clientes permitidos.
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

  // Sin cliente elegido no hay prepago: se resetea el método y se saca de los mixtos.
  useEffect(() => {
    if (selectedClientData) return;

    if (formData.metodo_pago === 'prepago') {
      setFormData(prev => ({ ...prev, metodo_pago: '' }));
    }

    setPagosMixtos(prev => prev.filter(pago => pago.metodo !== 'prepago'));
  }, [selectedClientData, formData.metodo_pago]);

  // Sin clientes con saldo no hay descuento posible: se resetea el método prepago
  // y se sacan las filas prepago de los mixtos.
  useEffect(() => {
    if (clientesConSaldo.length > 0) return;

    if (formData.metodo_pago === 'prepago') {
      setFormData(prev => ({ ...prev, metodo_pago: '' }));
    }

    setPagosMixtos(prev => prev.filter(pago => pago.metodo !== 'prepago'));
  }, [clientesConSaldo.length, formData.metodo_pago]);

  // Al cambiar clientes o método cambia la pregunta: se reinicia la elección.
  const claveClientesElegidos = formData.clientes.join('|');
  useEffect(() => {
    setPrepagoOpcion(null);
    setPrepagoTitularId(null);
    setShowPrepagoChoiceModal(false);
  }, [claveClientesElegidos, formData.metodo_pago]);

  /**
   * El saldo del cliente se descuenta con cualquier método simple (efectivo,
   * tarjeta, transferencia o prepago). En «mixto» el reparto es manual, así que
   * solo se pregunta si hay una fila prepago explícita.
   */
  const saldoMetodoSimple = formData.metodo_pago !== '' && formData.metodo_pago !== 'mixto';

  /** ¿Corresponde preguntar a quién se le cobra el servicio desde el saldo? */
  const preguntarDestinoSaldo =
    clientesConSaldo.length > 0 &&
    (formData.metodo_pago === 'mixto'
      ? pagosMixtos.some(pago => pago.metodo === 'prepago')
      : saldoMetodoSimple);

  /** Monto que se intenta cubrir con saldo: total o la fila prepago del mixto. */
  const montoPrepagoBase =
    formData.metodo_pago === 'mixto'
      ? pagosMixtos
          .filter(pago => pago.metodo === 'prepago')
          .reduce((sum, pago) => sum + Number(pago.monto || 0), 0)
      : total;

  const handleSubmit = (eleccionDesdeModal?: {
    opcion: 'uno' | 'ambos' | 'ninguno';
    clienteId: string | null;
  }) => {
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

    if (preguntarDestinoSaldo) {
      const eleccionVigente = eleccionDesdeModal ?? {
        opcion: prepagoOpcion,
        clienteId: prepagoTitularId
      };
      const faltaElegir =
        !eleccionVigente.opcion || (eleccionVigente.opcion === 'uno' && !eleccionVigente.clienteId);
      if (faltaElegir && !eleccionDesdeModal) {
        // Pregunta «¿a quién cobramos desde el saldo?» antes de confirmar.
        setShowPrepagoChoiceModal(true);
        return;
      }
    }

    const servicioData = buildServicioPayload({
      formData,
      precioHabitacion,
      subTotal,
      total,
      pagosMixtos,
      prepagoDestinos: preguntarDestinoSaldo
        ? resolverDestinosPrepago(eleccionDesdeModal)
        : undefined
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

  /**
   * Destinos del descuento según la elección del modal:
   *  - «uno»: a un cliente puntual (con uno solo, a ese).
   *  - «ambos»: mitad y mitad entre los dos primeros.
   *  - «ninguno»: arreglo vacío explícito para que el backend no descuente nada.
   */
  function resolverDestinosPrepago(eleccionDesdeModal?: {
    opcion: 'uno' | 'ambos' | 'ninguno';
    clienteId: string | null;
  }): PrepagoDestino[] {
    if (!preguntarDestinoSaldo) return [];
    const opcion = eleccionDesdeModal?.opcion ?? prepagoOpcion;
    const clienteId = eleccionDesdeModal?.clienteId ?? prepagoTitularId;
    if (opcion === 'ambos') {
      return calcularDistribucionPrepago(montoPrepagoBase, clientesConSaldo, 'ambos').destinos;
    }
    if (opcion === 'uno') {
      const titular = clienteId ?? clientesConSaldo[0]?.clienteId ?? null;
      if (!titular) return [];
      return calcularDistribucionPrepago(montoPrepagoBase, clientesConSaldo, 'uno', titular)
        .destinos;
    }
    return [];
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
    confirmAndSubmit,
    // Pregunta «¿a quién descontamos?» (clientes con cuenta y saldo)
    showPrepagoChoiceModal,
    setShowPrepagoChoiceModal,
    prepagoOpcion,
    setPrepagoOpcion,
    prepagoTitularId,
    setPrepagoTitularId,
    clientesConSaldo,
    montoPrepagoBase
  };
}

export type ServicioFormState = ReturnType<typeof useServicioForm>;
