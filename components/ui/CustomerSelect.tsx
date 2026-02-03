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
  id_cliente?: number;
  id?: number;
  nombre?: string;
  name?: string;
  apellido?: string;
  lastName?: string;
  run?: string;
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

  // Filtrar clientes basado en el término de búsqueda y excluir genéricos
  const filteredClientes = useMemo(() => {
    let filtered = clientes;

    // Excluir clientes genéricos
    filtered = filtered.filter(cliente => {
      const nombre = cliente?.nombre || cliente?.name || '';
      const apellido = cliente?.apellido || cliente?.lastName || '';
      const fullName = `${nombre} ${apellido}`.toLowerCase();

      return !fullName.includes('genérico') && !fullName.includes('generico');
    });

    // Filtrar por término de búsqueda
    if (!searchTerm) return filtered;

    return filtered.filter(cliente => {
      const nombre = cliente?.nombre || cliente?.name || '';
      const apellido = cliente?.apellido || cliente?.lastName || '';
      const searchLower = searchTerm.toLowerCase();

      return (
        nombre.toLowerCase().includes(searchLower) || apellido.toLowerCase().includes(searchLower)
      );
    });
  }, [clientes, searchTerm]);

  const getCustomerId = (cliente: Customer) => {
    return cliente?.id_cliente || cliente?.id;
  };

  const getCustomerDisplayName = (cliente: Customer) => {
    const nombre = cliente?.nombre || cliente?.name || '';
    const apellido = cliente?.apellido || cliente?.lastName || '';
    const run = cliente?.run || '';
    const displayName = `${nombre} ${apellido}`.trim();
    return run ? `${displayName} (${run})` : displayName;
  };

  return (
    <div className={`flex flex-col ${className}`}>
      <Label className='block text-xs font-medium text-gray-500 mb-1'>
        <Users className='inline mr-1 w-4 h-4' />
        {label}
        {required && <span className='text-red-500'>*</span>}
      </Label>

      <div className='relative'>
        <span className='absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none z-10'>
          <Users className='w-4 h-4' />
        </span>
        <Select value={value || ''} onValueChange={onChange || (() => {})} disabled={disabled}>
          <SelectTrigger className='w-full pl-10 rounded-full' disabled={disabled}>
            <SelectValue placeholder={placeholder} />
          </SelectTrigger>
          <SelectContent className='max-h-80'>
            {/* Barra de búsqueda */}
            <div className='p-2 border-b'>
              <Input
                placeholder={searchPlaceholder}
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className='w-full'
                disabled={disabled}
              />
            </div>

            {/* Lista de clientes */}
            <div className='max-h-60 overflow-y-auto'>
              {!searchTerm && (
                <SelectItem value='none'>
                  <span className='text-gray-400 italic'>Sin cliente</span>
                </SelectItem>
              )}
              {filteredClientes.length === 0 ? (
                <div className='p-2 text-center text-gray-500 text-sm'>
                  {searchTerm ? 'No se encontraron clientes' : 'No hay clientes disponibles'}
                </div>
              ) : (
                filteredClientes.map(cliente => {
                  const id = getCustomerId(cliente);
                  const displayName = getCustomerDisplayName(cliente);

                  return (
                    <SelectItem key={id} value={id ? id.toString() : 'none'} disabled={disabled}>
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
