export interface Cuenta {
  id_cuenta: string;
  codigo: string;
  cliente_id: string;
  total_comision: number;
  habitacion_id: string | null;
  sub_total: number;
  total: number;
  pedido_id: string | null;
  servicio_id: string | null;
  fecha_crea: string;
  estado: number;
}

export interface DetalleCuenta {
  id_detalle_cuenta: string;
  cuenta_id: string;
  producto_id: string;
  precio: number;
  cantidad: number;
  sub_total: number;
  comision: number;
}

export interface CuentaUsuario {
  id_cuenta_usuario: string;
  cuenta_id: string;
  usuario_id: string;
}

export interface CuentaWithDetails extends Cuenta {
  cliente_nombre?: string;
  habitacion_numero?: string;
  detalles?: DetalleCuenta[];
  usuarios?: CuentaUsuario[];
}

export interface CreateCuentaRequest {
  codigo: string;
  cliente_id: string;
  total_comision: number;
  sub_total: number;
  total: number;
  habitacion_id?: string | null;
  pedido_id?: string | null;
  servicio_id?: string | null;
  detalles: CreateDetalleCuentaRequest[];
  usuarios?: string[];
}

export interface CreateDetalleCuentaRequest {
  producto_id: string;
  precio: number;
  cantidad: number;
  sub_total: number;
  comision: number;
}

export interface UpdateCuentaRequest {
  id_cuenta: string;
  estado?: number;
  detalles?: CreateDetalleCuentaRequest[];
  usuarios?: string[];
} 