export interface Cuenta {
  id_cuenta: string | number;
  codigo: string;
  cliente_id: string | number;
  total_comision: number;
  habitacion_id: string | number | null;
  sub_total: number;
  total: number;
  pedido_id: string | number | null;
  servicio_id: string | number | null;
  fecha_crea: string;
  estado: number;
}

export interface DetalleCuenta {
  id_detalle_cuenta: string | number;
  cuenta_id: string | number;
  producto_id: string | number;
  precio: number;
  cantidad: number;
  sub_total: number;
  comision: number;
}

export interface CuentaUsuario {
  id_cuenta_usuario: string | number;
  cuenta_id: string | number;
  usuario_id: string | number;
}

export interface CuentaRoomHistoryItem {
  roomId: string;
  roomName: string;
  startedAt: string;
  endedAt: string | null;
  assignedMinutes: number;
  consumedMinutes: number;
  remainingMinutes?: number;
  isActive?: boolean;
  carriedFromPrevious?: boolean;
  closedReason?: 'expired' | 'manual' | 'charged' | 'cancelled' | 'changed_room';
}

export interface CuentaAnulacionItem {
  id: string;
  monto: number;
  motivo?: string | null;
  estado: string;
  fecha_crea: string;
  fecha_mod?: string | null;
  requested_by_nombre?: string | null;
  approved_by_nombre?: string | null;
}

export interface CuentaFinancialSummary {
  total_original: number;
  total_actual: number;
  total_anulado_aprobado: number;
  total_anulacion_pendiente: number;
  total_anulacion_rechazada: number;
  tuvo_anulacion_parcial: boolean;
  fue_anulada_total: boolean;
}

export interface CuentaWithDetails extends Cuenta {
  cliente_nombre?: string;
  habitacion_numero?: string;
  detalles?: DetalleCuenta[];
  usuarios?: CuentaUsuario[];
  tiempo_total?: number;
  tiempo_activo?: number;
  habitaciones_historial_data?: CuentaRoomHistoryItem[];
  solicitudes_anulacion?: CuentaAnulacionItem[];
  resumen_financiero?: CuentaFinancialSummary;
}

export interface CreateCuentaRequest {
  codigo: string;
  cliente_id?: string | number | null;
  total_comision: number;
  sub_total: number;
  total: number;
  habitacion_id?: string | number | null;
  pedido_id?: string | number | null;
  servicio_id?: string | number | null;
  tiempo?: number;
  detalles: CreateDetalleCuentaRequest[];
  usuarios?: Array<string | number>;
}

export interface CreateDetalleCuentaRequest {
  producto_id: string | number;
  precio: number;
  cantidad: number;
  sub_total: number;
  comision: number;
}

export interface UpdateCuentaRequest {
  id_cuenta: string | number;
  estado?: number;
  detalles?: CreateDetalleCuentaRequest[];
  usuarios?: Array<string | number>;
} 
