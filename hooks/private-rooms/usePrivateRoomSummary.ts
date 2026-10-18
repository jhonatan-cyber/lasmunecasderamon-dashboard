'use client';

import { useMemo } from 'react';
import { getCardSplit } from '@/components/orders/productModalRules';

interface PrivateRoomSummaryParams {
  formData: {
    clientes: string[];
    usuarios: string[];
    habitacion_id: string;
    precio_servicio: number;
    metodo_pago: string;
    iva: number;
    tiempo: number;
  };
  clientes: any[];
  anfitrionas: any[];
  habitaciones: any[];
  precioHabitacion: number;
  total: number;
  pagosMixtos: any[];
}

export function usePrivateRoomSummary({
  formData,
  clientes,
  anfitrionas,
  habitaciones,
  precioHabitacion,
  total,
  pagosMixtos
}: PrivateRoomSummaryParams) {
  const selectedRoom = useMemo(() => {
    return habitaciones.find(
      h => String(h.id_habitacion || h.id) === String(formData.habitacion_id)
    );
  }, [formData.habitacion_id, habitaciones]);

  const selectedClientData = useMemo(() => {
    if (formData.clientes.length === 0) return null;
    return clientes.find(c => String(c.id_cliente ?? c.id ?? '') === String(formData.clientes[0]));
  }, [clientes, formData.clientes]);

  const selectedClientName = useMemo(() => {
    if (!selectedClientData) return '';
    const nombre = selectedClientData.nombre || selectedClientData.name || '';
    const apellido = selectedClientData.apellido || selectedClientData.lastName || '';
    return `${nombre} ${apellido}`.trim() || 'Cliente';
  }, [selectedClientData]);

  const selectedHostessNames = useMemo(() => {
    if (formData.usuarios.length === 0) return '';

    return formData.usuarios
      .map(userId => {
        const anfitriona = anfitrionas.find(
          a => String(a.id_usuario ?? a.id ?? '') === String(userId)
        );
        return anfitriona ? anfitriona.nick || anfitriona.nombre : null;
      })
      .filter(Boolean)
      .join(', ');
  }, [anfitrionas, formData.usuarios]);

  const hasComision = useMemo(() => {
    return selectedRoom && (selectedRoom.comision_anfitriona ?? 0) > 0;
  }, [selectedRoom]);

  const isServicePriceLocked = useMemo(() => {
    if (!selectedRoom) return false;

    const roomPrice = Number(selectedRoom.precio ?? selectedRoom.price ?? 0);
    const roomCommission = Number(selectedRoom.comision_anfitriona ?? 0);

    return roomPrice > 0 && roomCommission > 0;
  }, [selectedRoom]);

  const roomWithPriceAndTime = useMemo(() => {
    if (!selectedRoom) return false;
    const price = Number(selectedRoom.precio ?? selectedRoom.price ?? 0);
    const time = Number(selectedRoom.tiempo ?? selectedRoom.time ?? 0);
    return price > 0 && time > 0;
  }, [selectedRoom]);

  // Habitación con comisión: máximo 4 personas en total y nunca más de 2 clientes
  // (2 clientes + 2 anfitrionas, o 1 cliente + 3 anfitrionas). La selección de
  // cliente sigue siendo opcional.
  const maxHostesses = useMemo(() => {
    if (roomWithPriceAndTime) return anfitrionas.length;
    if (!hasComision) return 10;
    return Math.min(3, 4 - formData.clientes.length);
  }, [roomWithPriceAndTime, anfitrionas.length, hasComision, formData.clientes.length]);

  const maxClients = useMemo(() => {
    if (roomWithPriceAndTime) return 4;
    if (!hasComision) return 4;
    return Math.min(2, 4 - formData.usuarios.length);
  }, [roomWithPriceAndTime, hasComision, formData.usuarios.length]);

  const desgloseTarjeta = useMemo(() => getCardSplit(total), [total]);

  const precioHabitacionBoleta = useMemo(() => {
    const cantidadAnfitrionas = formData.usuarios.length || 1;
    const cantidadClientes = formData.clientes.length || 1;
    let multiplicadorHabitacion = cantidadAnfitrionas;

    if (
      cantidadClientes > cantidadAnfitrionas &&
      selectedRoom &&
      (selectedRoom.comision_anfitriona ?? 0) === 0
    ) {
      multiplicadorHabitacion = cantidadClientes;
    }

    if (selectedRoom && (selectedRoom.comision_anfitriona ?? 0) > 0) {
      multiplicadorHabitacion = 1;
    }

    return precioHabitacion * multiplicadorHabitacion;
  }, [formData.usuarios.length, formData.clientes.length, precioHabitacion, selectedRoom]);

  /** Clientes seleccionados con cuenta y saldo: candidatos al descuento. */
  const clientesConSaldo = useMemo(() => {
    return formData.clientes
      .map(id => clientes.find(c => String(c.id_cliente ?? c.id ?? '') === String(id)))
      .filter((c): c is any => !!c && Number(c.saldo || 0) > 0)
      .map(c => ({
        clienteId: String(c.id_cliente ?? c.id ?? ''),
        nombre: `${c.nombre || c.name || ''} ${c.apellido || c.lastName || ''}`.trim() || 'Cliente',
        saldo: Number(c.saldo || 0)
      }));
  }, [clientes, formData.clientes]);

  /** Solo se bloquea el prepago cuando ninguno de los clientes elegidos tiene saldo. */
  const disabledPaymentMethods = useMemo(() => {
    return clientesConSaldo.length > 0 ? ([] as const) : (['prepago'] as const);
  }, [clientesConSaldo]);

  return {
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
  };
}
