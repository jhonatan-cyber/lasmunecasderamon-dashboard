'use client';

import { memo } from 'react';
import { CustomersSelect, HostessSelect, RoomSelect } from '@/components/shared/selects';
import type { ServicioFormData } from '@/components/private-rooms/new/servicioFormModel';

/** Fila superior de selects: habitación, anfitrionas y clientes. */
export const ServicioSelectsRow = memo(function ServicioSelectsRow({
  formData,
  setFormData,
  habitaciones,
  anfitrionas,
  clientes,
  maxHostesses,
  maxClients
}: {
  formData: ServicioFormData;
  setFormData: React.Dispatch<React.SetStateAction<ServicioFormData>>;
  habitaciones: any[];
  anfitrionas: any[];
  clientes: any[];
  maxHostesses: number;
  maxClients: number;
}) {
  return (
    <div className='grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4'>
      {/* Habitación */}
      <RoomSelect
        habitaciones={habitaciones}
        value={formData.habitacion_id ? formData.habitacion_id.toString() : ''}
        onChange={value => {
          setFormData(prev => ({ ...prev, habitacion_id: value }));
        }}
        label='HABITACIÓN'
        placeholder='Seleccionar habitación'
        required={true}
        showPrice={true}
        showTime={true}
        filterByStatus={1}
        requireCompleteConfig={true}
        className='w-full'
      />
      {/* Anfitrionas */}
      <HostessSelect
        anfitrionas={anfitrionas}
        value={formData.usuarios}
        onChange={value => {
          setFormData(prev => ({ ...prev, usuarios: value }));
        }}
        label='ANFITRIONAS'
        placeholder='Seleccionar anfitrionas'
        required={true}
        maxSelection={maxHostesses}
        className='w-full'
      />
      {/* Clientes */}
      <CustomersSelect
        clientes={clientes}
        value={formData.clientes}
        onChange={value => {
          setFormData(prev => ({ ...prev, clientes: value }));
        }}
        label='CLIENTES'
        placeholder='Seleccionar cliente(s)'
        maxSelection={maxClients}
        className='w-full'
      />
    </div>
  );
});
