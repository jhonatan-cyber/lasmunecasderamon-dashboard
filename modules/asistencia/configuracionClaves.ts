import type { DefinicionClave } from '@/lib/configuracion/definiciones';
import { horaDelDia } from '@/lib/configuracion/definiciones';
export const CLAVES_ASISTENCIA: Record<string, DefinicionClave> = {
  asistencia_hora_inicio: {
    categoria: 'asistencia',
    tipo: 'number',
    default: 0,
    validar: horaDelDia('asistencia_hora_inicio')
  },
  asistencia_hora_fin: {
    categoria: 'asistencia',
    tipo: 'number',
    default: 23,
    validar: horaDelDia('asistencia_hora_fin')
  }
};
