'use client';

import { Users, ChevronDown } from 'lucide-react';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import SearchInput from '@/components/shared/SearchInput';
import React, { useRef, useState, useMemo } from 'react';
import {
  ORDER_FIELD_POPOVER_CLASS,
  ORDER_MULTISELECT_TRIGGER_CLASS,
  ORDER_SELECTED_TAG_CLASS
} from '@/components/orders/orderFieldStyles';

interface HostessMultiSelectProps {
  anfitrionas: any[];
  value: string[];
  onChange: (v: string[]) => void;
  searchValue: string;
  onSearchChange: (v: string) => void;
  maxSelection?: number;
}

const HostessMultiSelect: React.FC<HostessMultiSelectProps> = ({
  anfitrionas,
  value,
  onChange,
  searchValue,
  onSearchChange,
  maxSelection
}) => {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const hasReachedLimit = maxSelection ? value.length >= maxSelection : false;
  const anfitrionasUnicas = useMemo(() => {
    const porId = new Map<string, any>();
    for (const anfitriona of anfitrionas) {
      const id = String(anfitriona.id_usuario ?? anfitriona.id ?? '');
      if (id && !porId.has(id)) porId.set(id, anfitriona);
    }
    return [...porId.values()];
  }, [anfitrionas]);

  const searchQuery = searchValue.trim().toLowerCase();
  const visibles = searchQuery
    ? anfitrionasUnicas.filter(a =>
        `${a.nick || ''} ${a.nombre || a.name || ''} ${a.apellido || a.lastName || ''}`
          .toLowerCase()
          .includes(searchQuery)
      )
    : anfitrionasUnicas;

  return (
    <div className='flex-1 min-w-[200px]'>
      <div className='relative'>
        <Users className='absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none z-10 h-4 w-4' />
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <button
              ref={triggerRef}
              type='button'
              className={`${ORDER_MULTISELECT_TRIGGER_CLASS} flex items-center gap-2 pl-8 pr-3 text-left`}
              onClick={() => setOpen(v => !v)}
            >
              {value.length === 0 ? (
                <span className='min-w-0 flex-1 truncate text-sm text-gray-400'>
                  {maxSelection && maxSelection > 1
                    ? `Elegir (máx. ${maxSelection})`
                    : 'Elegir anfitriona'}
                </span>
              ) : (
                <span className='flex min-w-0 flex-1 flex-wrap items-center gap-1'>
                  {anfitrionasUnicas
                    .filter(a => value.includes(String(a.id_usuario || a.id)))
                    .map(a => (
                      <span key={a.id_usuario || a.id} className={ORDER_SELECTED_TAG_CLASS}>
                        {a.nick || a.nombre}
                      </span>
                    ))}
                  {maxSelection && (
                    <span className='text-xs text-gray-500 ml-1'>
                      ({value.length}/{maxSelection})
                    </span>
                  )}
                </span>
              )}
              <span className='shrink-0 text-gray-400'>
                <ChevronDown className='h-4 w-4' aria-hidden='true' />
              </span>
            </button>
          </PopoverTrigger>
          <PopoverContent align='start' className={ORDER_FIELD_POPOVER_CLASS}>
            <div className='px-2 py-1 sticky top-0 z-10 bg-white dark:bg-zinc-950'>
              <SearchInput
                value={searchValue}
                onChange={onSearchChange}
                placeholder='Buscar anfitriona...'
                className='w-full mb-2'
              />
            </div>
            <div style={{ maxHeight: 220, overflowY: 'auto' }}>
              {visibles.length === 0 && (
                <div className='text-xs text-gray-400 dark:text-zinc-500 px-2 py-2'>
                  {searchQuery ? 'Sin resultados para esa búsqueda' : 'No hay anfitrionas'}
                </div>
              )}
              {hasReachedLimit && (
                <div className='text-xs text-orange-600 dark:text-orange-300 px-2 py-2 bg-orange-50 dark:bg-orange-950/40 border-b dark:border-orange-900/40'>
                  Límite alcanzado: {value.length} de {maxSelection} seleccionadas
                </div>
              )}
              {visibles.map(a => {
                const id = String(a.id_usuario || a.id);
                const isSelected = value.includes(id);
                const canSelect = isSelected || !hasReachedLimit;

                return (
                  <label
                    key={id}
                    htmlFor={`hostess-${id}`}
                    className={`flex items-center gap-2 px-2 py-1.5 cursor-pointer rounded-md text-sm text-gray-700 transition-colors hover:bg-gray-100 dark:text-zinc-100 dark:hover:bg-white/10 ${!canSelect ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <Checkbox
                      id={`hostess-${id}`}
                      checked={isSelected}
                      disabled={!canSelect}
                      onCheckedChange={() => {
                        if (isSelected) {
                          onChange(value.filter(x => x !== id));
                        } else if (!hasReachedLimit) {
                          onChange([...value, id]);
                        }
                      }}
                    />
                    <span className='text-sm font-medium'>{a.nick || a.nombre}</span>
                  </label>
                );
              })}
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
};

export default HostessMultiSelect;
