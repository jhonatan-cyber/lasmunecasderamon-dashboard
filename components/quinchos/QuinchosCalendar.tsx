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
  onSelectDay: (fecha: string, reservasDelDia: ReservaQuincho[]) => void;
}

function mesDeFecha(fecha: string): Date {
  const [anio, mes] = fecha.split('-').map(Number);
  return new Date(anio, mes - 1, 1);
}

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

export function QuinchosCalendar({ reservas, isLoading, onSelectDay }: QuinchosCalendarProps) {
  const hoy = getTodayDateKey();
  const [mes, setMes] = useState<Date>(() => mesDeFecha(hoy));

  const reservasPorFecha = useMemo(() => agruparReservasPorFecha(reservas), [reservas]);
  const dias = useMemo(() => getMonthDays(mes), [mes]);
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
      <div className='flex flex-col gap-3 border-b border-gray-200 p-3 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between sm:p-4'>
        <div className='flex items-center gap-1 sm:gap-2'>
          <Button
            type='button'
            variant='ghost'
            size='icon'
            aria-label='Mes anterior'
            onClick={() => navegar(-1)}
            className='h-8 w-8 sm:h-10 sm:w-10'
          >
            <ChevronLeft className='h-3.5 w-3.5 sm:h-4 sm:w-4' />
          </Button>
          <h2 className='min-w-[9rem] text-center text-sm font-semibold capitalize text-gray-900 dark:text-neutral-100 sm:min-w-[11rem] sm:text-base lg:text-lg'>
            {formatMonthYearLabel(mes)}
          </h2>
          <Button
            type='button'
            variant='ghost'
            size='icon'
            aria-label='Mes siguiente'
            onClick={() => navegar(1)}
            className='h-8 w-8 sm:h-10 sm:w-10'
          >
            <ChevronRight className='h-3.5 w-3.5 sm:h-4 sm:w-4' />
          </Button>
        </div>

        <div className='flex items-center justify-between gap-3 sm:justify-end'>
          {isLoading && <span className='text-xs text-gray-500'>Cargando reservas…</span>}
          <Button
            type='button'
            variant='secondary'
            size='sm'
            className='rounded-full px-3 text-xs sm:px-4 sm:text-sm'
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
          <div className='px-2 py-2 sm:px-4 sm:py-3'>
            <span className='block text-[10px] uppercase tracking-wide text-gray-500 dark:text-neutral-400 sm:text-[11px]'>
              Reservas
            </span>
            <span className='block text-sm font-bold text-gray-900 dark:text-neutral-100 sm:text-lg'>
              {resumen.reservas.toLocaleString('es-CL')}
            </span>
          </div>
          <div className='px-2 py-2 sm:px-4 sm:py-3'>
            <span className='block text-[10px] uppercase tracking-wide text-gray-500 dark:text-neutral-400 sm:text-[11px]'>
              Personas
            </span>
            <span className='block text-sm font-bold text-gray-900 dark:text-neutral-100 sm:text-lg'>
              {resumen.personas.toLocaleString('es-CL')}
            </span>
          </div>
          <div className='px-2 py-2 sm:px-4 sm:py-3'>
            <span className='block text-[10px] uppercase tracking-wide text-gray-500 dark:text-neutral-400 sm:text-[11px]'>
              Recaudación
            </span>
            <span className='block text-sm font-bold text-emerald-700 dark:text-emerald-300 sm:text-lg'>
              {formatCurrencyCLP(resumen.recaudacion)}
            </span>
          </div>
        </div>

        <ul
          aria-label='Desglose por método de pago'
          className='flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-gray-200 px-3 py-1.5 text-[11px] text-gray-600 dark:border-slate-800 dark:text-neutral-400 sm:gap-x-5 sm:px-4 sm:py-2 sm:text-xs'
        >
          {METODOS_PAGO.map(metodo => (
            <li key={metodo.valor} className='flex items-center gap-1'>
              <span className={`h-1.5 w-1.5 rounded-full ${metodo.punto} sm:h-2 sm:w-2`} aria-hidden='true' />
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
            className='px-0.5 py-1 text-center text-[10px] font-semibold text-gray-600 dark:text-neutral-400 sm:px-1 sm:py-2 sm:text-xs'
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
          const usadas = delDia.filter(reserva => reserva.estado === 'usado');
          const activasOUsadas = [...activas, ...usadas];
          const totalDelDia = activas.reduce((suma, reserva) => suma + reserva.total, 0);
          const esHoy = clave === hoy;
          const esPasado = clave < hoy;
          // Un día pasado sin historial no abre el registro: la fecha ya no es válida.
          const bloqueaRegistro = esPasado && delDia.length === 0;

          return (
            <Button
              key={clave}
              type='button'
              variant='unstyled'
              disabled={bloqueaRegistro}
              onClick={() => onSelectDay(clave, delDia)}
              aria-label={`${formatLongDateEs(clave)}${
                activasOUsadas.length > 0
                  ? `, ${activasOUsadas.length} ${activasOUsadas.length === 1 ? 'reserva' : 'reservas'}`
                  : delDia.length > 0
                    ? ', solo reservas anuladas'
                    : ', sin reservas'
              }${bloqueaRegistro ? ', fecha pasada' : ''}`}
              className={cn(
                'group flex min-h-[64px] flex-col items-stretch gap-0.5 rounded-none border-b border-r border-gray-200 p-1 text-left transition-colors last:border-r-0 hover:bg-orange-50 dark:border-slate-800 dark:hover:bg-orange-950/20 sm:min-h-[96px] sm:gap-1 sm:p-2',
                !dia.isCurrentMonth && 'bg-gray-50/70 dark:bg-slate-950/40'
              )}
            >
              <span className='flex items-center justify-between'>
                <span
                  className={cn(
                    'flex h-5 w-5 items-center justify-center rounded-full text-xs font-semibold sm:h-6 sm:w-6 sm:text-sm',
                    dia.isCurrentMonth
                      ? 'text-gray-900 dark:text-neutral-100'
                      : 'text-gray-400 dark:text-neutral-600',
                    esHoy && 'bg-orange-500 text-white dark:text-white'
                  )}
                >
                  {dia.date.getDate()}
                </span>
                {activasOUsadas.length > 1 && (
                  <span className='rounded-full bg-orange-100 px-1 text-[9px] font-semibold text-orange-700 dark:bg-orange-500/20 dark:text-orange-200 sm:px-1.5 sm:text-[11px]'>
                    {activasOUsadas.length}
                  </span>
                )}
              </span>

              {activasOUsadas.slice(0, 2).map(reserva => (
                <span
                  key={reserva.id}
                  className={cn(
                    'hidden truncate rounded-md px-1 py-0.5 text-[10px] font-medium sm:block',
                    reserva.estado === 'usado'
                      ? 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'
                      : 'bg-orange-100 text-orange-800 dark:bg-orange-500/15 dark:text-orange-200'
                  )}
                >
                  {reserva.cliente_nombre} {reserva.cliente_apellido}
                </span>
              ))}

              {activasOUsadas.length > 2 && (
                <span className='hidden text-[10px] font-medium text-gray-500 dark:text-neutral-400 sm:block'>
                  +{activasOUsadas.length - 2} más
                </span>
              )}

              {activasOUsadas.length > 0 ? (
                <span className='mt-auto truncate text-[9px] font-semibold text-emerald-700 dark:text-emerald-300 sm:text-[11px]'>
                  {formatCurrencyCLP(totalDelDia)}
                </span>
              ) : dia.isCurrentMonth && esPasado && delDia.length > 0 ? (
                <span className='mt-auto hidden truncate text-[9px] font-medium text-gray-500 dark:text-neutral-400 sm:block sm:text-[11px]'>
                  Ver anuladas
                </span>
              ) : (
                dia.isCurrentMonth &&
                !esPasado && (
                  <span className='mt-auto hidden text-[10px] text-gray-400 opacity-0 transition-opacity group-hover:opacity-100 sm:block sm:text-[11px]'>
                    + Reservar
                  </span>
                )
              )}
            </Button>
          );
        })}
      </div>

      <div className='flex flex-wrap items-center gap-x-3 gap-y-1 bg-gray-50 px-3 py-2 text-[11px] text-gray-600 dark:bg-slate-900 dark:text-neutral-400 sm:gap-3 sm:px-4 sm:py-3 sm:text-xs'>
        <span className='h-2.5 w-2.5 rounded-sm bg-orange-400 sm:h-3 sm:w-3' aria-hidden='true' />
        <span>Activa</span>
        <span className='h-2.5 w-2.5 rounded-sm bg-gray-400 sm:h-3 sm:w-3' aria-hidden='true' />
        <span>Usada</span>
        <span className='hidden text-gray-400 dark:text-neutral-600 sm:inline'>|</span>
        <span className='sm:hidden'>Toca un día para ver o reservar.</span>
        <span className='hidden sm:inline'>
          Día con reserva: al tocarlo ves el detalle. Día libre: al tocarlo registras una reserva
          para esa fecha.
        </span>
      </div>
    </div>
  );
}
