'use client';
import { Button } from '@/components/ui/button';

import React, { useMemo, useState } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { User } from 'lucide-react';
import {
  SELECT_LABEL_CLASS,
  SELECT_CONTENT_WIDE_CLASS,
  SELECT_SEARCH_INPUT_CLASS,
  SELECT_SEARCH_WRAPPER_CLASS,
  SELECT_MULTI_TRIGGER_CLASS
} from '@/components/shared/selectStyles';

interface Customer {
  id_cliente?: string | number;
  id?: string | number;
  nombre?: string;
  name?: string;
  apellido?: string;
  lastName?: string;
  run?: string;
  saldo?: number;
}

interface CustomerSelectProps {
  clientes: Customer[];
  value: string;
  onChange: (value: string) => void;
  label?: string;
  placeholder?: string;
  searchPlaceholder?: string;
  className?: string;
  required?: boolean;
  disabled?: boolean;
}

const CustomerSelect: React.FC<CustomerSelectProps> = ({
  clientes,
  value,
  onChange,
  label = 'Cliente',
  placeholder = 'Seleccione un cliente',
  searchPlaceholder = 'Buscar cliente...',
  className = '',
  required = false,
  disabled = false
}) => {
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const uniqueId = React.useId();

  const getCustomerId = (cliente: Customer) => {
    return cliente?.id_cliente || cliente?.id;
  };

  const getCustomerDisplayName = (cliente: Customer) => {
    const nombre = cliente?.nombre || cliente?.name || '';
    const apellido = cliente?.apellido || cliente?.lastName || '';
    const saldo = cliente?.saldo ?? 0;
    const displayName = `${nombre} ${apellido}`.trim();
    const balanceText = saldo > 0 ? ` - Prepago: $${saldo.toLocaleString('es-CL')}` : '';
    return `${displayName}${balanceText}`;
  };

  const normalizedClientes = useMemo(() => {
    let base = Array.isArray(clientes) ? clientes : [];

    base = base.filter(cliente => {
      const nombre = cliente?.nombre || cliente?.name || '';
      const apellido = cliente?.apellido || cliente?.lastName || '';
      const fullName = `${nombre} ${apellido}`.toLowerCase();
      return !fullName.includes('gen?rico') && !fullName.includes('generico');
    });

    return base;
  }, [clientes]);

  const filteredClientes = useMemo(() => {
    if (!searchTerm) return normalizedClientes;

    const searchLower = searchTerm.toLowerCase();
    return normalizedClientes.filter(cliente => {
      const nombre = (cliente?.nombre || cliente?.name || '').toLowerCase();
      const apellido = (cliente?.apellido || cliente?.lastName || '').toLowerCase();
      const run = (cliente?.run || '').toLowerCase();

      return (
        nombre.includes(searchLower) || apellido.includes(searchLower) || run.includes(searchLower)
      );
    });
  }, [normalizedClientes, searchTerm]);

  const displayClientes = (() => {
    if (!value || value === 'none') return filteredClientes;

    const isSelectedInFiltered = filteredClientes.some(cliente => {
      const id = getCustomerId(cliente);
      return id && id.toString() === value;
    });

    if (isSelectedInFiltered) return filteredClientes;

    const selectedClient = normalizedClientes.find(cliente => {
      const id = getCustomerId(cliente);
      return id && id.toString() === value;
    });

    return selectedClient ? [selectedClient, ...filteredClientes] : filteredClientes;
  })();

  const selectedClient = normalizedClientes.find(cliente => {
    const id = getCustomerId(cliente);
    return id && id.toString() === value;
  });

  const selectedLabel = selectedClient ? getCustomerDisplayName(selectedClient) : '';

  const handleValueChange = (newValue: string) => {
    const resolved = newValue === 'none' ? '' : newValue;
    setSearchTerm('');
    setOpen(false);
    onChange(resolved);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation();
    setSearchTerm(e.target.value);
  };

  return (
    <div className={`flex flex-col ${className}`}>
      <Label htmlFor={uniqueId} className={SELECT_LABEL_CLASS}>
        {label}
        {required && <span className='ml-1 text-red-500'>*</span>}
      </Label>

      <div className='relative'>
        <Popover open={open} onOpenChange={nextOpen => !disabled && setOpen(nextOpen)}>
          <PopoverTrigger asChild>
            <Button
              variant='unstyled'
              id={uniqueId}
              type='button'
              className={`${SELECT_MULTI_TRIGGER_CLASS} flex items-center gap-2 pr-10`}
              onClick={() => !disabled && setOpen(!open)}
              disabled={disabled}
            >
              <User className='w-4 h-4 text-gray-400 shrink-0' />
              {selectedLabel ? (
                <span className='truncate text-sm text-gray-900 dark:text-white'>
                  {selectedLabel}
                </span>
              ) : (
                <span className='text-sm text-gray-400 truncate'>{placeholder}</span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent align='start' className={SELECT_CONTENT_WIDE_CLASS} sideOffset={5}>
            <div className={SELECT_SEARCH_WRAPPER_CLASS}>
              <Label htmlFor={`${uniqueId}-search`} className='sr-only'>
                Buscar cliente
              </Label>
              <Input
                id={`${uniqueId}-search`}
                placeholder={searchPlaceholder}
                value={searchTerm}
                onChange={handleSearchChange}
                onKeyDown={e => {
                  if (e.key === ' ') {
                    e.stopPropagation();
                  }
                }}
                className={SELECT_SEARCH_INPUT_CLASS}
                disabled={disabled}
                onClick={e => e.stopPropagation()}
              />
            </div>

            <div className='max-h-60 overflow-y-auto p-1'>
              {value && (
                <Button
                  variant='unstyled'
                  type='button'
                  className='flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm italic text-gray-400 transition-colors hover:bg-gray-100'
                  onClick={() => handleValueChange('none')}
                >
                  Sin cliente
                </Button>
              )}

              {displayClientes.length === 0 ? (
                <div className='p-4 text-center text-sm text-gray-500'>
                  {searchTerm ? 'No se encontraron clientes' : 'No hay clientes disponibles'}
                </div>
              ) : (
                displayClientes.map(cliente => {
                  const id = getCustomerId(cliente);
                  const displayName = getCustomerDisplayName(cliente);
                  const stringId = id ? id.toString() : 'none';
                  const isSelected = stringId === value;

                  return (
                    <Button
                      variant='unstyled'
                      key={stringId}
                      type='button'
                      className={`flex w-full items-center justify-between gap-2 rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-gray-100 ${isSelected ? 'bg-gray-100' : ''}`}
                      onClick={() => handleValueChange(stringId)}
                      disabled={disabled}
                    >
                      <span className='text-gray-700'>{displayName || 'Sin nombre'}</span>
                      {isSelected ? (
                        <span className='text-xs font-semibold text-gray-500'>SELECCIONADO</span>
                      ) : null}
                    </Button>
                  );
                })
              )}
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
};

export default CustomerSelect;
