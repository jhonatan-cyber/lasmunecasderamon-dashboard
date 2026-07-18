'use client';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { Users } from 'lucide-react';
import { Input } from '@/components/ui/input';
import React, { useState, useMemo } from 'react';
import {
  ORDER_FIELD_POPOVER_CLASS,
  ORDER_FIELD_SEARCH_INPUT_CLASS,
  ORDER_FIELD_SEARCH_WRAPPER_CLASS,
  ORDER_FIELD_TRIGGER_CLASS
} from '@/components/orders/orderFieldStyles';

interface Hostess {
  id_usuario?: number;
  id?: number;
  nombre?: string;
  name?: string;
  apellido?: string;
  lastName?: string;
  nick?: string;
}

interface IndividualHostessSelectProps {
  anfitrionas: Hostess[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  className?: string;
  disabled?: boolean;
}

const IndividualHostessSelect: React.FC<IndividualHostessSelectProps> = ({
  anfitrionas,
  value,
  onChange,
  placeholder = 'Seleccionar anfitriona',
  searchPlaceholder = 'Buscar anfitriona...',
  className = '',
  disabled = false
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredAnfitrionas = useMemo(() => {
    if (!searchTerm) return anfitrionas;

    return anfitrionas.filter(anfitriona => {
      const nombre = anfitriona?.nombre || anfitriona?.name || '';
      const apellido = anfitriona?.apellido || anfitriona?.lastName || '';
      const nick = anfitriona?.nick || '';
      const searchLower = searchTerm.toLowerCase();

      return (
        nombre.toLowerCase().includes(searchLower) ||
        apellido.toLowerCase().includes(searchLower) ||
        nick.toLowerCase().includes(searchLower)
      );
    });
  }, [anfitrionas, searchTerm]);

  const getHostessId = (anfitriona: Hostess) => {
    return anfitriona?.id_usuario || anfitriona?.id;
  };

  const getHostessDisplayName = (anfitriona: Hostess) => {
    const nombre = anfitriona?.nombre || anfitriona?.name || '';
    const apellido = anfitriona?.apellido || anfitriona?.lastName || '';
    const nick = anfitriona?.nick || '';

    if (nick) return nick;
    return `${nombre} ${apellido}`.trim();
  };

  return (
    <div className={`flex flex-col ${className}`}>
      <div className='relative'>
        <span className='absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none z-10'>
          <Users className='w-4 h-4' />
        </span>
        <Select value={value || ''} onValueChange={onChange} disabled={disabled}>
          <SelectTrigger
            className={`${ORDER_FIELD_TRIGGER_CLASS} pl-10 justify-center`}
            disabled={disabled}
          >
            <SelectValue placeholder={placeholder} />
          </SelectTrigger>
          <SelectContent className={`${ORDER_FIELD_POPOVER_CLASS} max-h-80`}>
            {}
            <div className={ORDER_FIELD_SEARCH_WRAPPER_CLASS}>
              <Input
                placeholder={searchPlaceholder}
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className={ORDER_FIELD_SEARCH_INPUT_CLASS}
                disabled={disabled}
              />
            </div>

            {}
            <div className='max-h-60 overflow-y-auto'>
              {filteredAnfitrionas.length === 0 ? (
                <div className='p-2 text-center text-gray-500 text-sm'>
                  {searchTerm ? 'No se encontraron anfitrionas' : 'No hay anfitrionas disponibles'}
                </div>
              ) : (
                filteredAnfitrionas.map(anfitriona => {
                  const id = getHostessId(anfitriona);
                  const displayName = getHostessDisplayName(anfitriona);

                  return (
                    <SelectItem
                      key={id}
                      value={id ? id.toString() : ''}
                      disabled={disabled}
                      className='justify-center text-center'
                    >
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

export default IndividualHostessSelect;
