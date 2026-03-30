'use client';

import CustomerSelect from '@/components/shared/selects/CustomerSelect';
import HostessSelect from '@/components/shared/selects/HostessSelect';
import RoomSelect from '@/components/shared/selects/RoomSelect';
import { Client } from '@/types/client';
import { User } from '@/types/user';
import { Room } from '@/types/room';

interface Cliente extends Partial<Client> { }

interface Anfitriona extends Partial<User> { }

interface Habitacion extends Partial<Room> { }

interface AccountFormDataProps {
  clientes: Cliente[];
  anfitrionas: Anfitriona[];
  habitaciones: Habitacion[];
  selectedCliente: string;
  selectedAnfitrionas: string[];
  selectedHabitacion: string;
  hasCommissionProducts: boolean;
  maxAnfitrionas: number;
  loading: boolean;
  onClienteChange: (value: string) => void;
  onAnfitrionaChange: (value: string[]) => void;
  onHabitacionChange: (value: string) => void;
}

export default function AccountFormData({
  clientes,
  anfitrionas,
  habitaciones,
  selectedCliente,
  selectedAnfitrionas,
  selectedHabitacion,
  maxAnfitrionas,
  loading,
  onClienteChange,
  onAnfitrionaChange,
  onHabitacionChange
}: AccountFormDataProps) {
  const habitacionesFiltradas = selectedAnfitrionas.length === 0
    ? habitaciones.filter(r =>
      (r.price ?? r.precio ?? 0) === 0 &&
      (r.time ?? r.tiempo ?? 0) === 0 &&
      (r.comision_anfitriona ?? 0) === 0
    )
    : habitaciones;

  return (
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
  );
}
