import React, { useMemo, useState } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Home } from 'lucide-react';
import { formatCurrencyCLP } from '@/lib/utils/formatters';
import {
  ORDER_FIELD_LABEL_CLASS,
  ORDER_FIELD_POPOVER_CLASS,
  ORDER_FIELD_SEARCH_INPUT_CLASS,
  ORDER_FIELD_SEARCH_WRAPPER_CLASS,
  ORDER_MULTISELECT_TRIGGER_CLASS
} from '@/components/orders/orderFieldStyles';

interface Habitacion {
  id_habitacion?: string | number;
  id?: string | number;
  nombre?: string;
  name?: string;
  numero?: string;
  precio?: number;
  price?: number;
  tiempo?: number;
  time?: number;
  estado?: number;
  status?: number;
}

interface RoomSelectProps {
  habitaciones?: Habitacion[];
  value: string;
  onChange: (value: string) => void;
  label?: string;
  placeholder?: string;
  searchPlaceholder?: string;
  className?: string;
  required?: boolean;
  disabled?: boolean;
  disabledReason?: string;
  showPrice?: boolean;
  showTime?: boolean;
  filterByStatus?: number;
  includeRoomIds?: Array<string>;
}

const RoomSelect: React.FC<RoomSelectProps> = ({
  habitaciones,
  value,
  onChange,
  label = 'Habitación',
  placeholder = 'Seleccione una habitación',
  searchPlaceholder = 'Buscar habitación...',
  className = '',
  required = false,
  disabled = false,
  disabledReason,
  showPrice = false,
  showTime = false,
  filterByStatus,
  includeRoomIds = []
}) => {
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const uniqueId = React.useId();

  const getHabitacionId = (habitacion: Habitacion) => {
    return habitacion?.id_habitacion || habitacion?.id;
  };

  const formatTime = (min: number) => {
    if (!min || isNaN(min)) return '';
    if (min % 60 === 0) return `${min / 60} horas`;
    if (min < 60) return `${min} min`;
    return `${Math.floor(min / 60)}h ${min % 60}m`;
  };

  const formatPrice = (price: number) => {
    if (!price || isNaN(price)) return '';
    return formatCurrencyCLP(price);
  };

  const getHabitacionDisplayName = (habitacion: Habitacion) => {
    const nombre = habitacion?.nombre || habitacion?.name || '';
    const numero = habitacion?.numero || '';
    const displayName = nombre || numero;

    let result = displayName;

    if (showTime && (habitacion.tiempo || habitacion.time)) {
      const tiempo = habitacion.tiempo || habitacion.time || 0;
      result += ` (${formatTime(tiempo)})`;
    }

    if (showPrice && (habitacion.precio || habitacion.price)) {
      const precio = habitacion.precio || habitacion.price || 0;
      result += ` - ${formatPrice(precio)}`;
    }

    return result;
  };

  const filteredHabitaciones = useMemo(() => {
    if (!Array.isArray(habitaciones)) {
      return [];
    }

    let filtered = habitaciones;

    if (filterByStatus !== undefined) {
      filtered = filtered.filter(habitacion => {
        const id = habitacion.id_habitacion || habitacion.id;
        const estado = habitacion.estado || habitacion.status;

        return (
          estado === filterByStatus ||
          (id !== undefined && includeRoomIds.some(roomId => String(roomId) === String(id)))
        );
      });
    }

    if (!searchTerm) return filtered;

    return filtered.filter(habitacion => {
      const nombre = (habitacion.nombre || habitacion.name || '').toLowerCase();
      const numero = (habitacion.numero || '').toLowerCase();
      const searchLower = searchTerm.toLowerCase();

      return nombre.includes(searchLower) || numero.includes(searchLower);
    });
  }, [habitaciones, searchTerm, filterByStatus, includeRoomIds]);

  const displayHabitaciones = (() => {
    if (!value) return filteredHabitaciones;

    const isSelectedInFiltered = filteredHabitaciones.some(habitacion => {
      const id = getHabitacionId(habitacion);
      return id && id.toString() === value;
    });

    if (isSelectedInFiltered) return filteredHabitaciones;

    const selectedHabitacion = (Array.isArray(habitaciones) ? habitaciones : []).find(
      habitacion => {
        const id = getHabitacionId(habitacion);
        return id && id.toString() === value;
      }
    );

    return selectedHabitacion
      ? [selectedHabitacion, ...filteredHabitaciones]
      : filteredHabitaciones;
  })();

  const selectedHabitacion = (Array.isArray(habitaciones) ? habitaciones : []).find(habitacion => {
    const id = getHabitacionId(habitacion);
    return id && id.toString() === value;
  });

  const selectedLabel = selectedHabitacion ? getHabitacionDisplayName(selectedHabitacion) : '';

  const handleValueChange = (newValue: string) => {
    const resolved = newValue === '__none__' ? '' : newValue;
    setSearchTerm('');
    setOpen(false);
    onChange(resolved);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation();
    setSearchTerm(e.target.value);
  };

  const showTooltip = Boolean(disabledReason);
  const disabledState = disabled || showTooltip;

  const selectNode = (
    <Popover open={open} onOpenChange={nextOpen => !disabledState && setOpen(nextOpen)}>
      <PopoverTrigger asChild>
        <button
          id={uniqueId}
          type='button'
          className={`${ORDER_MULTISELECT_TRIGGER_CLASS} flex items-center gap-2 pr-10`}
          onClick={() => !disabledState && setOpen(!open)}
          disabled={disabledState}
        >
          <Home className='w-4 h-4 text-gray-400 shrink-0' />
          {selectedLabel ? (
            <span className='truncate text-sm text-gray-900 dark:text-white'>{selectedLabel}</span>
          ) : (
            <span className='text-gray-400 text-sm truncate'>{placeholder}</span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align='start' className={ORDER_FIELD_POPOVER_CLASS} sideOffset={5}>
        <div className={ORDER_FIELD_SEARCH_WRAPPER_CLASS}>
          <label htmlFor={`${uniqueId}-search`} className='sr-only'>
            Buscar habitación
          </label>
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
            className={ORDER_FIELD_SEARCH_INPUT_CLASS}
            disabled={disabledState}
            onClick={e => e.stopPropagation()}
          />
        </div>

        <div className='max-h-60 overflow-y-auto p-1'>
          {value && (
            <button
              type='button'
              className='flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm text-gray-400 italic transition-colors hover:bg-gray-100'
              onClick={() => handleValueChange('__none__')}
            >
              Sin habitación
            </button>
          )}

          {displayHabitaciones.length === 0 ? (
            <div className='p-2 text-center text-gray-500 text-sm'>
              {searchTerm ? 'No se encontraron habitaciones' : 'No hay habitaciones disponibles'}
            </div>
          ) : (
            displayHabitaciones.map(habitacion => {
              const id = getHabitacionId(habitacion);
              const displayName = getHabitacionDisplayName(habitacion);
              const estado = habitacion.estado || habitacion.status;
              const isOcupada = estado === 2;
              const isItemDisabled = disabledState || isOcupada;
              const stringId = id ? id.toString() : '';
              const isSelected = stringId === value;

              return (
                <button
                  key={stringId}
                  type='button'
                  className={`flex w-full items-center justify-between gap-2 rounded-md px-3 py-2 text-left text-sm transition-colors ${
                    isItemDisabled ? 'cursor-not-allowed opacity-50' : 'hover:bg-gray-100'
                  } ${isSelected ? 'bg-gray-100' : ''}`}
                  onClick={() => !isItemDisabled && handleValueChange(stringId)}
                  disabled={isItemDisabled}
                >
                  <span className={isOcupada ? 'text-gray-400' : 'text-gray-700'}>
                    {displayName || 'Sin nombre'}
                  </span>
                  {isOcupada ? (
                    <span className='text-xs font-medium text-red-500'>OCUPADA</span>
                  ) : isSelected ? (
                    <span className='text-xs font-semibold text-gray-500'>SELECCIONADA</span>
                  ) : null}
                </button>
              );
            })
          )}
        </div>
      </PopoverContent>
    </Popover>
  );

  return (
    <div className={`flex flex-col ${className}`}>
      <Label htmlFor={uniqueId} className={ORDER_FIELD_LABEL_CLASS}>
        {label}
        {required && <span className='text-red-500'>*</span>}
      </Label>

      <div className='relative'>
        {showTooltip ? (
          <TooltipProvider>
            <Tooltip delayDuration={300}>
              <TooltipTrigger asChild>
                <div className='w-full'>{selectNode}</div>
              </TooltipTrigger>
              <TooltipContent className='bg-black text-white dark:bg-white dark:text-black rounded-xl border-none text-xs font-bold px-3 py-1.5 shadow-xl'>
                <p>{disabledReason}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ) : (
          selectNode
        )}
      </div>
    </div>
  );
};

export default RoomSelect;
