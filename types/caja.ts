export interface Caja {
  id_caja: string | number;
  fecha_apertura: string;
  usuario_id_apertura: string | number;
  monto_apertura: number;
  ventas: number;
  efectivo: number;
  tarjeta: number;
  transferencia: number;
  servicios: number;
  devoluciones: number;
  iva: number;
  propina: number;
  anticipo: number;
  retiro_total?: number;
  comision: number;
  monto_cierre: number | null;
  usuario_id_cierre: string | number | null;
  fecha_cierre: string | null;
  estado: number;
  /** Saldos de clientes que se descontaron del efectivo en este cierre. */
  saldo_clientes_descontado?: number;
  /** Hay una solicitud de cierre esperando autorización del administrador. */
  cierre_pendiente?: boolean;
  /** Cuándo se pidió el cierre (la caja sigue abierta hasta que la autoricen). */
  cierre_solicitado_en?: string | null;
  /** Quién pidió el cierre, si hay una solicitud pendiente. */
  cierre_solicitado_por?: string | null;
  /**
   * Cuándo salió el último aviso al administrador: al pedir el cierre y en cada
   * reenvío. Si difiere de `cierre_solicitado_en`, hubo reenvíos.
   */
  cierre_ultimo_aviso_en?: string | null;
  /**
   * El cierre pendiente quedó sin respuesta (pasó la ventana de recordatorios): ya se puede
   * pedir el cierre de nuevo.
   */
  cierre_estancado?: boolean;
}

export interface CajaWithUser extends Caja {
  cajero_nombre?: string;
  cajero_foto?: string;
  cajero_cierre_nombre?: string;
  cajero_cierre_foto?: string;
}

export interface CajaCreate {
  monto_apertura: number;
  usuario_id_apertura: string | number;
}

export interface CajaUpdate {
  ventas?: number;
  efectivo?: number;
  tarjeta?: number;
  transferencia?: number;
  servicios?: number;
  devoluciones?: number;
  iva?: number;
  propina?: number;
  anticipo?: number;
  comision?: number;
  monto_cierre?: number;
  usuario_id_cierre?: string | number;
  fecha_cierre?: string;
  estado?: number;
}

export interface CajaCierre {
  id_caja: string | number;
  usuario_id_cierre: string | number;
  fecha_cierre: string;
  monto_cierre: number;
}

export interface CajaRetiro {
  caja_id: string | number;
  id_caja?: string | number;
  monto: number;
  motivo: string;
  usuario_id: string | number;
}

export interface CajaResumen {
  total_ventas: number;
  total_efectivo: number;
  efectivo_en_caja?: number;
  total_tarjeta: number;
  total_transferencia: number;
  total_servicios: number;
  total_devoluciones: number;
  total_iva: number;
  total_propina: number;
  total_anticipo: number;
  total_comisiones: number;
  cajas_abiertas: number;
  cajas_cerradas: number;
  monto_apertura?: number;

  balance_total?: number;
  cantidad_ventas?: number;
  cantidad_servicios?: number;
  promedio_venta?: number;
  promedio_servicio?: number;
  tiempo_abierta?: string;
  fecha_apertura?: string;
  usuario_apertura?: string;
}
