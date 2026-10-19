import type { DefinicionClave } from '@/lib/configuracion/definiciones';
import { enteroEnRango, horaDelDia } from '@/lib/configuracion/definiciones';
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
  },
  asistencia_minuto_inicio: {
    categoria: 'asistencia',
    tipo: 'number',
    default: 0,
    validar: enteroEnRango('asistencia_minuto_inicio', 0, 59)
  },
  asistencia_minuto_fin: {
    categoria: 'asistencia',
    tipo: 'number',
    default: 0,
    validar: enteroEnRango('asistencia_minuto_fin', 0, 59)
  },
  biometric_ip_watch: {
    categoria: 'asistencia',
    tipo: 'boolean',
    default: true,
    validar: valor =>
      ['true', 'false', '1', '0'].includes(valor.toLowerCase())
        ? null
        : 'biometric_ip_watch debe ser true o false'
  },
  biometric_recepcion_activa: {
    categoria: 'asistencia',
    tipo: 'boolean',
    default: true,
    validar: valor =>
      ['true', 'false', '1', '0'].includes(valor.toLowerCase())
        ? null
        : 'biometric_recepcion_activa debe ser true o false'
  }
};
