'use client';

import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getMonthDays } from '@/hooks/calendar/roleCalendarGrid';
import {
  formatLongDateEs,
  formatMonthYearLabel,
  getTodayDateKey,
  toDateKey
} from '@/lib/utils/calendarUtils';
import { formatCurrencyCLP } from '@/lib/utils/formatters';
import { cn } from '@/lib/utils/utils';
import type { MetodoPagoReservaQuincho, ReservaQuincho } from '@/types/quincho';

const DIAS_SEMANA = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

const METODOS_PAGO: {
  valor: MetodoPagoReservaQuincho;
  etiqueta: string;
  punto: string;
}[] = [
  { valor: 'efectivo', etiqueta: 'Efectivo', punto: 'bg-emerald-500' },
  { valor: 'tarjeta', etiqueta: 'Tarjeta', punto: 'bg-sky-500' },
  { valor: 'transferencia', etiqueta: 'Transferencia', punto: 'bg-violet-500' }
];

interface QuinchosCalendarProps {
  reservas: ReservaQuincho[];
  isLoading: boolean;
  /** Recibe la fecha (`YYYY-MM-DD`) y todas las reservas de ese día. */
  onSelectDay: (fecha: string, reservasDelDia: ReservaQuincho[]) => void;
}

/** `2026-11-20` → `new Date(2026, 10, 1)`, sin pasar por zonas horarias. */
function mesDeFecha(fecha: string): Date {
  const [anio, mes] = fecha.split('-').map(Number);
  return new Date(anio, mes - 1, 1);
}

/** Reservas agrupadas por fecha, tal como las devuelve el API. */
export function agruparReservasPorFecha(reservas: ReservaQuincho[]): Map<string, ReservaQuincho[]> {
  const porFecha = new Map<string, ReservaQuincho[]>();
  for (const reserva of reservas) {
    const clave = toDateKey(reserva.fecha_reserva);
    const delDia = porFecha.get(clave);
    if (delDia) delDia.push(reserva);
    else porFecha.set(clave, [reserva]);
  }
  return porFecha;
}

/**
 * Calendario mensual de reservas de quincho. Cada día muestra las reservas
 * activas y avisa al padre qué fecha se eligió: un día libre abre el registro
 * y un día ocupado abre el detalle.
 */
