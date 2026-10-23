export type EstadoReservaQuincho = 'activa' | 'anulada';
export type MetodoPagoReservaQuincho = 'efectivo' | 'tarjeta' | 'transferencia';

/** Reserva de quincho tal como la devuelve el API, con el cliente ya resuelto. */
export interface ReservaQuincho {
  id: string;
  cliente_id: string;
  cliente_nombre: string;
  cliente_apellido: string;
  cliente_run: string | null;
  /** Fecha del quincho, `YYYY-MM-DD`. */
  fecha_reserva: string;
  cantidad_personas: number;
  monto_por_persona: number;
  total: number;
  metodo_pago: MetodoPagoReservaQuincho;
  observaciones: string | null;
  estado: EstadoReservaQuincho;
  usuario_id: string | null;
  fecha_crea: string;
  fecha_anulacion: string | null;
  anulada_por: string | null;
}

/** Cliente que se crea desde el formulario de la reserva. */
export interface NuevoClienteQuincho {
  name: string;
  lastName: string;
  run?: string;
  phone?: string;
}

/** Datos que envía el formulario; el total lo calcula el servidor. */
export interface ReservaQuinchoCreate {
  cliente_id: string;
  fecha_reserva: string;
  cantidad_personas: number;
  monto_por_persona: number;
  metodo_pago: MetodoPagoReservaQuincho;
  observaciones?: string;
}

/**
 * Borrador del formulario: o se elige un cliente existente, o se traen los
 * datos para crearlo. El hook resuelve el id antes de enviar la reserva.
 */
export interface ReservaQuinchoDraft extends Omit<ReservaQuinchoCreate, 'cliente_id'> {
  cliente_id: string | null;
  cliente_nuevo?: NuevoClienteQuincho | null;
}
