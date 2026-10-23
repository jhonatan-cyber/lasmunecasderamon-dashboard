/**
 * Fechas de lote: elaboración, duración (en meses) y vencimiento.
 *
 * Regla del negocio: con fecha de elaboración + duración se calcula el
 * vencimiento; si el vencimiento se informa directamente, elaboración y
 * duración no hacen falta. Todas las fechas viajan en ISO `YYYY-MM-DD`.
 */
import { getNowInBusinessTimezone } from './timezoneService';

const ISO = /^\d{4}-\d{2}-\d{2}$/;

/** Días de aviso previos al vencimiento de un lote. */
export const DIAS_ALERTA_VENCIMIENTO = 30;

/** Dos dígitos para armar fechas ISO. */
function dosDigitos(valor: number): string {
  return String(valor).padStart(2, '0');
}

/** true cuando la fecha es ISO y existe de verdad (no 2026-02-31). */
export function esFechaISO(fecha?: string | null): boolean {
  if (!fecha || !ISO.test(fecha)) return false;
  const [anio, mes, dia] = fecha.split('-').map(Number);
  const date = new Date(Date.UTC(anio, mes - 1, dia));
  return (
    date.getUTCFullYear() === anio && date.getUTCMonth() === mes - 1 && date.getUTCDate() === dia
  );
}

/**
 * Suma meses naturales a una fecha, recortando el día al fin del mes:
 * 31 de enero + 1 mes = 28 o 29 de febrero. Devuelve null si la fecha o la
 * duración no son válidas.
 */
export function sumarMeses(fecha?: string | null, meses?: number | string | null): string | null {
  if (!esFechaISO(fecha)) return null;
  const cantidad = Number(meses);
  if (!Number.isInteger(cantidad) || cantidad <= 0) return null;
  const [anio, mes, dia] = (fecha as string).split('-').map(Number);
  const objetivo = new Date(Date.UTC(anio, mes - 1 + cantidad, 1));
  const ultimoDelMes = new Date(
    Date.UTC(objetivo.getUTCFullYear(), objetivo.getUTCMonth() + 1, 0)
  ).getUTCDate();
  const diaFinal = Math.min(dia, ultimoDelMes);
  return `${objetivo.getUTCFullYear()}-${dosDigitos(objetivo.getUTCMonth() + 1)}-${dosDigitos(diaFinal)}`;
}

/**
 * Vencimiento calculado desde elaboración + duración. Si falta cualquiera de
 * las dos (o no es válida) devuelve null: en ese caso el vencimiento es el que
 * se haya ingresado a mano, o ninguno.
 */
export function vencimientoCalculado(
  fechaElaboracion?: string | null,
  duracionMeses?: number | string | null
): string | null {
  if (duracionMeses === null || duracionMeses === undefined || String(duracionMeses).trim() === '')
    return null;
  return sumarMeses(fechaElaboracion, duracionMeses);
}

/** Fecha de hoy en la zona del negocio, `YYYY-MM-DD`. */
export function hoyDelNegocio(): string {
  return getNowInBusinessTimezone().slice(0, 10);
}

/** Días entre dos fechas ISO (hasta - desde). UTC para no depender de la zona. */
function diasEntre(desde: string, hasta: string): number {
  const [anioDesde, mesDesde, diaDesde] = desde.split('-').map(Number);
  const [anioHasta, mesHasta, diaHasta] = hasta.split('-').map(Number);
  const MS_POR_DIA = 24 * 60 * 60 * 1000;
  return Math.round(
    (Date.UTC(anioHasta, mesHasta - 1, diaHasta) - Date.UTC(anioDesde, mesDesde - 1, diaDesde)) /
      MS_POR_DIA
  );
}

export type EstadoVencimiento = 'vencido' | 'por_vencer' | 'vigente';

export interface VencimientoInfo {
  fecha: string;
  estado: EstadoVencimiento;
  /** Días que faltan para vencer: 0 es hoy, negativo si ya venció. */
  dias: number;
}

/**
 * Clasifica una fecha de vencimiento contra un día de referencia: vencida si ya
 * pasó, por vencer dentro de la ventana de aviso (incluye el mismo día) y
 * vigente si falta más que esa ventana. Devuelve null si la fecha no es válida.
 */
export function estadoVencimiento(
  fecha?: string | null,
  hoy: string = hoyDelNegocio(),
  diasAlerta: number = DIAS_ALERTA_VENCIMIENTO
): VencimientoInfo | null {
  if (!esFechaISO(fecha) || !esFechaISO(hoy)) return null;
  const dias = diasEntre(hoy, fecha as string);
  const estado: EstadoVencimiento =
    dias < 0 ? 'vencido' : dias <= diasAlerta ? 'por_vencer' : 'vigente';
  return { fecha: fecha as string, estado, dias };
}

/** Cuenta lotes vencidos y por vencer de una lista de fechas de vencimiento. */
export function resumenVencimientos(
  fechas: (string | null | undefined)[],
  hoy: string = hoyDelNegocio(),
  diasAlerta: number = DIAS_ALERTA_VENCIMIENTO
): { vencidos: number; porVencer: number } {
  let vencidos = 0;
  let porVencer = 0;
  for (const fecha of fechas) {
    const info = estadoVencimiento(fecha, hoy, diasAlerta);
    if (info?.estado === 'vencido') vencidos++;
    else if (info?.estado === 'por_vencer') porVencer++;
  }
  return { vencidos, porVencer };
}

/**
 * Resuelve el vencimiento que se persiste: mantiene el ingresado a mano y, si
 * no lo hay, calcula el que corresponde con elaboración + duración. La misma
 * regla la aplican cliente y servidor para que lo guardado coincida con lo que
 * se ve en el formulario.
 */
export function resolverVencimiento(fechas: {
  fecha_elaboracion?: string | null;
  duracion_meses?: number | string | null;
  fecha_vencimiento?: string | null;
}): string | null {
  if (esFechaISO(fechas.fecha_vencimiento)) return fechas.fecha_vencimiento as string;
  return vencimientoCalculado(fechas.fecha_elaboracion, fechas.duracion_meses);
}
