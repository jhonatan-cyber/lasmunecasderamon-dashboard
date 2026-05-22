export interface Venta {
  id: string | number;
  codigo: string;
  cliente_id: string | number | null;
  pedido_id?: string | number | null;
  habitacion_id: string | number;
  metodo_pago: 'efectivo' | 'tarjeta' | 'transferencia' | 'prepago';
  propina: number;
  sub_total: number;
  total: number;
  fecha_crea: string;
  fecha_mod?: string;
  estado: number; // 0 = Anulada, 1 = Completada/Finalizada, 2 = En proceso (con temporizador)
  tiempo?: number; // Tiempo de habitación en minutos
  anfitrionas_nicks?: string | null;
}

export interface VentaDetalle {
  id?: string | number;
  venta_id: string | number;
  producto_id: string | number;
  precio: number;
  comision: number;
  cantidad: number;
  sub_total: number;
  producto_nombre?: string;
  producto_precio?: number;
}

export interface VentaUsuario {
  id?: string | number;
  usuario_id: string | number;
  venta_id: string | number;
  nick?: string;
  usuario_nombre?: string;
}

export interface VentaWithDetails extends Venta {
  detalles: VentaDetalle[];
  usuarios: VentaUsuario[];
  cliente_nombre?: string;
  habitacion_numero?: string;
  habitacion_nombre?: string;
  usuarios_nombres?: string[];
  cajero_nombre?: string | null;
  cajero_apellido?: string | null;
  cajero_nick?: string | null;
  garzon_nombre?: string | null;
  garzon_nick?: string | null;
}

export interface VentaCreate {
  cliente_id?: string | number | null;
  pedido_id?: string | number | null;
  habitacion_id?: string | number;
  metodo_pago: 'efectivo' | 'tarjeta' | 'transferencia' | 'prepago';
  propina: number;
  sub_total: number;
  total: number;
  detalles: VentaDetalleCreate[];
  usuarios?: Array<string | number>; // Array de IDs de usuarios
  tiempo?: number; // Tiempo de habitación en minutos
}

export interface VentaDetalleCreate {
  producto_id: string | number;
  precio: number;
  comision: number;
  cantidad: number;
  sub_total: number;
  hostess_id?: string | number | null;
  hostesses?: Array<string | number>;
  isChampagne?: boolean;
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
  usuario_id?: string;
  cliente_id?: string;
}