export function QuinchosCalendar({ reservas, isLoading, onSelectDay }: QuinchosCalendarProps) {
  const hoy = getTodayDateKey();
  const [mes, setMes] = useState<Date>(() => mesDeFecha(hoy));

  const reservasPorFecha = useMemo(() => agruparReservasPorFecha(reservas), [reservas]);
  const dias = useMemo(() => getMonthDays(mes), [mes]);

  // Resumen del mes visible: solo las reservas activas, que son las que cobran.
  const resumen = useMemo(() => {
    const periodo = `${mes.getFullYear()}-${String(mes.getMonth() + 1).padStart(2, '0')}`;
    const activas = reservas.filter(
      reserva => reserva.estado === 'activa' && toDateKey(reserva.fecha_reserva).startsWith(periodo)
    );
    const porMetodo: Record<MetodoPagoReservaQuincho, number> = {
      efectivo: 0,
      tarjeta: 0,
      transferencia: 0
    };
    for (const reserva of activas) porMetodo[reserva.metodo_pago] += reserva.total;

    return {
      reservas: activas.length,
      personas: activas.reduce((suma, reserva) => suma + reserva.cantidad_personas, 0),
      recaudacion: activas.reduce((suma, reserva) => suma + reserva.total, 0),
      porMetodo
    };
  }, [mes, reservas]);

  const navegar = (delta: number) => {
    setMes(actual => new Date(actual.getFullYear(), actual.getMonth() + delta, 1));
  };

  return (
    <div className='overflow-hidden rounded-3xl bg-white shadow-md dark:bg-slate-900/40'>
      <div className='flex flex-col gap-3 border-b border-gray-200 p-4 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between'>
        <div className='flex items-center gap-2'>
          <Button
            type='button'
            variant='ghost'
            size='icon'
            aria-label='Mes anterior'
            onClick={() => navegar(-1)}
          >
            <ChevronLeft className='h-4 w-4' />
          </Button>
          <h2 className='min-w-[11rem] text-center text-base font-semibold capitalize text-gray-900 dark:text-neutral-100 sm:text-lg'>
            {formatMonthYearLabel(mes)}
          </h2>
          <Button
            type='button'
            variant='ghost'
            size='icon'
            aria-label='Mes siguiente'
            onClick={() => navegar(1)}
          >
            <ChevronRight className='h-4 w-4' />
          </Button>
        </div>

        <div className='flex items-center justify-between gap-3 sm:justify-end'>
          {isLoading && <span className='text-xs text-gray-500'>Cargando reservas…</span>}
          <Button
            type='button'
            variant='secondary'
            size='sm'
            className='rounded-full px-4'
            onClick={() => setMes(mesDeFecha(hoy))}
          >
            Hoy
          </Button>
        </div>
      </div>

      <section
        aria-label='Resumen del mes'
        className='border-b border-gray-200 dark:border-slate-800'
      >
        <div className='grid grid-cols-3 divide-x divide-gray-200 dark:divide-slate-800'>
          <div className='px-4 py-3'>
            <span className='block text-[11px] uppercase tracking-wide text-gray-500 dark:text-neutral-400'>
              Reservas
            </span>
            <span className='text-lg font-bold text-gray-900 dark:text-neutral-100'>
              {resumen.reservas.toLocaleString('es-CL')}
            </span>
          </div>
          <div className='px-4 py-3'>
            <span className='block text-[11px] uppercase tracking-wide text-gray-500 dark:text-neutral-400'>
              Personas
            </span>
            <span className='text-lg font-bold text-gray-900 dark:text-neutral-100'>
              {resumen.personas.toLocaleString('es-CL')}
            </span>
          </div>
          <div className='px-4 py-3'>
            <span className='block text-[11px] uppercase tracking-wide text-gray-500 dark:text-neutral-400'>
              Recaudación
            </span>
            <span className='text-lg font-bold text-emerald-700 dark:text-emerald-300'>
              {formatCurrencyCLP(resumen.recaudacion)}
            </span>
          </div>
        </div>

        <ul
          aria-label='Desglose por método de pago'
          className='flex flex-wrap items-center gap-x-5 gap-y-1 border-t border-gray-200 px-4 py-2 text-xs text-gray-600 dark:border-slate-800 dark:text-neutral-400'
        >
          {METODOS_PAGO.map(metodo => (
            <li key={metodo.valor} className='flex items-center gap-1.5'>
              <span className={`h-2 w-2 rounded-full ${metodo.punto}`} aria-hidden='true' />
              {metodo.etiqueta}:
              <strong className='font-semibold text-gray-900 dark:text-neutral-100'>
                {formatCurrencyCLP(resumen.porMetodo[metodo.valor])}
              </strong>
            </li>
          ))}
        </ul>
      </section>

      <div className='grid grid-cols-7 border-b border-gray-200 bg-gray-50 dark:border-slate-800 dark:bg-slate-900'>
        {DIAS_SEMANA.map(dia => (
          <div
            key={dia}
            className='px-1 py-2 text-center text-xs font-semibold text-gray-600 dark:text-neutral-400 sm:text-sm'
          >
            {dia}
          </div>
        ))}
      </div>

      <div className='grid grid-cols-7'>
        {dias.map(dia => {
          const clave = toDateKey(dia.date);
          const delDia = reservasPorFecha.get(clave) ?? [];
          const activas = delDia.filter(reserva => reserva.estado === 'activa');
          const totalDelDia = activas.reduce((suma, reserva) => suma + reserva.total, 0);
          const esHoy = clave === hoy;

          return (
            <Button
              key={clave}
              type='button'
              variant='unstyled'
              onClick={() => onSelectDay(clave, delDia)}
              aria-label={`${formatLongDateEs(clave)}${
                activas.length > 0
                  ? `, ${activas.length} ${activas.length === 1 ? 'reserva' : 'reservas'}`
                  : ', sin reservas'
              }`}
              className={cn(
                'group flex min-h-[96px] flex-col items-stretch gap-1 rounded-none border-b border-r border-gray-200 p-1.5 text-left transition-colors last:border-r-0 hover:bg-orange-50 dark:border-slate-800 dark:hover:bg-orange-950/20 sm:p-2',
                !dia.isCurrentMonth && 'bg-gray-50/70 dark:bg-slate-950/40'
              )}
            >
              <span className='flex items-center justify-between'>
                <span
                  className={cn(
                    'flex h-6 w-6 items-center justify-center rounded-full text-sm font-semibold',
                    dia.isCurrentMonth
                      ? 'text-gray-900 dark:text-neutral-100'
                      : 'text-gray-400 dark:text-neutral-600',
                    esHoy && 'bg-orange-500 text-white dark:text-white'
                  )}
                >
                  {dia.date.getDate()}
                </span>
                {activas.length > 1 && (
                  <span className='rounded-full bg-orange-100 px-1.5 text-[11px] font-semibold text-orange-700 dark:bg-orange-500/20 dark:text-orange-200'>
                    {activas.length}
                  </span>
                )}
              </span>

              {activas.slice(0, 2).map(reserva => (
                <span
                  key={reserva.id}
                  className='truncate rounded-md bg-orange-100 px-1.5 py-0.5 text-[11px] font-medium text-orange-800 dark:bg-orange-500/15 dark:text-orange-200'
                >
                  {reserva.cliente_nombre} {reserva.cliente_apellido}
                </span>
              ))}

              {activas.length > 2 && (
                <span className='text-[11px] font-medium text-gray-500 dark:text-neutral-400'>
                  +{activas.length - 2} más
                </span>
              )}

              {activas.length > 0 ? (
                <span className='mt-auto truncate text-[11px] font-semibold text-emerald-700 dark:text-emerald-300'>
                  {formatCurrencyCLP(totalDelDia)}
                </span>
              ) : (
                dia.isCurrentMonth && (
                  <span className='mt-auto hidden text-[11px] text-gray-400 opacity-0 transition-opacity group-hover:opacity-100 sm:block'>
                    + Reservar
                  </span>
                )
              )}
            </Button>
          );
        })}
      </div>

      <div className='flex flex-wrap items-center gap-2 bg-gray-50 px-4 py-3 text-xs text-gray-600 dark:bg-slate-900 dark:text-neutral-400'>
        <span className='h-3 w-3 rounded-sm bg-orange-400' aria-hidden='true' />
        <span>
          Día con reserva: al tocarlo ves el detalle. Día libre: al tocarlo registras una reserva
          para esa fecha.
        </span>
      </div>
    </div>
  );
}
