'use client';

import { useEffect } from 'react';
import CustomerSelect from '@/components/shared/selects/CustomerSelect';
import HostessSelect from '@/components/shared/selects/HostessSelect';
import RoomSelect from '@/components/shared/selects/RoomSelect';
import { TimeSelector } from '@/components/ui/TimeSelector';
import { Client } from '@/types/client';
import { User } from '@/types/user';
import { Room } from '@/types/room';

type Cliente = Partial<Client>;

type Anfitriona = Partial<User>;

type Habitacion = Partial<Room>;

interface AccountFormDataProps {
  clientes: Cliente[];
  anfitrionas: Anfitriona[];
  habitaciones: Habitacion[];
  selectedCliente: string;
  selectedAnfitrionas: string[];
  selectedHabitacion: string;
  selectedTime?: number;
  hasCommissionProducts: boolean;
  maxAnfitrionas: number;
  loading: boolean;
  onClienteChange: (value: string) => void;
  onAnfitrionaChange: (value: string[]) => void;
  onHabitacionChange: (value: string) => void;
  onTimeChange?: (value: number) => void;
}

export default function AccountFormData({
  clientes,
  anfitrionas,
  habitaciones,
  selectedCliente,
  selectedAnfitrionas,
  selectedHabitacion,
  selectedTime,
  maxAnfitrionas,
  loading,
  onClienteChange,
  onAnfitrionaChange,
  onHabitacionChange,
  onTimeChange
}: AccountFormDataProps) {
  const habitacionesFiltradas =
    selectedAnfitrionas.length === 0
      ? habitaciones.filter(
          r =>
            (r.price ?? r.precio ?? 0) === 0 &&
            (r.time ?? r.tiempo ?? 0) === 0 &&
            (r.comision_anfitriona ?? 0) === 0
        )
      : habitaciones;

  // Detectar si hay habitación seleccionada y NO tiene comisión
  const habitacionSeleccionada = selectedHabitacion
    ? habitaciones.find(r => String(r.id ?? r.id_habitacion) === selectedHabitacion)
    : null;

  const mostrarSelectorTiempo =
    habitacionSeleccionada && (habitacionSeleccionada.comision_anfitriona ?? 0) === 0;

  // Auto-setear tiempo de la habitación al seleccionarla
  useEffect(() => {
    if (habitacionSeleccionada && onTimeChange) {
      const tiempo = habitacionSeleccionada.time ?? habitacionSeleccionada.tiempo ?? 0;
      onTimeChange(tiempo > 0 ? tiempo : 60);
    }
  }, [habitacionSeleccionada, onTimeChange]);

  return (
    <div className='space-y-4'>
      <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'>
        <CustomerSelect
          clientes={clientes}
          value={selectedCliente}
          onChange={onClienteChange}
          required
        />

        <HostessSelect
          anfitrionas={anfitrionas}
          value={selectedAnfitrionas}
          onChange={onAnfitrionaChange}
          maxSelection={maxAnfitrionas}
        />

        <RoomSelect
          habitaciones={habitacionesFiltradas}
          value={selectedHabitacion}
          onChange={onHabitacionChange}
          disabled={loading || !selectedCliente || selectedCliente === 'none'}
          placeholder='Seleccione una habitación'
          label='Habitación'
          showPrice={true}
        />
      </div>

      {/* Selector de tiempo al seleccionar habitación (excepto con comisión) */}
      {mostrarSelectorTiempo && selectedTime !== undefined && onTimeChange && (
        <div className='max-w-xs'>
          <TimeSelector
            value={selectedTime}
            onChange={onTimeChange}
            label='Tiempo habitación'
            step={5}
            min={5}
          />
        </div>
      )}
    </div>
  );
}
