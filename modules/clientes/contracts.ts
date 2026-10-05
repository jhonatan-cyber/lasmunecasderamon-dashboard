/**
 * Contratos del módulo de Clientes — §5: «DTO y esquemas aptos para consumidores».
 *
 * Lo que sale de aquí son filas de `solicitudes_devolucion_saldo` con el cliente y
 * los nicks ya resueltos: la bandeja de aprobación necesita los nombres y la
 * aprobación necesita el saldo, el motivo y el cliente.
 */

/** Solicitud de devolución de saldo con su cliente y quién la resolvió. */
export interface SolicitudDevolucionSaldo {
  id: string;
  cliente_id: string;
  monto: number | string;
  motivo: string | null;
  estado: string;
  fecha_crea: string;
  fecha_resolucion: string | null;
  nombre: string | null;
  apellido: string | null;
  run: string | null;
  telefono: string | null;
  saldo_actual: number | string | null;
  solicitado_por_nick: string | null;
  resuelto_por_nick: string | null;
}

/** Solicitud tal como la devuelve la bandeja, con los nombres ya unidos. */
export interface SolicitudDevolucionListada {
  id: string;
  cliente_id: string;
  monto: number;
  motivo: string | null;
  estado: string;
  fecha_crea: string;
  fecha_resolucion: string | null;
  nombre: string;
  apellido: string;
  run: string | null;
  telefono: string | null;
  saldo_actual: number;
  solicitado_por_nick: string | null;
  resuelto_por_nick: string | null;
}

/** Resultado de registrar el recordatorio de una devolución. */
export interface RecordatorioRegistrado {
  solicitud_id: string;
}
