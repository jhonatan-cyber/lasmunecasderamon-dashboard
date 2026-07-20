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

  const maxHostesses = useMemo(() => {
    if (!hasComision) return 10;
    return Math.min(3, 4 - formData.clientes.length);
  }, [hasComision, formData.clientes.length]);

  const maxClients = useMemo(() => {
    if (!hasComision) return 4;
    return 4 - formData.usuarios.length;
  }, [hasComision, formData.usuarios.length]);

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

  const disabledPaymentMethods = useMemo(() => {
    const saldo = Number(selectedClientData?.saldo || 0);
    return saldo > 0 ? (['prepago', 'mixto'] as const) : (['prepago'] as const);
  }, [selectedClientData]);

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
    disabledPaymentMethods
  };
}
