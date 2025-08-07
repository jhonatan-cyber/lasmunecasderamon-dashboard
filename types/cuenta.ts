export interface Cuenta {
  id_cuenta: number;
  codigo: string;
  cliente_id: number;
  total_comision: number;
  habitacion_id: number | null;
  sub_total: number;
  total: number;
  pedido_id: number | null;
  servicio_id: number | null;
  fecha_crea: string;
  estado: number;
}

export interface DetalleCuenta {
  id_detalle_cuenta: number;
  cuenta_id: number;
  producto_id: number;
  precio: number;
  cantidad: number;
  sub_total: number;
  comision: number;
}

export interface CuentaUsuario {
  id_cuenta_usuario: number;
  cuenta_id: number;
  usuario_id: number;
}

export interface CuentaWithDetails extends Cuenta {
  cliente_nombre?: string;
  habitacion_numero?: string;
  detalles?: DetalleCuenta[];
  usuarios?: CuentaUsuario[];
}

export interface CreateCuentaRequest {
  codigo: string;
  cliente_id: number;
  total_comision: number;
  sub_total: number;
  total: number;
  habitacion_id?: number | null;
  pedido_id?: number | null;
  servicio_id?: number | null;
  detalles: CreateDetalleCuentaRequest[];
  usuarios?: number[];
}

export interface CreateDetalleCuentaRequest {
  producto_id: number;
  precio: number;
  cantidad: number;
  sub_total: number;
  comision: number;
}

export interface UpdateCuentaRequest {
  id_cuenta: number;
  estado?: number;
  detalles?: CreateDetalleCuentaRequest[];
  usuarios?: number[];
} 