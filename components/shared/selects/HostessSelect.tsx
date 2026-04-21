import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import React, { useState, useMemo } from 'react';
import {
  ORDER_FIELD_LABEL_CLASS,
  ORDER_FIELD_POPOVER_CLASS,
  ORDER_FIELD_SEARCH_INPUT_CLASS,
  ORDER_FIELD_SEARCH_WRAPPER_CLASS,
  ORDER_MULTISELECT_TRIGGER_CLASS,
  ORDER_SELECTED_TAG_CLASS
} from '@/components/orders/orderFieldStyles';

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
  disabledReason
}) => {
  const [open, setOpen] = useState(false);
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

  const getHostessName = (anfitriona: Hostess) => {
    const nombre = anfitriona?.nombre || anfitriona?.name || '';
    const apellido = anfitriona?.apellido || anfitriona?.lastName || '';
    const nick = anfitriona?.nick || '';

    if (nick) return nick;
    return `${nombre} ${apellido}`.trim();
  };

  const handleToggleHostess = (id: string) => {
    const next = value.includes(id)
      ? value.filter(x => x !== id)
      : value.length < maxSelection
        ? [...value, id]
        : value;

    onChange(next);
  };

  const selectedHostesses = anfitrionas.filter(a => value.includes(String(getHostessId(a))));
  const uniqueId = React.useId();
  const showTooltip = Boolean(disabledReason);
  const disabledState = disabled || showTooltip;

  const selectButton = (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          id={uniqueId}
          type='button'
          className={ORDER_MULTISELECT_TRIGGER_CLASS}
          onClick={() => !disabledState && setOpen(v => !v)}
          disabled={disabledState}
        >
          {value.length === 0 ? (
            <span className='text-gray-400'>{placeholder}</span>
          ) : (
            <span className='flex flex-wrap gap-1'>
              {selectedHostesses.map((a, index) => (
                <span
                  key={`${getHostessId(a)}-${index}`}
                  className={ORDER_SELECTED_TAG_CLASS}
                >
                  {getHostessName(a)}
                </span>
              ))}
            </span>
          )}
        </button>
      </PopoverTrigger>
      {!disabledState && (
        <PopoverContent align='start' className={ORDER_FIELD_POPOVER_CLASS}>
          <div className={ORDER_FIELD_SEARCH_WRAPPER_CLASS}>
            <label htmlFor={`${uniqueId}-search`} className='sr-only'>
              Buscar anfitriona
            </label>
            <Input
              id={`${uniqueId}-search`}
              placeholder={searchPlaceholder}
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className={ORDER_FIELD_SEARCH_INPUT_CLASS}
            />
          </div>
          <div className='max-h-60 overflow-y-auto'>
            {filteredAnfitrionas.length === 0 ? (
              <div className='p-2 text-center text-gray-500 text-sm'>
                {searchTerm ? 'No se encontraron anfitrionas' : 'No hay anfitrionas disponibles'}
              </div>
            ) : (
              filteredAnfitrionas.map((anfitriona, index) => {
                const id = String(getHostessId(anfitriona));
                const name = getHostessName(anfitriona);
                const isSelected = value.includes(id);
                const isOcupada = Number(anfitriona.estado_servicio) === 1;
                const isDisabled = (!isSelected && value.length >= maxSelection) || isOcupada;
                return (
                  <label
                    key={`${id}-${index}`}
                    className={`flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-gray-50 rounded transition-colors ${
                      isDisabled ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                  >
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => handleToggleHostess(id)}
                      disabled={isDisabled}
                    />
                    <div className='flex flex-col'>
                      <span className={isOcupada ? 'text-gray-400' : 'text-sm'}>
                        {name || 'Sin nombre'}
                      </span>
                      {isOcupada && (
                        <span className='text-xs text-red-500 font-medium'>OCUPADA</span>
                      )}
                    </div>
                  </label>
                );
              })
            )}
          </div>
          {maxSelection > 1 && (
            <div className='p-2 border-t bg-gray-50 text-xs text-gray-500'>
              Seleccionadas: {value.length} / Máximo: {maxSelection}
            </div>
          )}
        </PopoverContent>
      )}
    </Popover>
  );

  return (
    <div className={`flex flex-col ${className}`}>
      <Label className={ORDER_FIELD_LABEL_CLASS}>
        {label}
        {required && <span className='text-red-500 ml-1'>*</span>}
      </Label>

      <div className='relative'>
        {showTooltip ? (
          <TooltipProvider>
            <Tooltip delayDuration={300}>
              <TooltipTrigger asChild>
                <div className='w-full'>{selectButton}</div>
              </TooltipTrigger>
              <TooltipContent className='bg-black text-white dark:bg-white dark:text-black rounded-xl border-none text-xs font-bold px-3 py-1.5 shadow-xl'>
                <p>{disabledReason}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ) : (
          selectButton
        )}
      </div>
    </div>
  );
};

export default HostessSelect;
