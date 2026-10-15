'use client';

import React, { useMemo } from 'react';
import { Users } from 'lucide-react';
import { MultiEntitySelect } from './MultiEntitySelect';

interface Hostess {
  id_usuario?: string | number;
  id?: string | number;
  nombre?: string;
  name?: string;
  apellido?: string;
  lastName?: string;
  nick?: string;
  estado_servicio?: number;
}

interface HostessSelectProps {
  anfitrionas: Hostess[];
  value: string[];
  onChange: (value: string[]) => void;
  label?: string;
  placeholder?: string;
  searchPlaceholder?: string;
  className?: string;
  required?: boolean;
  maxSelection?: number;
  disabled?: boolean;
  disabledReason?: string;
  allowedOccupiedIds?: string[];
  showAvailability?: boolean;
  showOccupied?: boolean;
}

const HostessSelect: React.FC<HostessSelectProps> = ({
  anfitrionas,
  value,
  onChange,
  label = 'Anfitriona(s)',
  placeholder = 'Seleccione anfitriona(s)',
  searchPlaceholder = 'Buscar anfitriona...',
  className = '',
  required = false,
  maxSelection = 5,
  disabled = false,
  disabledReason,
  allowedOccupiedIds = [],
  showAvailability = false,
  showOccupied = false
}) => {
  const normalizedHostesses = useMemo(() => {
    if (!Array.isArray(anfitrionas)) return [];

    return anfitrionas
      .map(a => {
        const id = String(a.id_usuario ?? a.id ?? '');
        const nombre = a.nombre || a.name || '';
        const apellido = a.apellido || a.lastName || '';
        const labelText = a.nick || `${nombre} ${apellido}`.trim() || 'Sin nombre';

        return {
          id,
          label: labelText,
          extraLabel: showAvailability
            ? allowedOccupiedIds.includes(id)
              ? 'En este servicio'
              : Number(a.estado_servicio) === 1
                ? 'Ocupada'
                : 'Libre'
            : undefined,
          disabled: Number(a.estado_servicio) === 1 && !allowedOccupiedIds.includes(id)
        };
      })
      .filter(item => item.id !== '' && (!showAvailability || showOccupied || !item.disabled));
  }, [anfitrionas, allowedOccupiedIds, showAvailability, showOccupied]);

  return (
    <MultiEntitySelect
      items={normalizedHostesses}
      value={value}
      onChange={onChange}
      label={label}
      placeholder={placeholder}
      searchPlaceholder={searchPlaceholder}
      className={className}
      required={required}
      maxSelection={maxSelection}
      disabled={disabled}
      disabledReason={disabledReason}
      icon={<Users className='w-4 h-4 text-gray-400 shrink-0' />}
      emptyState='No hay anfitrionas disponibles'
      selectedCounterLabel='Seleccionadas'
    />
  );
};

export default HostessSelect;
