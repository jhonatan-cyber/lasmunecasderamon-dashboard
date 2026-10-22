import { matchesAnyDateKey, toDateKey } from '@/lib/utils/calendarUtils';
import type { CalendarData, DataType } from './calendarTypes';

export type CalendarRow = any;

export const emptyCalendarData = (): CalendarData => ({
  asistencias: [],
  anticipos: [],
  propinas: [],
  horasExtras: [],
  comisiones: [],
  servicios: []
});

export const emptyCounts = (): { [key: string]: number } => ({
  asistencias: 0,
  anticipos: 0,
  propinas: 0,
  horasExtras: 0,
  comisiones: 0,
  servicios: 0
});

export const categoriesFor = (isAnfitriona: boolean): DataType[] =>
  isAnfitriona
    ? ['asistencias', 'anticipos', 'comisiones', 'servicios']
    : ['asistencias', 'anticipos', 'propinas', 'horasExtras'];

export function getDataForDate(
  calendarData: CalendarData,
  isAnfitriona: boolean,
  date: Date
): Record<DataType, boolean> {
  const dateKey = toDateKey(date);

  const asistenciasMatch = calendarData.asistencias.some((item: CalendarRow) =>
    matchesAnyDateKey(item.fecha, [dateKey])
  );
  const anticiposMatch = calendarData.anticipos.some((item: CalendarRow) =>
    matchesAnyDateKey(item.fecha_crea, [dateKey])
  );

  let thirdMatch = false;
  let fourthMatch = false;

  if (isAnfitriona) {
    thirdMatch = calendarData.comisiones.some((item: CalendarRow) =>
      matchesAnyDateKey(item.fecha_crea, [dateKey])
    );
    fourthMatch = calendarData.servicios.some((item: CalendarRow) =>
      matchesAnyDateKey(item.fecha_crea, [dateKey])
    );
  } else {
    thirdMatch = calendarData.propinas.some((item: CalendarRow) =>
      matchesAnyDateKey(item.fecha_crea, [dateKey])
    );
    fourthMatch = calendarData.horasExtras.some((item: CalendarRow) =>
      matchesAnyDateKey(item.fecha_crea, [dateKey])
    );
  }

  return {
    asistencias: asistenciasMatch,
    anticipos: anticiposMatch,
    propinas: !isAnfitriona && thirdMatch,
    horasExtras: !isAnfitriona && fourthMatch,
    comisiones: isAnfitriona && thirdMatch,
    servicios: isAnfitriona && fourthMatch
  };
}

export function hasAnyData(flags: Record<DataType, boolean>): boolean {
  return (
    flags.asistencias ||
    flags.anticipos ||
    flags.propinas ||
    flags.horasExtras ||
    flags.comisiones ||
    flags.servicios
  );
}
