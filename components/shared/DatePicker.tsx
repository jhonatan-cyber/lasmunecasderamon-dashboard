'use client';

import { useMemo, useState } from 'react';
import { format } from 'date-fns';
import { CalendarDays } from 'lucide-react';
import { es } from 'react-day-picker/locale/es';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { esFechaISO } from '@/lib/business/vencimiento';
import { FIELD_INPUT_CLASS } from '@/lib/ui/fieldStyles';
import { cn } from '@/lib/utils/utils';

interface DatePickerProps {
  id?: string;
  /** Fecha seleccionada en ISO `YYYY-MM-DD`. */
  value: string;
  onChange: (fecha: string) => void;
  /** Fecha mínima seleccionable en ISO `YYYY-MM-DD`; las anteriores se deshabilitan. */
  minDate?: string;
  /** Fecha máxima seleccionable en ISO `YYYY-MM-DD`; las posteriores se deshabilitan. */
  maxDate?: string;
  disabled?: boolean;
  onBlur?: () => void;
  /** Nombre accesible cuando el campo no tiene un `<label htmlFor>` asociado. */
  ariaLabel?: string;
  /** `long`: 24 de octubre de 2026; `short`: 24/10/2026. */
  displayFormat?: 'long' | 'short';
  placeholder?: string;
  className?: string;
}

/** Convierte ISO `YYYY-MM-DD` a Date local (sin corrimientos de zona). */
function parseFecha(fecha?: string): Date | undefined {
  if (!fecha || !esFechaISO(fecha)) return undefined;
  const [anio, mes, dia] = fecha.split('-').map(Number);
  return new Date(anio, mes - 1, dia);
}

/** Convierte un Date local a ISO `YYYY-MM-DD`, sin pasar por UTC. */
function toFechaISO(fecha: Date): string {
  const anio = fecha.getFullYear();
  const mes = String(fecha.getMonth() + 1).padStart(2, '0');
  const dia = String(fecha.getDate()).padStart(2, '0');
  return `${anio}-${mes}-${dia}`;
}

/** Selector de fecha shadcn: botón con formato de input + calendario en un popover. */
export function DatePicker({
  id,
  value,
  onChange,
  minDate,
  maxDate,
  disabled = false,
  onBlur,
  ariaLabel,
  displayFormat = 'long',
  placeholder = displayFormat === 'short' ? 'dd/mm/aaaa' : 'Selecciona una fecha',
  className
}: DatePickerProps) {
  const [abierto, setAbierto] = useState(false);

  const fechaSeleccionada = useMemo(() => parseFecha(value), [value]);
  const fechaMinima = useMemo(() => parseFecha(minDate), [minDate]);
  const fechaMaxima = useMemo(() => parseFecha(maxDate), [maxDate]);
  // Sin fecha elegida, abre el calendario en el mes de la cota disponible.
  const mesInicial = fechaSeleccionada ?? fechaMinima ?? fechaMaxima;

  const textoFecha = fechaSeleccionada
    ? displayFormat === 'short'
      ? format(fechaSeleccionada, 'dd/MM/yyyy')
      : new Intl.DateTimeFormat('es-CL', {
          day: '2-digit',
          month: 'long',
          year: 'numeric'
        }).format(fechaSeleccionada)
    : placeholder;

  const diasDeshabilitados = [
    ...(fechaMinima ? [{ before: fechaMinima }] : []),
    ...(fechaMaxima ? [{ after: fechaMaxima }] : [])
  ];

  const handleSelect = (fecha: Date | undefined) => {
    if (!fecha) return;
    const fechaISO = toFechaISO(fecha);
    if (minDate && fechaISO < minDate) return;
    if (maxDate && fechaISO > maxDate) return;
    onChange(fechaISO);
    setAbierto(false);
  };

  return (
    <Popover open={abierto} onOpenChange={setAbierto}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type='button'
          variant='unstyled'
          disabled={disabled}
          onBlur={onBlur}
          aria-label={ariaLabel ? `${ariaLabel}: ${textoFecha}` : undefined}
          className={cn(
            FIELD_INPUT_CLASS,
            'flex items-center justify-between gap-2 rounded-full text-left font-normal',
            !fechaSeleccionada && 'text-muted-foreground',
            className
          )}
        >
          <span className='truncate'>{textoFecha}</span>
          <CalendarDays aria-hidden='true' className='size-4 shrink-0 opacity-60' />
        </Button>
      </PopoverTrigger>
      <PopoverContent className='w-auto p-0' align='start'>
        <Calendar
          mode='single'
          selected={fechaSeleccionada}
          onSelect={handleSelect}
          defaultMonth={mesInicial}
          startMonth={fechaMinima}
          endMonth={fechaMaxima}
          disabled={diasDeshabilitados.length ? diasDeshabilitados : undefined}
          locale={es}
          autoFocus
        />
      </PopoverContent>
    </Popover>
  );
}
