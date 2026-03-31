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

export interface CuentaWithDetails extends Cuenta {
  cliente_nombre?: string;
  habitacion_numero?: string;
  detalles?: DetalleCuenta[];
  usuarios?: CuentaUsuario[];
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
