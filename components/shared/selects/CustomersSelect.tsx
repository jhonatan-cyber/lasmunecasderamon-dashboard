import React, { useMemo } from 'react';
import { Users } from 'lucide-react';
import { MultiEntitySelect } from './MultiEntitySelect';

interface Customer {
  id_cliente?: string | number;
  id?: string | number;
  nombre?: string;
  name?: string;
  apellido?: string;
  lastName?: string;
  run?: string;
}

interface CustomersSelectProps {
  clientes: Customer[];
  value: string[];
  onChange: (value: string[]) => void;
  label?: string;
  placeholder?: string;
  searchPlaceholder?: string;
  className?: string;
  required?: boolean;
  maxSelection?: number;
  disabled?: boolean;
}

const DEFAULT_CLIENTS: Customer[] = [];
const DEFAULT_VALUES: string[] = [];

const CustomersSelect = ({
  clientes = DEFAULT_CLIENTS,
  value = DEFAULT_VALUES,
  onChange,
  label = 'Cliente(s)',
  placeholder = 'Seleccione cliente(s)',
  searchPlaceholder = 'Buscar cliente...',
  className = '',
  required = false,
  maxSelection = 4,
  disabled = false
}: CustomersSelectProps) => {
  const normalizedClientes = useMemo(() => {
    if (!clientes || !Array.isArray(clientes)) return [];

    return clientes
      .map(c => {
        const id = String(c.id ?? c.id_cliente ?? '');
        const name = `${c.name ?? c.nombre ?? ''} ${c.lastName ?? c.apellido ?? ''}`.trim() || 'Sin nombre';
        return { id, label: name, extraLabel: c.run || '' };
      })
      .filter(c => c.id !== '');
  }, [clientes]);

  return (
    <MultiEntitySelect
      items={normalizedClientes}
      value={value}
      onChange={onChange}
      label={label}
      placeholder={placeholder}
      searchPlaceholder={searchPlaceholder}
      className={className}
      required={required}
      maxSelection={maxSelection}
      disabled={disabled}
      icon={<Users className='w-4 h-4 text-gray-400 shrink-0' />}
      emptyState='No hay clientes disponibles'
      selectedCounterLabel='Seleccionados'
    />
  );
};

export default CustomersSelect;
