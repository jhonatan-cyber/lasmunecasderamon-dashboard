import type { DataType } from '@/hooks/calendar/calendarTypes';

export interface DataTypeConfig {
  title: string;
  indicatorLabel: string;
  indicatorBg: string;
}

/**
 * Configuración visual por categoría de dato del calendario de roles.
 * Compartida por la leyenda (`RoleCalendar`) y las celdas (`CalendarDayCell`).
 */
export const allDataTypeConfig: Record<DataType, DataTypeConfig> = {
  asistencias: {
    title: 'Asistencias',
    indicatorLabel: 'A',
    indicatorBg: 'from-green-400 to-green-600 border-green-300'
  },
  anticipos: {
    title: 'Anticipos',
    indicatorLabel: 'AN',
    indicatorBg: 'from-red-400 to-red-600 border-red-300'
  },
  propinas: {
    title: 'Propinas',
    indicatorLabel: 'P',
    indicatorBg: 'from-yellow-400 to-yellow-600 border-yellow-300'
  },
  horasExtras: {
    title: 'Horas Extras',
    indicatorLabel: 'HE',
    indicatorBg: 'from-purple-400 to-purple-600 border-purple-300'
  },
  comisiones: {
    title: 'Comisiones',
    indicatorLabel: 'C',
    indicatorBg: 'from-yellow-400 to-yellow-600 border-yellow-300'
  },
  servicios: {
    title: 'Servicios',
    indicatorLabel: 'S',
    indicatorBg: 'from-purple-400 to-purple-600 border-purple-300'
  }
};
