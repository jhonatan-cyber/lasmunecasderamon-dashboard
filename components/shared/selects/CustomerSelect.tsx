import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Users } from 'lucide-react';
import { Input } from '@/components/ui/input';
import React, { useState, useMemo } from 'react';

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
  const [searchTerm, setSearchTerm] = useState('');
  const getCustomerId = (cliente: Customer) => {
    return cliente?.id_cliente || cliente?.id;
  };

  const getCustomerDisplayName = (cliente: Customer) => {
    const nombre = cliente?.nombre || cliente?.name || '';
    const apellido = cliente?.apellido || cliente?.lastName || '';
    const run = cliente?.run || '';
    const saldo = cliente?.saldo ?? 0;
    const displayName = `${nombre} ${apellido}`.trim();
    const balanceText = saldo > 0 ? ` - Saldo: $${saldo.toLocaleString('es-CL')}` : '';
    return run ? `${displayName} (${run})${balanceText}` : `${displayName}${balanceText}`;
  };

  const filteredClientes = useMemo(() => {
    let base = Array.isArray(clientes) ? clientes : [];

    base = base.filter(cliente => {
      const nombre = cliente?.nombre || cliente?.name || '';
      const apellido = cliente?.apellido || cliente?.lastName || '';
      const fullName = `${nombre} ${apellido}`.toLowerCase();
      return !fullName.includes('genÃ©rico') && !fullName.includes('generico');
    });

    if (!searchTerm) return base;

    const searchLower = searchTerm.toLowerCase();
    return base.filter(cliente => {
      const nombre = (cliente?.nombre || cliente?.name || '').toLowerCase();
      const apellido = (cliente?.apellido || cliente?.lastName || '').toLowerCase();
      const run = (cliente?.run || '').toLowerCase();

      return (
        nombre.includes(searchLower) || apellido.includes(searchLower) || run.includes(searchLower)
      );
    });
  }, [clientes, searchTerm]);

  const displayClientes = useMemo(() => {
    if (!value || value === 'none') return filteredClientes;

    const isSelectedInFiltered = filteredClientes.some(c => {
      const id = getCustomerId(c);
      return id && id.toString() === value;
    });

    if (isSelectedInFiltered) return filteredClientes;

    const selectedClient = (Array.isArray(clientes) ? clientes : []).find(c => {
      const id = getCustomerId(c);
      return id && id.toString() === value;
    });

    return selectedClient ? [selectedClient, ...filteredClientes] : filteredClientes;
  }, [filteredClientes, value, clientes]);

  return (
    <div className={`flex flex-col ${className}`}>
      <Label className='block text-xs font-medium text-gray-500 mb-1 uppercase tracking-wide'>
        {label}
        {required && <span className='text-red-500 ml-1'>*</span>}
      </Label>

      <div className='relative'>
        <Select
          value={value || ''}
          onValueChange={(val: string) => {
            onChange(val);
            setSearchTerm('');
          }}
          disabled={disabled}
        >
          <SelectTrigger
            className='w-full pl-10 rounded-full bg-gray-100 dark:bg-slate-900/50 border border-gray-300 dark:border-gray-700 h-11'
            disabled={disabled}
          >
            <SelectValue placeholder={placeholder} />
          </SelectTrigger>
          <SelectContent className='max-h-80'>
            {/* Barra de bÃºsqueda */}
            <div className='p-2 border-b sticky top-0 bg-white z-20'>
              <Input
                placeholder={searchPlaceholder}
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                onKeyDown={e => {
                  if (e.key === ' ') {
                    e.stopPropagation();
                  }
                }}
                className='w-full'
                disabled={disabled}
              />
            </div>

            {/* Lista de clientes */}
            <div className='overflow-y-auto'>
              {!searchTerm && (
                <SelectItem value='none'>
                  <span className='text-gray-400 italic'>Sin cliente</span>
                </SelectItem>
              )}
              {displayClientes.length === 0 ? (
                <div className='p-4 text-center text-gray-500 text-sm'>
                  {searchTerm ? 'No se encontraron clientes' : 'No hay clientes disponibles'}
                </div>
              ) : (
                displayClientes.map(cliente => {
                  const id = getCustomerId(cliente);
                  const displayName = getCustomerDisplayName(cliente);
                  const stringId = id ? id.toString() : 'none';

                  return (
                    <SelectItem key={`${stringId}`} value={stringId} disabled={disabled}>
                      {displayName || 'Sin nombre'}
                    </SelectItem>
                  );
                })
              )}
            </div>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
};

export default CustomerSelect;
