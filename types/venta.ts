export interface Venta {
  id: number;
  codigo: string;
  cliente_id: number;
  pedido_id?: number | null;
  habitacion_id: number;
  metodo_pago: 'efectivo' | 'tarjeta' | 'transferencia';
  propina: number;
  sub_total: number;
  total: number;
  fecha_crea: string;
  fecha_mod?: string;
  estado: number; // 0 = Anulada, 1 = Activa, 2 = Pendiente de aprobación
}

export interface VentaDetalle {
  id?: number;
  venta_id: number;
  producto_id: number;
  precio: number;
  comision: number;
  cantidad: number;
  sub_total: number;
  producto_nombre?: string;
  producto_precio?: number;
}

export interface VentaUsuario {
  id?: number;
  usuario_id: number;
  venta_id: number;
  nick?: string;
  usuario_nombre?: string;
} 

export interface VentaWithDetails extends Venta {
  detalles: VentaDetalle[];
  usuarios: VentaUsuario[];
  cliente_nombre?: string;
  habitacion_numero?: string;
  usuarios_nombres?: string[];
  garzon_nombre?: string | null;
  garzon_nick?: string | null;
}

export interface VentaCreate {
  cliente_id: number;
  pedido_id?: number | null;
  habitacion_id?: number;
  metodo_pago: 'efectivo' | 'tarjeta' | 'transferencia';
  propina: number;
  sub_total: number;
  total: number;
  detalles: VentaDetalleCreate[];
  usuarios?: number[]; // Array de IDs de usuarios
}

export interface VentaDetalleCreate {
  producto_id: number;
  precio: number;
  comision: number;
  cantidad: number;
  sub_total: number;
}

export interface VentaUpdate {
  estado?: string;
  fecha_mod?: string;
}

export interface VentaResumen {
  total_ventas: number;
  total_efectivo: number;
  total_tarjeta: number;
  total_transferencia: number;
  total_propinas: number;
  total_comisiones: number;
  ventas_hoy: number;
  ventas_mes: number;
  promedio_venta: number;
  caja_abierta_desde?: string | null;
}

export interface VentaFiltros {
  fecha_inicio?: string;
  fecha_fin?: string;
  estado?: string;
  metodo_pago?: string;
  usuario_id?: number;
  cliente_id?: number;
} 