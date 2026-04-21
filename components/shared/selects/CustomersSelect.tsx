import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import React, { useState, useMemo } from 'react';
import {
  ORDER_FIELD_LABEL_CLASS,
  ORDER_FIELD_POPOVER_CLASS,
  ORDER_FIELD_SEARCH_INPUT_CLASS,
  ORDER_FIELD_SEARCH_WRAPPER_CLASS,
  ORDER_MULTISELECT_TRIGGER_CLASS,
  ORDER_SELECTED_TAG_CLASS
} from '@/components/orders/orderFieldStyles';

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
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Normalize client data to have id and name
  const normalizedClientes = useMemo(() => {
    if (!clientes || !Array.isArray(clientes)) return [];
    return clientes
      .map(c => ({
        id: String(c.id ?? c.id_cliente ?? ''),
        name: `${c.name ?? c.nombre ?? ''} ${c.lastName ?? c.apellido ?? ''}`.trim() || 'Sin nombre'
      }))
      .filter(c => c.id !== '');
  }, [clientes]);

  const filteredClientes = useMemo(() => {
    if (!searchTerm) return normalizedClientes;
    const lowerSearch = searchTerm.toLowerCase();
    return normalizedClientes.filter(
      c => c.name.toLowerCase().includes(lowerSearch) || c.id.includes(lowerSearch)
    );
  }, [normalizedClientes, searchTerm]);

  const handleToggle = (id: string) => {
    const newValue = value.includes(id)
      ? value.filter(v => v !== id)
      : value.length < maxSelection
        ? [...value, id]
        : value;

    onChange(newValue);
  };

  const selectedNames = normalizedClientes.filter(c => value.includes(c.id)).map(c => c.name);

  const uniqueId = React.useId();

  return (
    <div className={`flex flex-col ${className}`}>
      <Label
        htmlFor={uniqueId}
        className={ORDER_FIELD_LABEL_CLASS}
      >
        {label}
        {required && <span className='text-red-500 ml-0.5'>*</span>}
      </Label>

      <div className='relative'>
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <button
              id={uniqueId}
              type='button'
              className={`${ORDER_MULTISELECT_TRIGGER_CLASS} pr-10`}
              onClick={() => !disabled && setOpen(!open)}
              disabled={disabled}
            >
              {value.length === 0 ? (
                <span className='text-gray-400 text-sm'>{placeholder}</span>
              ) : (
                <span className='flex flex-wrap gap-1'>
                  {selectedNames.map((name, i) => (
                    <span
                      key={i}
                      className={ORDER_SELECTED_TAG_CLASS}
                    >
                      {name}
                    </span>
                  ))}
                </span>
              )}
              <span className='ml-auto pl-2 text-gray-400 text-xs'>▼</span>
            </button>
          </PopoverTrigger>
          <PopoverContent
            align='start'
            className={ORDER_FIELD_POPOVER_CLASS}
            sideOffset={5}
          >
            <div className={ORDER_FIELD_SEARCH_WRAPPER_CLASS}>
              <label htmlFor={`${uniqueId}-search`} className='sr-only'>
                Buscar cliente
              </label>
              <Input
                id={`${uniqueId}-search`}
                placeholder={searchPlaceholder}
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className={ORDER_FIELD_SEARCH_INPUT_CLASS}
              />
            </div>
            <div className='max-h-60 overflow-y-auto p-1'>
              {filteredClientes.length === 0 ? (
                <div className='p-4 text-center text-gray-500 text-sm'>
                  {searchTerm ? 'No se encontraron resultados' : 'No hay clientes disponibles'}
                </div>
              ) : (
                filteredClientes.map(cliente => (
                  <label
                    key={cliente.id}
                    className={`flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-gray-100 rounded-md transition-colors ${
                      !value.includes(cliente.id) && value.length >= maxSelection
                        ? 'opacity-50 cursor-not-allowed'
                        : ''
                    }`}
                  >
                    <Checkbox
                      checked={value.includes(cliente.id)}
                      onCheckedChange={() => handleToggle(cliente.id)}
                      disabled={!value.includes(cliente.id) && value.length >= maxSelection}
                    />
                    <span className='text-sm text-gray-700'>{cliente.name}</span>
                  </label>
                ))
              )}
            </div>
            {maxSelection > 1 && (
              <div className='p-2 border-t bg-gray-50 text-[10px] text-gray-400 text-center uppercase tracking-wider font-semibold'>
                Seleccionados: {value.length} / Máximo: {maxSelection}
              </div>
            )}
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
};

export default CustomersSelect;
